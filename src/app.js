import { MODELS, buildPrompt, layoutSheet, lintSheet, slotNote } from './sheet.js';
import { samplePanels } from './samples.js';

const $ = (id) => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d');

/** @type {{ id: number, name: string, img: HTMLImageElement, w: number, h: number, lum: number, src: string }[]} */
let panels = [];
let nextId = 1;

// Mean luminance (0–1) from a tiny downscale: enough to spot mismatched light.
function meanLuminance(img) {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, 32, 32);
  const d = x.getImageData(0, 0, 32, 32).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) {
    sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  }
  return sum / (d.length / 4) / 255;
}

function loadImage(src, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ id: nextId++, name, img, w: img.naturalWidth, h: img.naturalHeight, lum: meanLuminance(img), src });
    img.onerror = () => reject(new Error(`Could not read ${name}`));
    img.src = src;
  });
}

async function addFiles(files) {
  const images = [...files].filter((f) => f.type.startsWith('image/'));
  const loaded = await Promise.allSettled(
    images.map((f) => loadImage(URL.createObjectURL(f), f.name))
  );
  panels.push(...loaded.filter((r) => r.status === 'fulfilled').map((r) => r.value));
  render();
}

function settings() {
  return {
    cols: Number($('cols').value),
    cell: Number($('cell').value),
    gap: Number($('gap').value),
    bg: $('bg').value,
  };
}

function renderThumbs() {
  const list = $('thumbs');
  list.replaceChildren(
    ...panels.map((p, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<img alt="" /><span class="n">${i + 1}</span><div class="ctrl">
        <button type="button" data-act="left" aria-label="Move panel ${i + 1} earlier" ${i === 0 ? 'disabled' : ''}>←</button>
        <button type="button" data-act="remove" aria-label="Remove panel ${i + 1}">✕</button>
        <button type="button" data-act="right" aria-label="Move panel ${i + 1} later" ${i === panels.length - 1 ? 'disabled' : ''}>→</button></div>`;
      li.querySelector('img').src = p.src;
      li.querySelector('img').alt = p.name;
      li.dataset.id = String(p.id);
      return li;
    })
  );
}

function renderSheet() {
  const s = settings();
  const sheet = layoutSheet(panels, s);
  canvas.width = sheet.width;
  canvas.height = sheet.height;
  $('empty').hidden = panels.length > 0;
  $('download').disabled = panels.length === 0;
  $('size').textContent = panels.length ? `${sheet.width} × ${sheet.height} px` : '';
  if (!panels.length) return sheet;
  ctx.fillStyle = s.bg;
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  ctx.imageSmoothingQuality = 'high';
  sheet.rects.forEach((r, i) => ctx.drawImage(panels[i].img, r.x, r.y, r.w, r.h));
  return sheet;
}

function renderLint(sheet) {
  const slots = slotNote($('model').value);
  const items = panels.length ? [...lintSheet(panels, sheet), ...(slots ? [slots] : [])] : [];
  $('lint').replaceChildren(
    ...items.map((r) => {
      const li = document.createElement('li');
      li.className = r.level;
      li.textContent = r.text;
      return li;
    })
  );
}

function renderPrompt() {
  $('prompt').textContent = buildPrompt({
    model: $('model').value,
    subject: $('subject').value,
    description: $('description').value || $('description').placeholder,
    anchors: $('anchors').value || $('anchors').placeholder,
    action: $('action').value || $('action').placeholder,
    camera: $('camera').value || $('camera').placeholder,
    light: $('light').value || $('light').placeholder,
    seconds: Number($('seconds').value),
  });
}

function render() {
  renderThumbs();
  renderLint(renderSheet());
}

// ---- events ---------------------------------------------------------------
$('file').addEventListener('change', (e) => {
  addFiles(e.target.files);
  e.target.value = '';
});

const drop = $('drop');
['dragenter', 'dragover'].forEach((t) =>
  drop.addEventListener(t, (e) => {
    e.preventDefault();
    drop.classList.add('over');
  })
);
['dragleave', 'drop'].forEach((t) =>
  drop.addEventListener(t, () => drop.classList.remove('over'))
);
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  addFiles(e.dataTransfer.files);
});

$('thumbs').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = Number(btn.closest('li').dataset.id);
  const i = panels.findIndex((p) => p.id === id);
  const act = btn.dataset.act;
  if (act === 'remove') panels.splice(i, 1);
  if (act === 'left' && i > 0) [panels[i - 1], panels[i]] = [panels[i], panels[i - 1]];
  if (act === 'right' && i < panels.length - 1) [panels[i + 1], panels[i]] = [panels[i], panels[i + 1]];
  render();
});

['cols', 'cell', 'gap', 'bg'].forEach((id) => $(id).addEventListener('input', render));

const swatches = document.querySelectorAll('.swatches button');
// Colours set from JS: the CSP disallows inline style attributes.
swatches.forEach((b) => b.style.setProperty('--c', b.dataset.bg));
const syncSwatches = () =>
  swatches.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bg === $('bg').value)));
swatches.forEach((b) =>
  b.addEventListener('click', () => {
    $('bg').value = b.dataset.bg;
    syncSwatches();
    render();
  })
);
$('bg').addEventListener('input', syncSwatches);

$('sample').addEventListener('click', async () => {
  const urls = samplePanels();
  const loaded = await Promise.all(urls.map((u, i) => loadImage(u, `sample-${i + 1}.png`)));
  panels = loaded;
  render();
});

$('download').addEventListener('click', () => {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'reference-sheet.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, 'image/png');
});

// Model picker: its note, allowed lengths, and whether anchors are restated.
function applyModel() {
  const m = MODELS[$('model').value];
  const prev = Number($('seconds').value) || 6;
  const pick = m.durations.reduce((a, b) => (Math.abs(b - prev) <= Math.abs(a - prev) ? b : a));
  $('seconds').replaceChildren(
    ...m.durations.map((d) => new Option(`${d} s`, String(d), d === pick, d === pick))
  );
  $('modelNote').textContent = m.note;
  $('anchors').disabled = !m.anchors;
  $('anchors').title = m.anchors ? '' : `${m.name}: the look comes from the reference, so describe only the action.`;
  renderPrompt();
  render();
}
$('model').addEventListener('change', applyModel);

['subject', 'description', 'anchors', 'action', 'camera', 'light', 'seconds'].forEach((id) =>
  $(id).addEventListener('input', renderPrompt)
);
$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('prompt').textContent);
    $('copy').textContent = 'Copied';
  } catch {
    $('copy').textContent = 'Select the text to copy';
  }
  setTimeout(() => ($('copy').textContent = 'Copy prompt'), 1600);
});

syncSwatches();
applyModel();
