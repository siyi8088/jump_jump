export type InputCallback = (type: 'start' | 'end') => void;

/**
 * Handles touch / mouse input for charge-and-release mechanic.
 */
export class InputHandler {
  private callback: InputCallback;
  private element: HTMLElement;
  private isPressed = false;
  private enabled = true;

  constructor(element: HTMLElement, callback: InputCallback) {
    this.element = element;
    this.callback = callback;

    // Touch
    element.addEventListener('touchstart', this.onStart, { passive: false });
    element.addEventListener('touchend', this.onEnd, { passive: false });
    element.addEventListener('touchcancel', this.onEnd, { passive: false });

    // Mouse (desktop fallback)
    element.addEventListener('mousedown', this.onStart);
    element.addEventListener('mouseup', this.onEnd);
    element.addEventListener('mouseleave', this.onEnd);

    // Prevent context menu on long press
    element.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private onStart = (e: Event): void => {
    e.preventDefault();
    if (!this.enabled || this.isPressed) return;
    this.isPressed = true;
    this.callback('start');
  };

  private onEnd = (e: Event): void => {
    e.preventDefault();
    if (!this.enabled || !this.isPressed) return;
    this.isPressed = false;
    this.callback('end');
  };

  public dispose(): void {
    this.element.removeEventListener('touchstart', this.onStart);
    this.element.removeEventListener('touchend', this.onEnd);
    this.element.removeEventListener('touchcancel', this.onEnd);
    this.element.removeEventListener('mousedown', this.onStart);
    this.element.removeEventListener('mouseup', this.onEnd);
    this.element.removeEventListener('mouseleave', this.onEnd);
  }
}
