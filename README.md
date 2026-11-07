# Folio play template

A starting point for small browser games that show up on [Folio](https://oztozlu.dev/play) by themselves. No game engine: a fixed-step loop, one input layer for keyboard, touch, mouse and gamepad, a canvas sized for the display, and the glue Folio expects. The pilot game, **Gates**, uses all of it in about a hundred lines.

## Start a game

1. **Use this template** on GitHub to create a new public repository, for example `orbit`.
2. Rename the game in three places: `name` in `package.json`, `name` in `wrangler.jsonc` and the `<title>` in `index.html`.
3. Replace `src/game/gates.ts` with your game, and its texts in `src/main.ts`. Keep the shape: a `State`, a pure `step(state, controls, dt, random)` and a `render(...)`.
4. Fill in `.github/folio.yaml` (below).
5. Deploy (below), then set the repository's **homepage** to the game's address and add the **`folio-play`** topic. Folio lists the game at its next build: at most six hours, or at once with *Run workflow* on Folio's Production workflow.

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

## How Folio shows it

`/play` lists every public repository of the owner with the `folio-play` topic and an https homepage. Each game gets a page, `/play/<repository-name>`, that runs it in a frame when the visitor asks, with *Full screen* and *Open in a new tab*. Without JavaScript, the same button opens the game in a new tab.

`.github/folio.yaml` (every field optional):

| Field | Meaning |
| --- | --- |
| `title`, `summary` | `{ en, tr }`. English falls back to the repository name and description. |
| `order` | Games with one come first, in that order; the rest by last push. |
| `embed` | `false` to link to the game instead of framing it. |
| `embedOptions.aspect` | The frame's shape, like `"16:10"` (default `16:9`). |
| `embedOptions.orientation` | `landscape`, `portrait` or `any`. |
| `embedOptions.input` | Shown on the game's page: `keyboard`, `touch`, `mouse`, `gamepad`. |

A file that doesn't fit leaves only this game out of Folio, with a warning in Folio's build log.

**In the frame**, Folio adds `?folio=1&lang=en|tr&skin=graphite|paper|blueprint|terminal` to the address; `folioContext()` reads it, and `body.embedded` hides the game's own full-screen button (Folio has one). The frame lets the game run its scripts, use its own storage, go full screen, open new tabs and download files. It can't navigate Folio or read anything of it. Storage in the frame is kept apart from the same game opened on its own.

**Who may frame the game** is set in `public/_headers` (`frame-ancestors`): Folio, its Preview and a local Folio. The same file locks the game to its own origin (no inline scripts, no third-party requests); loosen it only for what the game really needs.

## Deploy

The game is static files served by Cloudflare (`wrangler.jsonc`, Workers static assets with the headers in `public/_headers`). `.github/workflows/deploy.yml` tests and builds every pull request, and deploys every push to `main`.

Once per repository:

1. Cloudflare → My Profile → API Tokens → a custom token with **Account · Workers Scripts · Edit** for your account only.
2. GitHub → Settings → Environments → `production`, deployment branches limited to `main`, with the secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
3. Push to `main`. The address is `https://<name>.<your-subdomain>.workers.dev`; a custom domain can be added under `routes` in `wrangler.jsonc`.

## Before adding the `folio-play` topic

- It plays with each input listed in `folio.yaml`, and pauses when the tab is hidden.
- It fits the frame at desktop and phone width, in both orientations it claims.
- It works framed (`?folio=1`) and on its own, in each skin.
- `pnpm test` and `pnpm build` pass.
