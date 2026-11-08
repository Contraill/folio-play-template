import assert from 'node:assert/strict';
import { test } from 'node:test';
import { folioContext, PALETTES } from '../src/engine/folio.ts';
import { deadzone, keyAction } from '../src/engine/input.ts';
import { advance } from '../src/engine/loop.ts';
import { rng } from '../src/engine/rng.ts';

test('the loop runs whole fixed steps and carries the rest to the next frame', () => {
  assert.deepEqual(advance(0, 16.7, 1000 / 60), { steps: 1, carry: 16.7 - 1000 / 60 });
  assert.equal(advance(0, 8, 1000 / 60).steps, 0, 'a 120 Hz frame runs no step half the time');
  assert.equal(advance(8, 8, 1000 / 60).steps, 0);
  assert.equal(advance(16, 8, 1000 / 60).steps, 1);
  assert.deepEqual(advance(0, 5000, 1000 / 60), { steps: 5, carry: 0 }, 'a long stall is cut, not fast-forwarded');
});

test('keys, sticks and the same seed behave the same every time', () => {
  assert.equal(keyAction('ArrowLeft'), 'left');
  assert.equal(keyAction('KeyD'), 'right');
  assert.equal(keyAction('Space'), 'primary');
  assert.equal(keyAction('Escape'), 'pause');
  assert.equal(keyAction('KeyQ'), null);
  assert.equal(deadzone(0.1), 0);
  assert.equal(deadzone(1), 1);
  assert.ok(Math.abs(deadzone(-0.6) + 0.5) < 1e-9, 'rescaled from the edge of the zone');
  const a = rng(42), b = rng(42);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test('framed by Folio, the game takes the visitor language and skin; alone, the browser and the system decide', () => {
  assert.deepEqual(folioContext('?folio=1&lang=tr&skin=terminal', false, 'en-US'), { embedded: true, lang: 'tr', palette: PALETTES.terminal });
  assert.deepEqual(folioContext('', true, 'tr-TR'), { embedded: false, lang: 'tr', palette: PALETTES.graphite });
  assert.deepEqual(folioContext('?skin=unknown&lang=xx', false, 'en'), { embedded: false, lang: 'en', palette: PALETTES.paper });
});

test('storage is named after the app\'s place in Folio, so two apps on the site never share it', async () => {
  const { namespace } = await import('../src/engine/folio.ts');
  assert.equal(namespace('/play/gates/app/'), 'play:gates:');
  assert.equal(namespace('/lab/two-spirals/app/index.html'), 'lab:two-spirals:');
  assert.equal(namespace('/'), '', 'opened anywhere else (vite dev): no prefix');
  assert.equal(namespace('/play/Gates/app/'), '');
});
