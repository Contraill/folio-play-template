import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rng } from '../src/engine/rng.ts';
import { create, PLAYER, step, type State } from '../src/game/gates.ts';

const idle = { axis: 0, target: null, primary: false };
const run = (s: State, seconds: number, steer: (s: State) => number, seed = 1) => {
  const random = rng(seed);
  for (let i = 0; i < seconds * 60 && s.phase === 'playing'; i++) s = step(s, { ...idle, axis: steer(s) }, 1 / 60, random);
  return s;
};
const playing = () => step(create(7), { ...idle, primary: true }, 1 / 60, rng(1));

test('a round starts with a press and keeps the best score', () => {
  assert.equal(create().phase, 'ready');
  assert.equal(step(create(), idle, 1 / 60, rng(1)).phase, 'ready');
  const s = playing();
  assert.equal(s.phase, 'playing');
  assert.equal(s.best, 7);
});

test('steering through every gap scores a point per gate', () => {
  // Aim for the middle of the nearest gate that is still ahead.
  const pilot = (s: State) => {
    const g = s.gates.find((gate) => !gate.passed);
    return g ? Math.sign(g.gap + g.width / 2 - s.x) : 0;
  };
  const s = run(playing(), 20, pilot);
  assert.equal(s.phase, 'playing', 'a careful pilot survives');
  assert.ok(s.score >= 8, `scored ${s.score}`);
});

test('touching a wall ends the round and records the best', () => {
  const s = run({ ...playing(), best: 0 }, 30, () => 0, 3);
  assert.equal(s.phase, 'over', 'standing still meets a wall');
  assert.equal(s.best, s.score);
  assert.equal(step(s, { ...idle, primary: true }, 1 / 60, rng(1)).score, 0, 'a press starts again');
});

test('the player stays inside the field, and a held finger steers towards itself', () => {
  let s = playing();
  for (let i = 0; i < 120; i++) s = step(s, { ...idle, axis: -1 }, 1 / 60, rng(1));
  assert.equal(s.x, PLAYER.r);
  const pulled = step({ ...playing(), x: 0.2, gates: [] }, { ...idle, target: 0.8 }, 1 / 60, rng(1));
  assert.ok(pulled.x > 0.2);
});
