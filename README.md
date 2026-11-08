# Folio play template

A starting point for small browser games that appear on [Folio](https://oztozlu.dev/play) by themselves. No game engine: a fixed-step loop, one input layer for keyboard, touch, mouse and gamepad, a canvas that stays sharp, and the sample game **Gates**. Push to `main` and the game is served by Folio itself at `https://oztozlu.dev/play/<name>/app/`, with its own page at `/play/<name>`.

There are three Folio templates; pick by what you are making:

| Template | Makes | Lives at | Who can open it |
| --- | --- | --- | --- |
| `folio-play-template` (this one) | a game | `oztozlu.dev/play/<name>`, part of Folio | everyone |
| `folio-lab-template` | an experiment or simulation | `oztozlu.dev/lab/<name>`, part of Folio | everyone |
| `folio-site-template` | a separate site | `<name>.oztozlu.dev` | everyone, people you name, or whoever has a password; optional protected admin area |

## Start a game

1. **Use this template** on GitHub and name the repository. The name, in lower case, becomes its place in Folio (`/play/<name>`) unless `site.yaml` sets `name`. The repository may be public or private; the game itself is always public.
2. Rename it in `package.json` and in the `<title>` of `index.html`, write the game (see below) and fill in `site.yaml`.
3. Push to `main`.

That is all. No secrets, topics, DNS records or Cloudflare settings, and nothing to change in the Folio repository. The first commit made by *Use this template* is picked up by itself.

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # rules and engine, in Node
pnpm build      # type check, then dist/ (relative paths, so it runs from any folder)
```

Requires Node 26 (`.node-version`) and pnpm 12.

## What happens after a push

1. `.github/workflows/folio.yml` installs, tests and builds the game with no secrets at all, and keeps `dist/` as the `folio-site` artifact (14 days).
2. The Folio controller (a GitHub App and its own workflow, in the private `folio-controller` repository) hears the build finish. It reads `site.yaml` **from the same commit as the build**, checks the files (below), packs them, keeps them by their SHA-256, and adds the game to Folio's catalogue with that hash.
3. The controller starts Folio's build. Folio downloads the game, accepts it only if the hash and size match, and serves it from its own Worker at `/play/<name>/app/`.

A push is usually live on the Folio Preview within about five minutes (build about one, controller about one, Folio about three). Production gets it the same way once Folio is live there (see *Implemented, deferred, limits*).

**If something goes wrong**, the last good version stays where it is:

- a failed test or build: nothing is published; the next push tries again;
- a build the controller refuses: the repository is marked as failing on the controller's status page and in its run log, with the reason, and the controller tries again after 10, 20, 40, 80 and 160 minutes (a new commit starts over);
- Folio can't fetch or verify the build: that one game is left out of Folio's build, with a warning, and everything else is published.

**Going back**: revert the commit and push; the controller publishes the reverted build like any other. There is no separate "roll back this game" button.

## site.yaml

The only setting. Every field but `kind` is optional.

```yaml
kind: play                  # play; or lab, or site (see the table above)
name: my-game               # its place in Folio, /play/my-game. Default: the repository's name in lower case
title: { en: Gates, tr: Kapılar }        # default: the repository's name
summary: { en: …, tr: … }                # default: empty
order: 1                    # earlier on /play than games without one; the rest newest first
embed: true                 # default true; false: Folio links to the game instead of running it in its page
aspect: "16:10"             # the frame's shape, width:height. Default 16:9
inputs: [keyboard, touch, gamepad]       # shown on the game's card: keyboard, touch, mouse, gamepad
```

A game is always public: `access` may only be `public`, and `allow`, `deny`, `serviceTokens`, `login` and `admin` don't apply (Folio can't frame a game behind a sign-in). For a protected site use `folio-site-template`.

`folio.yaml` is the old name of this file and is still read; a repository with **both** files is refused (the controller changes nothing) until one is removed.

### Names

- Lower-case letters, digits and hyphens, 1 to 63 characters, not starting or ending with a hyphen.
- First come, first served among games: if another repository already has `/play/<name>`, the deploy fails with `/play/<name> belongs to another repository` and that repository keeps it. Games and lab apps are separate: `/play/x` and `/lab/x` can both exist.
- Changing `name` moves the game: the next Folio build serves it at the new path, and the old address answers 404 (there is no redirect).

## On Folio

`/play` lists the games of the current Folio build. `/play/<name>` is the game's page: its title and summary in the visitor's language (English when there is no Turkish), its inputs, and the game itself, which **loads only when the visitor asks**. It has *Full screen* and *Open in a new tab*; the start button is also a plain link to `/play/<name>/app/`, so it works without JavaScript.

### In the frame

Folio adds `?folio=1&lang=en|tr&skin=graphite|paper|blueprint|terminal` to the game's address. `folioContext()` (`src/engine/folio.ts`) reads them: the visitor's language and the colours of their Folio skin. Opened on its own, the game follows the browser's language and the system's light or dark setting. Framed, `body.embedded` is set, so the game can hide what Folio's page already shows (its title, for instance).

The game is Folio's own files, so it shares Folio's origin (`oztozlu.dev`):

- **Storage**: `load` / `save` (`src/engine/storage.ts`) prefix every key with `play:<name>:` (`namespace()` in `src/engine/folio.ts`), so two games never overwrite each other. What it saves is the same in the frame and in its own tab.
- **Frame**: `sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-downloads allow-popups allow-popups-to-escape-sandbox"`, with `allow="fullscreen; gamepad; autoplay; clipboard-write"`. Because the game has Folio's origin, the sandbox is **not a security boundary**: a game's script could reach Folio's page. That is acceptable only because every game is the owner's own repository, built by its own workflow and checked by the controller. Treat a game's dependencies as part of Folio.
- **Policy** that Folio sends with every file of the game: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self' data: blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'self'`. No third-party scripts, styles, fonts or requests; WebAssembly is allowed; only Folio may frame it. Its pages carry `noindex` (Folio's page is the one to find).
- **Files**: `index.html` is served without caching, files whose name carries a content hash (`assets/index-3f9a1c2b.js`) for a year. An address under `/play/<name>/app/` that isn't a file and has no extension gets the game's page, with a `<base>` pointing at `/play/<name>/app/` (for single-page routing). `/play/<name>/app` without the slash redirects to it.

### Taking it down

Delete `site.yaml`, archive the repository or delete it. The controller removes the game from the catalogue and starts Folio's build, which no longer has it (on the Preview within a few minutes).

## What the controller accepts

- `index.html` at the root of `dist/`;
- no Worker code (`_worker.js`), no links, no paths leaving `dist/`;
- at most 5 000 files, 25 MiB per file, 100 MiB in all, and **20 MiB once packed** for Folio (files are base64-encoded, so about 15 MiB of files);
- `_headers` and `_redirects` are dropped: Folio sets the headers.

## What is in `src/engine`

| File | What it gives a game |
| --- | --- |
| `loop.ts` | `createLoop(step, render)`: `step(dt)` runs 60 times a second whatever the display's refresh rate; `render()` once per frame. A stalled tab is not fast-forwarded. |
| `input.ts` | `createInput(canvas)`: `axis()` (keys, gamepad stick and d-pad), `target()` (where a finger or the mouse is held, 0 to 1), `took('primary' \| 'pause' \| …)` (once per press). Arrows/WASD, Space/Enter, P/Escape; gamepad A and Start. |
| `screen.ts` | `fitCanvas(canvas, onResize)`: sharp on every display (pixel ratio capped at 2). `toggleFullscreen(el)`, where the browser allows it (not on iPhone). |
| `folio.ts` | `folioContext()`: the language and colours to use; `namespace()`: the storage prefix. |
| `storage.ts` | `load` / `save` small values (a best score), under the game's prefix. Storage may be blocked or wiped: the game never depends on it. |
| `rng.ts` | `rng(seed)`: a seeded random generator, so rules can be tested round by round. |

A round pauses itself when the tab is hidden or the window loses focus. `vite.config.ts` sets `base: './'`: keep it, as Folio serves the game from a folder, not from the root of a site.

## Before publishing

- It plays with each input listed in `site.yaml`, and pauses when the tab is hidden.
- It fits the frame at desktop and phone width, in both orientations it claims.
- It works framed (`?folio=1`) and on its own, in each skin.
- `pnpm test` and `pnpm build` pass; the *Folio* workflow is green.

## Implemented, deferred, limits

| | Status |
| --- | --- |
| Push → build → checked → served by Folio at `/play/<name>/app/` | Implemented; tested end to end on the Folio Preview |
| Catalogue entry, page, frame, full screen, new tab, storage per game | Implemented |
| Removal by deleting `site.yaml`, archiving or deleting the repository | Implemented; tested |
| Publishing to production `oztozlu.dev` | Waits for Folio's go-live, when the controller also starts Folio's production workflow (`FOLIO_TARGETS`) |
| Server code for a game (an API, a database) | Not supported: a game is static files |
| A protected game (sign-in or password) | Not supported; use `folio-site-template` |
| Isolation from Folio's page | Limited: same origin, so the sandbox is not a boundary (see *In the frame*) |
