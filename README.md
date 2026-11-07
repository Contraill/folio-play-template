# Folio play template

A starting point for small browser games that show up on [Folio](https://oztozlu.dev/play) by themselves. No game engine: a fixed-step loop, one input layer for keyboard, touch, mouse and gamepad, a canvas sized for the display, and the glue Folio expects. The pilot game, **Gates**, uses all of it in about a hundred lines.

## Start a game

1. **Use this template** on GitHub and name the repository; the name becomes its address (`<name>.oztozlu.dev`) unless `folio.yaml` sets `name`. The repository may be public or private.
2. Rename it in `package.json` and the `<title>` in `index.html`, write your game (below) and fill in `folio.yaml`.
3. Push to `main`. The Folio controller builds it, publishes it at its address and adds it to Folio's `/play` page; every later push updates it. No secrets, topics, DNS or Cloudflare settings: the first commit made by "Use this template" is picked up within 15 minutes, every push within a minute or two.

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # rules and engine, in Node
pnpm build      # type check, then dist/
```

Requires Node 26 (`.node-version`) and pnpm 12.

## What is in `src/engine`

| File | What it gives a game |
| --- | --- |
| `loop.ts` | `createLoop(step, render)`: `step(dt)` runs 60 times a second whatever the display's refresh rate; `render()` once per frame. A stalled tab is not fast-forwarded. |
| `input.ts` | `createInput(canvas)`: `axis()` (keys, gamepad stick and d-pad), `target()` (where a finger or the mouse is held, 0 to 1), `took('primary' \| 'pause' \| …)` (once per press). Arrows/WASD, Space/Enter, P/Escape; gamepad A and Start. |
| `screen.ts` | `fitCanvas(canvas, onResize)`: sharp on every display (pixel ratio capped at 2). `toggleFullscreen(el)`, where the browser allows it (not on iPhone). |
| `folio.ts` | `folioContext()`: the language (`en`, `tr`) and colours to use. Framed by Folio, the visitor's language and skin; alone, the browser's language and the system's light or dark mode. |
| `storage.ts` | `load` / `save` small values (a best score). Storage may be blocked or wiped: the game never depends on it. |
| `rng.ts` | `rng(seed)`: a seeded random generator, so rules can be tested round by round. |

A round pauses itself when the tab is hidden or the window loses focus.

## How it is published

`folio.yaml` is the only setting:

```yaml
kind: play
access: public            # games must be public to be listed on Folio
name: my-game            # optional: its address, my-game.oztozlu.dev
title: { en: …, tr: … }  # English falls back to the repository name
summary: { en: …, tr: … }
order: 1                  # earlier on /play; the rest newest first
embed: true               # false: Folio links to it instead of running it in the page
aspect: "16:10"           # the frame's shape on Folio (default 16:9)
inputs: [keyboard, touch, gamepad, mouse]   # shown on its Folio page
```

On every push to `main`, `.github/workflows/folio.yml` tests and builds it with no secrets at all and keeps `dist/` as the `folio-site` artifact. The controller (a GitHub App and its own workflow) reads `folio.yaml` from that commit, checks the build, deploys it to its own Cloudflare Worker at `https://<name>.oztozlu.dev`, checks it answers, and lists it in Folio's catalogue. A file that doesn't fit, or a failed build, leaves the last good version online. Delete `folio.yaml`, archive or delete the repository, and the controller takes it down and out of Folio.

**On Folio**, `/play/<name>` runs it in a frame when the visitor asks, with *Full screen* and *Open in a new tab* (which also works without JavaScript). Folio adds `?folio=1&lang=en|tr&skin=graphite|paper|blueprint|terminal` to its address; `folioContext()` reads the language and the skin's colours, and `body.embedded` lets the game hide what Folio already shows. The frame allows its scripts, its own storage, full screen, downloads, file choosing and new tabs, and nothing of Folio itself; storage in the frame is kept apart from the game opened on its own.

**Who may frame it**: `public/_headers` sets `frame-ancestors` (Folio, its Preview, a local Folio), and the controller's Worker adds the same rule if a build drops it. The same file locks it to its own origin: no inline scripts, no third-party requests.

## Before publishing

- It plays with each input listed in `folio.yaml`, and pauses when the tab is hidden.
- It fits the frame at desktop and phone width, in both orientations it claims.
- It works framed (`?folio=1`) and on its own, in each skin.
- `pnpm test` and `pnpm build` pass; the *Folio* workflow is green.
