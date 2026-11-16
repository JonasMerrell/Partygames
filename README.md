# Party Hall

A small framework for Jackbox-style party games: one shared screen (the TV)
runs the game, and everyone plays on their phone after typing a four-letter
room code. No app, no accounts.

- **Host:** open `/host` on the TV or laptop, pick a game, read out the code.
- **Players:** open the server's address on a phone and type the code.
- **New games:** a folder with `game.json` + `host.js`, loaded at runtime. See
  [GAMES.md](GAMES.md). Dropping a folder in or uploading it makes it playable
  right away; the server never needs a rebuild for a new game.

## How it fits together

The Rust server only relays messages between the host screen and the phones
(rooms, codes, reconnects, rate limits). All game logic runs in the host's
browser, which is why a game is just a JavaScript file. Phones show "views",
plain JSON the host sends (a prompt, a text box, choice buttons, a drawing pad),
so most games need no phone code at all.

```
phone ─┐                 ┌─ host screen (runs games/<id>/host.js)
phone ─┼── /ws ─ server ─┤
phone ─┘                 └─ /games/<id>/…  served straight from the games folder
```

## Running

```sh
cargo run -- --port 8080 --games games
```

Options: `--port`, `--games DIR` (repeatable; the first is where uploads go),
`--tls-cert/--tls-key` (HTTPS; plain HTTP is then accepted only from LAN
addresses unless `--allow-plain`), env `PARTY_ADMIN_TOKEN` or
`PARTY_ADMIN_TOKEN_FILE` to enable the upload API.

## On the game server VM

Party Hall shares port 7777 and the HTTPS certificate with Hohmann's Reach, and
only one of them runs at a time:

```sh
sudo switch-game party      # Party Hall on 7777
sudo switch-game hohmann    # back to Hohmann's Reach
switch-game                 # which one is running
sudo partyhall-update       # install the latest release
```

First-time setup (as root, from an unpacked release): `sh partyhall/deploy/install.sh`.
Uploaded games live in `/var/lib/partyhall/games`, built-in ones in
`/opt/partyhall/games`.

## Releases

Push a tag `vX.Y.Z` with a matching `## X.Y.Z` section in CHANGELOG.md; the
workflow builds a static Linux binary and publishes the release.
