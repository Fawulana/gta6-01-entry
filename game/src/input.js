// Keyboard + mouse input, with an action edge detector (pressedThisFrame).
// Keys: WASD/arrows drive & walk, Shift sprint, E enter/exit car, Space handbrake,
// F punch, T taxi fare, B buy, M mute, P/Esc pause, R reload save, 1/2 weapons.
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false, wx: 0, wy: 0 };
  const GAME_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE', 'KeyF', 'KeyT', 'KeyB', 'KeyM', 'KeyP', 'KeyR', 'KeyC', 'KeyG', 'Digit1', 'Digit2', 'ShiftLeft', 'ShiftRight', 'Enter', 'Escape'];
  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (!e.repeat) { keys.add(e.code); pressed.add(e.code); }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); pressed.clear(); });
  canvas.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { mouse.down = true; mouse.clicked = true; } });
  window.addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  return {
    keys, pressed, mouse,
    down: (code) => keys.has(code),
    hit: (code) => pressed.has(code),
    axis: () => ({
      x: (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0),
      y: (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0),
    }),
    sprint: () => keys.has('ShiftLeft') || keys.has('ShiftRight'),
    endFrame() { pressed.clear(); mouse.clicked = false; },
  };
}
