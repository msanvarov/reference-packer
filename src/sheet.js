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

/**
 * Higgsfield video models that take reference images (not just a start frame).
 * Limits from Higgsfield's model pages and CLI docs, Nov 2026. `images: null`
 * means Higgsfield doesn't publish a count. `tags`: 'seedance' = role tags,
 * 'element' = @-tagged Elements, 'none' = plain-language reference.
 */
export const MODELS = {
  'seedance-2.0': {
    name: 'Seedance 2.0', images: 9, tags: 'seedance', anchors: true,
    durations: [4, 5, 6, 8, 10, 12, 15],
    note: 'Up to 9 images and 12 files in total. Tag the sheet as @character, @product or @style.',
  },
  'seedance-2.5': {
    name: 'Seedance 2.5', images: 30, tags: 'seedance', anchors: true,
    durations: [5, 6, 8, 10, 15, 20, 30],
    note: 'Up to 50 references (30 images) and clips up to 30 s. Tag the sheet as @character, @product or @style.',
  },
  'kling-4.0': {
    name: 'Kling 4.0', images: 10, tags: 'element', anchors: false,
    durations: [3, 5, 8, 10, 15, 20, 30],
    note: 'References mode: up to 10 images and 5 videos. Tag the sheet with @ and describe only the action; its look comes from the reference. Rename the tag to match the one Higgsfield shows.',
  },
  'kling-3.0': {
    name: 'Kling 3.0', images: null, tags: 'element', anchors: false,
    durations: [3, 5, 8, 10, 15],
    note: 'Save the sheet as an Element and tag it with @ in every shot it appears in. Describe only its action; its look comes from the Element.',
  },
  'wan-2.6': {
    name: 'Wan 2.6', images: null, tags: 'none', anchors: true,
    durations: [5, 10, 15],
    note: 'Upload the sheet as an image reference and describe it in plain language; no tags. 15 s isn’t available with a video reference.',
  },
  'veo-3.1': {
    name: 'Veo 3.1', images: 3, tags: 'none', anchors: true,
    durations: [4, 6, 8],
    note: 'Reference images need the Standard model, not Fast: up to 3. With only 3 slots, one sheet per subject matters most here.',
  },
  'gemini-omni': {
    name: 'Gemini Omni Flash', images: 6, tags: 'none', anchors: true,
    durations: [3, 5, 8, 10, 15],
    note: 'Up to 6 images, used for appearance only, next to a required start frame.',
  },
};

const ROLE_TAGS = { character: '@character', product: '@product', environment: '@style' };
const ELEMENT_TAGS = { character: '@Character', product: '@Product', environment: '@Location' };
const NOUNS = { character: 'person', product: 'product', environment: 'location' };

/** Image-slot budget for the chosen model, as one more lint line. */
export function slotNote(modelId) {
  const m = MODELS[modelId];
  if (!m || m.images == null) return null;
  return { level: 'ok', id: 'slots', text: `Uses 1 of ${m.images} image slots on ${m.name}, leaving ${m.images - 1} for other subjects or a style frame.` };
}

/** Prompt in the post's structure: say what the sheet is, then the shot. */
export function buildPrompt({ model = 'seedance-2.0', subject = 'character', description = '', anchors = '', action = '', camera = '', light = '', seconds = 6 } = {}) {
  const m = MODELS[model] ?? MODELS['seedance-2.0'];
  const noun = NOUNS[subject] ?? 'subject';
  const what = description.trim() || noun;
  const lines = [];
  if (m.tags === 'none') {
    lines.push(`The reference image is a sheet of ONE ${what} shown from several angles; it is one ${noun}, not several.`);
  } else {
    const tag = (m.tags === 'element' ? ELEMENT_TAGS : ROLE_TAGS)[subject] ?? '@character';
    lines.push(`${tag} is a reference sheet of ONE ${what} shown from several angles.`);
  }
  if (m.anchors && anchors.trim()) {
    const ref = m.tags === 'none' ? 'reference' : 'sheet';
    lines.push(`Keep ${anchors.trim().replace(/\.$/, '')} identical to the ${ref} in every frame.`);
  }
  const shot = [action.trim(), camera.trim(), light.trim()]
    .filter(Boolean)
    .map((s) => s.replace(/\.$/, ''))
    .join('. ');
  // Snap to the closest length the model offers.
  const secs = m.durations.reduce((a, b) => (Math.abs(b - seconds) <= Math.abs(a - seconds) ? b : a));
  lines.push('');
  lines.push(`${shot ? `${shot}. ` : ''}${secs} seconds.`);
  return lines.join('\n');
}
