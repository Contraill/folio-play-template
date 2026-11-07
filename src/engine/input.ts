/* Keyboard, touch, mouse and gamepad, folded into the same few actions. A game asks for `axis()` (-1 to 1 on each
   axis), `target()` (where a finger or the mouse is held, 0 to 1 across the canvas, or null) and `took(action)`, which
   is true once per press. */
export type Action = 'left' | 'right' | 'up' | 'down' | 'primary' | 'pause';

const KEYS: Record<string, Action> = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'primary', Enter: 'primary', KeyP: 'pause', Escape: 'pause',
};
export const keyAction = (code: string): Action | null => KEYS[code] ?? null;

/** Stick values below `zone` read as zero; above it they are rescaled to start from zero. */
export const deadzone = (v: number, zone = 0.2) => (Math.abs(v) < zone ? 0 : Math.sign(v) * (Math.abs(v) - zone) / (1 - zone));

export type Input = { axis(): { x: number; y: number }; target(): { x: number; y: number } | null; took(action: Action): boolean; dispose(): void };

export function createInput(surface: HTMLElement): Input {
  const held = new Set<Action>();
  const pressed = new Set<Action>();
  let pointer: { id: number; x: number; y: number } | null = null;
  let padPrimary = false, padPause = false;

  const onKey = (e: KeyboardEvent, down: boolean) => {
    const action = keyAction(e.code);
    if (!action) return;
    e.preventDefault();
    if (down && !held.has(action)) pressed.add(action);
    if (down) held.add(action); else held.delete(action);
  };
  const keydown = (e: KeyboardEvent) => onKey(e, true);
  const keyup = (e: KeyboardEvent) => onKey(e, false);
  const place = (e: PointerEvent) => {
    const box = surface.getBoundingClientRect();
    return { x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height };
  };
  const down = (e: PointerEvent) => {
    surface.setPointerCapture(e.pointerId);
    pointer = { id: e.pointerId, ...place(e) };
    pressed.add('primary');
  };
  const move = (e: PointerEvent) => { if (pointer?.id === e.pointerId) pointer = { id: e.pointerId, ...place(e) }; };
  const up = (e: PointerEvent) => { if (pointer?.id === e.pointerId) pointer = null; };
  const blur = () => { held.clear(); pointer = null; };

  addEventListener('keydown', keydown);
  addEventListener('keyup', keyup);
  addEventListener('blur', blur);
  surface.addEventListener('pointerdown', down);
  surface.addEventListener('pointermove', move);
  surface.addEventListener('pointerup', up);
  surface.addEventListener('pointercancel', up);

  const pad = () => [...(navigator.getGamepads?.() ?? [])].find((p) => p?.connected) ?? null;

  return {
    axis() {
      const g = pad();
      const x = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0) || deadzone(g?.axes[0] ?? 0) || (g ? (g.buttons[15]?.pressed ? 1 : 0) - (g.buttons[14]?.pressed ? 1 : 0) : 0);
      const y = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0) || deadzone(g?.axes[1] ?? 0);
      return { x, y };
    },
    target: () => (pointer ? { x: pointer.x, y: pointer.y } : null),
    took(action) {
      const g = pad();
      if (g) {
        const a = !!g.buttons[0]?.pressed, start = !!g.buttons[9]?.pressed;
        if (a && !padPrimary) pressed.add('primary');
        if (start && !padPause) pressed.add('pause');
        padPrimary = a; padPause = start;
      }
      return pressed.delete(action);
    },
    dispose() {
      removeEventListener('keydown', keydown); removeEventListener('keyup', keyup); removeEventListener('blur', blur);
      surface.removeEventListener('pointerdown', down); surface.removeEventListener('pointermove', move);
      surface.removeEventListener('pointerup', up); surface.removeEventListener('pointercancel', up);
    },
  };
}
