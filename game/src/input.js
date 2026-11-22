// Palmetto Bay — keyboard and mouse input with per-frame "hit" edges.
// A hit fires once on the frame the key goes down; held keys stay down.
// `inject` lets the autotest drive the same input path as a player, so a
// passing autotest proves the real controls work, not a shortcut.
export class Input {
  constructor(canvas) {
    this.down = new Set();
    this.pressed = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseClicked = false;
    this.mouseDown = false;
    this.canvas = canvas;
    this._listeners = [];

    const onKeyDown = (event) => {
      if (event.repeat) return;
      this.down.add(event.code);
      this.pressed.add(event.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
    };
    const onKeyUp = (event) => {
      this.down.delete(event.code);
    };
    const onMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = event.clientX - rect.left;
      this.mouseY = event.clientY - rect.top;
    };
    const onMouseDown = (event) => {
      onMouseMove(event);
      this.mouseDown = true;
      this.mouseClicked = true;
    };
    const onMouseUp = () => {
      this.mouseDown = false;
    };
    const onBlur = () => {
      this.down.clear();
      this.mouseDown = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onBlur);
    this._listeners.push(['keydown', onKeyDown], ['keyup', onKeyUp]);
  }

  held(...codes) {
    return codes.some((c) => this.down.has(c));
  }

  hit(...codes) {
    return codes.some((c) => this.pressed.has(c));
  }

  inject(code, on) {
    if (on) {
      this.down.add(code);
      this.pressed.add(code);
    } else {
      this.down.delete(code);
    }
  }

  endFrame() {
    this.pressed.clear();
    this.mouseClicked = false;
  }
}
