# Notes for agents working on Party Hall

- New games and big game changes must follow [GUIDELINES.md](GUIDELINES.md).
  Read it before starting, and check the game against it before merging.
- How to build a game (game.json, host.js, views, tutorial.json): [GAMES.md](GAMES.md).
- Test with bots: `node tools/audit.js <server> <game-id>` and fix what it reports.
- Merge to `main` with a line under `## Unreleased` in CHANGELOG.md. Don't run the
  release workflow or install on the server from a game branch; the Party Hall
  framework thread does releases and server installs.
