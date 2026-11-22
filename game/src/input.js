// Palmetto Bay — keyboard and mouse. One job: turn browser events into a
// plain state object the game loop reads. No game logic lives here.

export function createInput(canvas) {
  const input = {
    up: false, down: false, left: false, right: false, sprint: false,
    interact: false, pause: false, mute: false, confirm: false,
    mouseX: 0, mouseY: 0, mouseDown: false, mouseClicked: false,
  };

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'sprint', ShiftRight: 'sprint',
  };

  function onKeyDown(e) {
    const name = KEYMAP[e.code];
    if (name) { input[name] = true; e.preventDefault(); }
    if (e.code === 'KeyE' && !e.repeat) input.interact = true;
    if (e.code === 'Enter' && !e.repeat) input.confirm = true;
    if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) input.pause = true;
    if (e.code === 'KeyM' && !e.repeat) input.mute = true;
  }

  function onKeyUp(e) {
    const name = KEYMAP[e.code];
    if (name) input[name] = false;
  }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - rect.left;
    input.mouseY = e.clientY - rect.top;
  }

  function onMouseDown(e) {
    if (e.button === 0) {
      input.mouseDown = true;
      input.mouseClicked = true;
    }
  }

  function onMouseUp(e) {
    if (e.button === 0) input.mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  // One-frame edge triggers, consumed by the game loop each frame.
  input.consumeEdges = function consumeEdges() {
    const edges = { interact: input.interact, pause: input.pause, mute: input.mute, confirm: input.confirm, click: input.mouseClicked };
    input.interact = false;
    input.pause = false;
    input.mute = false;
    input.confirm = false;
    input.mouseClicked = false;
    return edges;
  };

  return input;
}
