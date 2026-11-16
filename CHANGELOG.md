# Changelog

## Unreleased

- New game: Blanktastic, a family-friendly fill-in-the-blank card game for 3–10 players. A rotating Judge reads a prompt; everyone else plays the funniest answer card from the hand on their phone (or writes their own, twice a game), and the Judge picks a winner without knowing who played what. 117 prompts and 315 answers, all original; written cards pass a word filter.

## 0.5.0

- New game: Tin Tongue, a team clue game for 4–16 players. The clue-giver's robot voice chip only does one-syllable words; their team guesses out loud while the other team sees the word too and hits BZZT on a slip (−1). Cards score a point per syllable, up to 3. Phones show the word with Got it / Skip, the TV shows the timer, scores and a recap of every turn.

## 0.4.0

- New game: Hard Sell, for 3–10 players. One player is the customer and picks a persona card; everyone else glues two word cards into a product, pitches it out loud, and the customer buys one. Sellers also vote a crowd favourite.

## 0.3.0

- New game: Star Charts, a team word-clue game for 4–16 players. Each team's astronomer sees the secret star map on their phone and gives one-word clues; teammates vote on their phones for which words to chart, and the black hole loses the game.

## 0.2.0

- New game: Glitch Squad, a hidden-Glitch word game with a paper-craft look on the TV and phones.
- Sound: synthesized effects and background music on the host screen, a tick-tock in the last 10 seconds of every countdown, and a mute button.
- The host screen and phones stay awake while a room is open.

## 0.1.0

- First release: room codes, host screen, phone controller with reconnects.
- Games load at runtime from game folders; upload API with an admin token.
- Standard phone views: text, text input, choices, multi-select, slider, drawing pad.
- Sample games: Face-Off (write answers, vote on match-ups) and Quick Poll (template).
- Shares port 7777 with Hohmann's Reach on the VM via `switch-game`.
