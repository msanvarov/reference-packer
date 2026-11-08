// Illustrated sample panels (one stylised character, six views) so the demo
// works without uploads. Drawn on canvas with the same light for every view.

const SIZE = 900;
const SKIN = '#c99a7a';
const HAIR = '#1d1a1a';
const JACKET = '#5d6b4a';
const BG = '#ececee';

function panel(draw) {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const x = c.getContext('2d');
  x.fillStyle = BG;
  x.fillRect(0, 0, SIZE, SIZE);
  // soft key light from the upper left, identical on every panel
  const g = x.createRadialGradient(SIZE * 0.3, SIZE * 0.2, 40, SIZE * 0.3, SIZE * 0.2, SIZE * 0.9);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, SIZE, SIZE);
  draw(x);
  return c.toDataURL('image/png');
}

function body(x, { cx = 450, shoulder = 250, turn = 0 } = {}) {
  x.fillStyle = JACKET;
  x.beginPath();
  x.moveTo(cx - shoulder, SIZE);
  x.bezierCurveTo(cx - shoulder, 640, cx - 120 + turn, 560, cx + turn * 0.3, 560);
  x.bezierCurveTo(cx + 120 + turn, 560, cx + shoulder, 640, cx + shoulder, SIZE);
  x.closePath();
  x.fill();
  // collar shadow
  x.fillStyle = 'rgba(0,0,0,0.18)';
  x.beginPath();
  x.moveTo(cx - 60 + turn * 0.3, 562);
  x.lineTo(cx + turn * 0.3, 650);
  x.lineTo(cx + 60 + turn * 0.3, 562);
  x.fill();
}

function head(x, { cx = 450, cy = 400, rx = 120, ry = 145, face = true, eyesShift = 0, back = false } = {}) {
  x.fillStyle = SKIN;
  x.fillRect(cx - 45, cy + 100, 90, 90); // neck
  x.beginPath();
  x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  x.fill();
  // short bob
  x.fillStyle = HAIR;
  x.beginPath();
  if (back) {
    x.ellipse(cx, cy - 10, rx + 18, ry + 10, 0, 0, Math.PI * 2);
  } else {
    x.ellipse(cx, cy - 55, rx + 16, ry - 50, 0, Math.PI, Math.PI * 2);
    x.rect(cx - rx - 16, cy - 55, 34, 150);
    x.rect(cx + rx - 18, cy - 55, 34, 150);
  }
  x.fill();
  if (face && !back) {
    x.fillStyle = '#2a2220';
    x.beginPath();
    x.arc(cx - 42 + eyesShift, cy + 10, 9, 0, Math.PI * 2);
    x.arc(cx + 42 + eyesShift, cy + 10, 9, 0, Math.PI * 2);
    x.fill();
    // silver hoop earrings
    x.strokeStyle = '#c9ccd3';
    x.lineWidth = 6;
    x.beginPath();
    x.arc(cx - rx + 4, cy + 70, 16, 0, Math.PI * 2);
    x.stroke();
  }
}

export function samplePanels() {
  return [
    // front
    panel((x) => { body(x); head(x); }),
    // three-quarter
    panel((x) => { body(x, { turn: 40 }); head(x, { cx: 470, rx: 110, eyesShift: 30 }); }),
    // profile
    panel((x) => {
      body(x, { shoulder: 150, turn: 60 });
      head(x, { cx: 470, rx: 95, face: false });
      x.fillStyle = SKIN;
      x.beginPath();
      x.moveTo(560, 400); x.lineTo(595, 440); x.lineTo(560, 455); x.fill(); // nose
    }),
    // back
    panel((x) => { body(x); head(x, { back: true }); }),
    // face close-up
    panel((x) => {
      x.save(); x.translate(-450, -380); x.scale(2, 2);
      head(x, { cx: 450, cy: 400 });
      x.restore();
    }),
    // jacket detail with logo patch (same backdrop as the other panels)
    panel((x) => {
      x.fillStyle = JACKET;
      x.beginPath();
      x.roundRect(150, 120, 600, 660, 60);
      x.fill();
      x.fillStyle = 'rgba(0,0,0,0.15)';
      x.fillRect(440, 120, 20, 660); // zip line
      x.fillStyle = '#ffb648';
      x.beginPath();
      x.roundRect(540, 300, 130, 130, 24);
      x.fill();
    }),
  ];
}
