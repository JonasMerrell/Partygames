# Guidelines for new Party Hall games

Every new game, and every big change to an existing one, follows these rules.
[GAMES.md](GAMES.md) explains how to build a game; this file says what a
finished one must look like before it's merged.

## 1. Original only

Each game gets its own name, setting, art, writing and sounds. Don't take
characters, terms, card text, board layouts or the look of another game or
franchise, even renamed. Playing like a well-known game is fine: mechanics
aren't the problem, copied content is.

## 2. Credit the inspiration

Put the real game's name in `"inspiredBy"` in `game.json`. The picker and the
lobby show it in brackets, so players know what to expect.

```json
{ "name": "Face-Off", "inspiredBy": "Quiplash", … }
```

## 3. Tutorial included

Ship a `tutorial.json` (see [GAMES.md](GAMES.md#tutorialjson-optional)) so the
host can run "How to play" from the lobby. Optional for the framework, required
for a game in this repo. Keep it to a few short steps, add voice clips with
`"audio"` per step where the other games have them, and record the MP4 with
`node tools/record-tutorials.js <server> <out-dir>`.

## 4. Always 16:9

Every TV screen must fit the fixed 16:9 stage with nothing cut off and without
the auto zoom kicking in. Size things in `em` (1em = 1/64 of the TV width), cap
long lists, and use columns rather than one tall stack. Phone screens must fit
a common phone (390×800) without scrolling to reach the main action.

## 5. Readable from the couch

TV text at `.67em` or more, phone text at 14px or more, WCAG AA contrast, and
no text faded with `opacity`. On light backgrounds use the `.pname` name tag
for player colours. See
[Make it readable from the sofa](GAMES.md#make-it-readable-from-the-sofa).

## 6. Phones are controllers

Big tap targets and short inputs. Secret information (your role, your hand,
your word) stays on your phone; shared information goes on the TV. Use the
built-in views where they work and only write a `player.js` when they don't.

## 7. Works with bots

Bots must be able to play a full game from lobby to results with no errors,
timeouts or stuck screens. This is the test: run

```sh
node tools/audit.js http://localhost:8080 <game-id>
```

and fix everything it reports (errors, cut-off text, low contrast, small text,
zoomed screens) before merging.

## 8. Theme everything

Each game has its own feel:

- **Music:** a looping track in `audio/` (`bg_main.ogg` also plays in the
  lobby once the game is picked), or a `"music"` mood in `game.json`.
- **Sound effects:** `ctx.sfx` or the game's own sounds.
- **Lobby:** a `.lobby-<id>` theme in `web/style.css`.
- **Announcer:** lines written for the game's setting.

Custom audio must follow the TV's Music and Sound effects volume sliders and
the mute button, like the built-in `ctx.music` and `ctx.sfx` do.

## 9. Family-friendly by default

The default content suits a mixed room, kids included. Anything edgier goes
behind an option the host turns on, and stays off unless they do.

## 10. Release process

Merge to `main` with a line under `## Unreleased` in
[CHANGELOG.md](CHANGELOG.md) describing the game for players. Don't cut a
release or install on the server from a game branch: releases and server
installs are done in one place (the Party Hall framework thread), which
bundles everything under `## Unreleased` into the next version.
