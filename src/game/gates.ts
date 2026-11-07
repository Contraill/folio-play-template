/* Gates, the pilot game: walls with a gap fall towards you; steer through the gaps. Each gate passed scores a point,
   and the walls get faster and the gaps narrower. The rules are plain functions of the state, so they are tested
   without a browser; drawing is separate (render). The playfield is 1 unit wide and `aspect` units tall. */
import type { Palette } from '../engine/folio.ts';

export type Gate = { y: number; gap: number; width: number; passed: boolean };
export type State = { phase: 'ready' | 'playing' | 'over'; aspect: number; x: number; gates: Gate[]; speed: number; score: number; best: number; time: number; next: number };
export type Controls = { axis: number; target: number | null; primary: boolean };

export const PLAYER = { y: 0.86, r: 0.022, speed: 1.15 };
const WALL = 0.03;

export function create(best = 0, aspect = 0.625): State {
  return { phase: 'ready', aspect, x: 0.5, gates: [], speed: 0.28, score: 0, best, time: 0, next: 0 };
}

export function step(s: State, c: Controls, dt: number, random: () => number): State {
  if (s.phase !== 'playing') {
    if (c.primary) return { ...create(s.best, s.aspect), phase: 'playing' };
    return s;
  }
  const playerY = PLAYER.y * s.aspect;
  // A held finger or mouse steers towards itself; keys and sticks steer directly.
  const pull = c.target === null ? c.axis : Math.max(-1, Math.min(1, (c.target - s.x) * 12));
  const x = Math.max(PLAYER.r, Math.min(1 - PLAYER.r, s.x + pull * PLAYER.speed * dt));
  const speed = 0.28 + s.time * 0.012;
  let { next, score } = s;
  const gates: Gate[] = [];
  for (const g of s.gates) {
    const y = g.y + speed * dt;
    const passed = g.passed || y - WALL / 2 > playerY + PLAYER.r;
    if (passed && !g.passed) score++;
    if (y < s.aspect + WALL) gates.push({ ...g, y, passed });
  }
  next -= dt;
  if (next <= 0) {
    const width = Math.max(0.16, 0.34 - s.time * 0.004);
    gates.push({ y: -WALL, gap: 0.04 + random() * (0.92 - width), width, passed: false });
    next = Math.max(0.75, 1.6 - s.time * 0.015);
  }
  const hit = gates.some((g) => !g.passed && Math.abs(g.y - playerY) < WALL / 2 + PLAYER.r && (x - PLAYER.r < g.gap || x + PLAYER.r > g.gap + g.width));
  const state: State = { ...s, x, gates, speed, score, time: s.time + dt, next };
  return hit ? { ...state, phase: 'over', best: Math.max(s.best, score) } : state;
}

export type Text = { start: string; again: string; paused: string; over: string; score: string; best: string };

export function render(ctx: CanvasRenderingContext2D, s: State, w: number, h: number, p: Palette, t: Text, paused: boolean) {
  const k = w; // one playfield unit in pixels
  const top = (h - s.aspect * k) / 2;
  ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(0, top);
  ctx.fillStyle = p.surface; ctx.fillRect(0, 0, w, s.aspect * k);
  for (const g of s.gates) {
    ctx.fillStyle = g.passed ? p.mute : p.ink;
    const y = (g.y - WALL / 2) * k, hgt = WALL * k;
    ctx.fillRect(0, y, g.gap * k, hgt);
    ctx.fillRect((g.gap + g.width) * k, y, w - (g.gap + g.width) * k, hgt);
  }
  ctx.fillStyle = s.phase === 'over' ? p.danger : p.signal;
  ctx.beginPath(); ctx.arc(s.x * k, PLAYER.y * s.aspect * k, PLAYER.r * k, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Text is outlined in the field's colour so it stays readable over a wall.
  const label = (text: string, x: number, y: number, colour: string) => {
    ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = p.surface; ctx.strokeText(text, x, y);
    ctx.fillStyle = colour; ctx.fillText(text, x, y);
  };
  ctx.textBaseline = 'top';
  ctx.font = `600 ${Math.round(Math.max(14, w * 0.022))}px system-ui, sans-serif`;
  ctx.textAlign = 'left'; label(`${t.score} ${s.score}`, 16, top + 14, p.ink);
  ctx.textAlign = 'right'; label(`${t.best} ${s.best}`, w - 16, top + 14, p.mute);
  const message = paused ? t.paused : s.phase === 'ready' ? t.start : s.phase === 'over' ? `${t.over} · ${t.again}` : '';
  if (message) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(Math.max(16, w * 0.03))}px system-ui, sans-serif`;
    label(message, w / 2, h / 2, p.ink);
  }
}
