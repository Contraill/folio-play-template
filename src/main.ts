import { folioContext } from './engine/folio.ts';
import { createInput } from './engine/input.ts';
import { createLoop } from './engine/loop.ts';
import { rng } from './engine/rng.ts';
import { canFullscreen, fitCanvas, toggleFullscreen } from './engine/screen.ts';
import { load, save } from './engine/storage.ts';
import { create, render, step, type Text } from './game/gates.ts';
import './styles.css';

const TEXT: Record<'en' | 'tr', Text & { label: string; fullscreen: string; scored: string }> = {
  en: { start: 'Space, Enter or a press to start', again: 'again?', paused: 'Paused', over: 'Out', score: 'Score', best: 'Best', label: 'Gates: steer through the gaps in the falling walls', fullscreen: 'Full screen', scored: 'Score {s}. Best {b}.' },
  tr: { start: 'Başlamak için Boşluk, Enter ya da bir dokunuş', again: 'yine?', paused: 'Duraklatıldı', over: 'Bitti', score: 'Skor', best: 'En iyi', label: 'Kapılar: düşen duvarlardaki boşluklardan geç', fullscreen: 'Tam ekran', scored: 'Skor {s}. En iyi {b}.' },
};

const { lang, palette, embedded } = folioContext();
const t = TEXT[lang];
document.documentElement.lang = lang;
document.documentElement.style.setProperty('--bg', palette.bg);
document.documentElement.style.setProperty('--ink', palette.ink);
document.body.classList.toggle('embedded', embedded);

const shell = document.querySelector<HTMLElement>('#game')!;
const canvas = shell.querySelector('canvas')!;
const status = shell.querySelector<HTMLElement>('[role="status"]')!;
const full = shell.querySelector<HTMLButtonElement>('.full')!;
canvas.setAttribute('aria-label', t.label);
full.textContent = t.fullscreen;
full.hidden = !canFullscreen();
full.addEventListener('click', () => toggleFullscreen(shell));

const ctx = canvas.getContext('2d')!;
const input = createInput(canvas);
const random = rng(Date.now());
let size = { w: 1, h: 1 };
let state = create(load('gates-best', 0), 0.625);
let paused = false;
fitCanvas(canvas, (w, h) => { size = { w, h }; state = { ...state, aspect: Math.min(h / w, 1.6) }; });

const loop = createLoop((dt) => {
  if (input.took('pause') && state.phase === 'playing') paused = !paused;
  if (paused) { if (input.took('primary')) paused = false; return; }
  const was = state.phase;
  const target = input.target();
  state = step(state, { axis: input.axis().x, target: target && target.x, primary: input.took('primary') }, dt, random);
  if (state.phase === 'over' && was === 'playing') {
    save('gates-best', state.best);
    status.textContent = t.scored.replace('{s}', String(state.score)).replace('{b}', String(state.best));
  }
}, () => render(ctx, state, size.w, size.h, palette, t, paused));

// A hidden tab or a lost focus pauses the round instead of losing it.
const hold = () => { if (state.phase === 'playing') paused = true; };
addEventListener('blur', hold);
document.addEventListener('visibilitychange', () => (document.hidden ? (hold(), loop.stop()) : loop.start()));
loop.start();
// Framed, Folio focuses the frame itself: a sandboxed frame may not take focus on its own.
if (!embedded) canvas.focus();
