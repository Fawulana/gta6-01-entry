// Keyboard + mouse input. The game reads `keys` (a Set of event.code values)
// and `mouse` (canvas-relative position, button state). The autopilot in
// shots.js drives the same fields, so staged scenes play the real rules.
export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouse: { x: 0, y: 0, down: false, clicked: false, worldX: 0, worldY: 0 },
    pressed: new Set(), // codes pressed since last consume
  };
  const PREVENT = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab',
  ]);
  window.addEventListener('keydown', (e) => {
    if (PREVENT.has(e.code)) e.preventDefault();
    if (!e.repeat) input.pressed.add(e.code);
    input.keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => { input.keys.delete(e.code); });
  window.addEventListener('blur', () => { input.keys.clear(); });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = e.clientX - r.left;
    input.mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { input.mouse.down = true; input.mouse.clicked = true; }
  });
  window.addEventListener('mouseup', () => { input.mouse.down = false; });
  input.isDown = (code) => input.keys.has(code);
  input.wasPressed = (code) => input.pressed.has(code);
  input.consumePressed = () => { input.pressed.clear(); };
  input.consumeClick = () => { input.mouse.clicked = false; };
  return input;
}
