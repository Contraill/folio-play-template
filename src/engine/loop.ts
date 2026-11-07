/* A fixed-step game loop: the game advances in equal steps (default 1/60 s) whatever the display's frame rate, so it
   plays the same on a 60 Hz phone and a 144 Hz monitor, and renders once per frame. A long stall (a background tab,
   a breakpoint) is cut to `maxSteps` instead of fast-forwarding the game. */

/** How many fixed steps a frame of `frameMs` runs, and the time left over for the next frame. */
export function advance(carry: number, frameMs: number, stepMs: number, maxSteps = 5): { steps: number; carry: number } {
  const total = carry + Math.max(0, frameMs);
  const steps = Math.min(maxSteps, Math.floor(total / stepMs));
  return { steps, carry: steps === maxSteps ? 0 : total - steps * stepMs };
}

export type Loop = { start(): void; stop(): void; readonly running: boolean };

export function createLoop(step: (dt: number) => void, render: () => void, hz = 60): Loop {
  const stepMs = 1000 / hz;
  let raf = 0, last = 0, carry = 0, running = false;
  const frame = (now: number) => {
    const { steps, carry: rest } = advance(carry, last ? now - last : stepMs, stepMs);
    last = now; carry = rest;
    for (let i = 0; i < steps; i++) step(stepMs / 1000);
    render();
    raf = requestAnimationFrame(frame);
  };
  return {
    start() { if (running) return; running = true; last = 0; carry = 0; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    get running() { return running; },
  };
}
