// Keyboard and mouse input, with a small queue of pressed keys so the game
// can react to single taps (enter car, shoot, pause) as well as held keys.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.mouseClicked = false;
    this.canvas = canvas;
    this.onKey = null;
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
      if (this.onKey) this.onKey(event.code);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = event.clientX - rect.left;
      this.mouseY = event.clientY - rect.top;
    });
    canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) {
        this.mouseDown = true;
        this.mouseClicked = true;
      }
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.mouseDown = false;
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });
  }

  down(...codes) {
    return codes.some((code) => this.keys.has(code));
  }

  // True once per physical key press; consumed at the end of each frame.
  hit(...codes) {
    return codes.some((code) => this.pressed.has(code));
  }

  // Synthetic input used by the ?autotest= harness and the screenshot pilot.
  inject(code, isDown) {
    if (isDown) {
      this.keys.add(code);
      this.pressed.add(code);
    } else {
      this.keys.delete(code);
    }
  }

  endFrame() {
    this.pressed.clear();
    this.mouseClicked = false;
  }
}
