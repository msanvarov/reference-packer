// Pure layout, lint and prompt helpers — no DOM, so they run in Node tests.

/** Grid placement for N images: each fits inside a square cell, centred. */
export function layoutSheet(sizes, { cell = 1024, gap = 48, cols } = {}) {
  const n = sizes.length;
  if (n === 0) return { width: 0, height: 0, cols: 0, rows: 0, rects: [] };
  const c = cols && cols > 0 ? Math.min(cols, n) : Math.ceil(Math.sqrt(n));
  const r = Math.ceil(n / c);
  const width = c * cell + (c + 1) * gap;
  const height = r * cell + (r + 1) * gap;
  const rects = sizes.map(({ w, h }, i) => {
    const scale = Math.min(cell / w, cell / h, 1); // never upscale
    const dw = Math.round(w * scale);
    const dh = Math.round(h * scale);
    const row = Math.floor(i / c);
    const col = i % c;
    return {
      x: gap + col * (cell + gap) + Math.floor((cell - dw) / 2),
      y: gap + row * (cell + gap) + Math.floor((cell - dh) / 2),
      w: dw,
      h: dh,
    };
  });
  return { width, height, cols: c, rows: r, rects };
}

/**
 * Checks a sheet against the rules from the post. `images` carries each
 * input's size and mean luminance (0–1).
 */
export function lintSheet(images, sheet) {
  const results = [];
  const n = images.length;

  if (n < 2) {
    results.push({ level: 'warn', id: 'panels', text: 'Add at least two angles — one image is just a normal reference.' });
  } else if (n > 9) {
    results.push({ level: 'warn', id: 'panels', text: `${n} panels make each one small. Split into two sheets (e.g. body angles and close-ups).` });
  } else {
    results.push({ level: 'ok', id: 'panels', text: `${n} panels — a good range for one subject.` });
  }

  const longEdge = Math.max(sheet.width, sheet.height);
  if (n > 0 && longEdge < 2048) {
    results.push({ level: 'warn', id: 'resolution', text: `Sheet is ${longEdge}px on the long edge. Aim for 2048px+ so panels stay sharp after downscaling.` });
  } else if (n > 0) {
    results.push({ level: 'ok', id: 'resolution', text: `${sheet.width}×${sheet.height}px — enough headroom for detail.` });
  }

  const small = images.filter((im) => Math.min(im.w, im.h) < 512);
  if (small.length) {
    results.push({ level: 'warn', id: 'inputs', text: `${small.length} input${small.length > 1 ? 's are' : ' is'} under 512px on the short side — they will look soft next to the others.` });
  }

  if (n >= 2) {
    const lums = images.map((im) => im.lum);
    const spread = Math.max(...lums) - Math.min(...lums);
    if (spread > 0.18) {
      results.push({ level: 'warn', id: 'lighting', text: 'Brightness varies a lot between panels. Mismatched lighting is the fastest route to a face that changes between cuts.' });
    } else {
      results.push({ level: 'ok', id: 'lighting', text: 'Panels have similar overall brightness.' });
    }
  }

  return results;
}

const TAGS = { character: '@character', product: '@product', environment: '@style' };
const NOUNS = { character: 'person', product: 'product', environment: 'location' };

/** Seedance prompt in the post's structure: map the tag, then the shot. */
export function buildPrompt({ subject = 'character', description = '', anchors = '', action = '', camera = '', light = '', seconds = 6 } = {}) {
  const tag = TAGS[subject] ?? '@character';
  const noun = NOUNS[subject] ?? 'subject';
  const lines = [];
  lines.push(`${tag} is a reference sheet of ONE ${description.trim() || noun} shown from several angles.`);
  if (anchors.trim()) {
    lines.push(`Keep ${anchors.trim().replace(/\.$/, '')} identical to the sheet in every frame.`);
  }
  const shot = [action.trim(), camera.trim(), light.trim()]
    .filter(Boolean)
    .map((s) => s.replace(/\.$/, ''))
    .join('. ');
  lines.push('');
  lines.push(`${shot ? `${shot}. ` : ''}${seconds} seconds.`);
  return lines.join('\n');
}
