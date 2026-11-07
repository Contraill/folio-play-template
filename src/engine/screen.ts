/** Keeps the canvas as sharp as the display (device pixel ratio, capped) and the size of its container. */
export function fitCanvas(canvas: HTMLCanvasElement, onResize: (w: number, h: number) => void) {
  const fit = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    canvas.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
    onResize(width, height);
  };
  const observer = new ResizeObserver(fit);
  observer.observe(canvas);
  fit();
  return () => observer.disconnect();
}

/** Full screen for the whole game, where the browser allows it (not on iPhone). */
export const canFullscreen = () => !!document.fullscreenEnabled;
export const toggleFullscreen = (el: HTMLElement) => (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen());
