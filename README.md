# Monte Carlo Simulation of the Gambler's Fallacy

A browser-based Monte Carlo simulation that tests, empirically, whether a run of losses makes
the next round more likely to win.

It does not. This repository measures by how little.

## Why this exists

The gambler's fallacy is the belief that independent events "even out" in the short run — that
after six losses in a row, a win is somehow *due*. It is easy to state the correct answer and
much harder to feel it, which is why betting systems built on the fallacy keep being
reinvented.

Rather than argue the point, this project generates hundreds of thousands of rounds of a real
provably-fair casino game, isolates every moment at which exactly *k* consecutive losses had
just occurred, and reports what actually happened on the very next round. It then simulates
the betting system the fallacy recommends — a martingale entered only after a loss streak —
and measures what it returns.

## The generator

Rounds come from a reimplementation of **Limbo**, the provably-fair multiplier game. Each
round's multiplier is derived deterministically from a server seed, a client seed and a nonce:

```
hash = HMAC-SHA256(serverSeed, "clientSeed:nonce:0")
u    = (int(hash[0:13], 16) + 1) / 2^52          // uniform in (0, 1]
m    = clamp(floor((RTP / u) * 100) / 100, 1.00, 1000000.00)
```

With `RTP = 0.99`, this yields `P(m ≥ t) ≈ 0.99 / t`. At the default target of 2.00× the win
rate is therefore **49.50%**, not 50% — the missing half-point is the 1% house edge.

The important structural property is that the nonce is the *only* input that advances between
rounds, and it advances blindly. No round can observe what previous rounds produced, so the
sequence is memoryless by construction. The simulation confirms that this is also true in
measurement, not just in theory.

## Results

### Loss streaks do not predict the next round

Pooled over **500,000 rounds** across 5 independent seed pairs, at target 2.00×:

| Consecutive losses just observed (*k*) | Times observed | Next round won | Next-round win rate | Theory |
|---:|---:|---:|---:|---:|
| 1  | 125,043 | 61,590 | 49.26% | 49.50% |
| 2  | 63,452  | 31,603 | 49.81% | 49.50% |
| 3  | 31,849  | 15,836 | 49.72% | 49.50% |
| 4  | 16,013  | 7,945  | 49.62% | 49.50% |
| 5  | 8,068   | 4,026  | 49.90% | 49.50% |
| 6  | 4,042   | 2,029  | 50.20% | 49.50% |
| 7  | 2,013   | 1,010  | 50.17% | 49.50% |
| 8  | 1,003   | 501    | 49.95% | 49.50% |
| 9  | 502     | 240    | 47.81% | 49.50% |
| 10 | 262     | 143    | 54.58% | 49.50% |

Overall win rate across the pool: **49.50%**, matching theory exactly.

Every row with a usable sample size sits within 0.7 percentage points of 49.50%. There is no
trend: the rate after eight straight losses is indistinguishable from the rate after one. The
apparent wobble at *k* = 9 and 10 is sample size, not signal — those rows rest on a few
hundred observations, and beyond *k* = 10 the counts fall into single digits and the
percentages swing between 0% and 100% purely at random. That swing is worth noticing, because
it is precisely the noise a gambler at a table mistakes for a pattern.

A second, quieter confirmation is in the "times observed" column: 125,043 → 63,452 → 31,849 →
16,013 → 8,068 → 4,042 → 2,013 → 1,003. Each is almost exactly 50.5% of the row above it.
Streaks decay geometrically at the single-round loss rate, which is what independence looks
like from the outside.

### The betting system the fallacy suggests

`testStrategy1` waits for 6 consecutive losses, then bets 1 € at 2.00× and doubles after each
loss up to an 8 € cap, abandoning the sequence if the capped bet also loses.

The arithmetic is unforgiving. Any win in the 1 → 2 → 4 → 8 progression nets exactly +1 €,
while losing all four costs 15 €, and P(losing four in a row) = 0.505⁴ = 6.50%:

```
EV per sequence = 0.935 × (+1 €) + 0.065 × (−15 €) = −0.040 €
```

Against roughly 3.81 € wagered per sequence, that is an expected ROI of about **−1.06%** —
the house edge, unchanged. Across 12 independent runs of 50,000 rounds each:

| Metric | Measured | Theory |
|---|---|---|
| Mean ROI | −0.66% | ≈ −1.06% |
| ROI range | −5.51% … +4.41% | — |
| Runs showing a profit | 5 of 12 | — |
| Sequences that busted at the cap | 6.44% (of 4,894) | 6.50% |

The bust rate lands on theory to within 0.06 points. The ROI does not converge nearly as
fast, and that is the practical lesson: **5 of 12 runs of fifty thousand rounds each finished
in profit.** A player living inside one of those runs would have every reason to believe the
system works. The mean is still negative, and no arrangement of bet sizes moves it — the edge
is a property of the generator, not of the staking plan.

## Requirements

A modern browser and a way to serve a directory over HTTP. No dependencies, no build step, no
package manager.

The simulation uses the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
for HMAC-SHA256, which requires a secure context. Serving over `localhost` satisfies this;
opening `index.html` directly from the filesystem may not, depending on the browser.

## Running it

```bash
git clone https://github.com/ElMammoth/MONTE-CARLO-SIMULATION-OF-THE-GAMBLER-S-FALLACY.git
cd MONTE-CARLO-SIMULATION-OF-THE-GAMBLER-S-FALLACY
python3 -m http.server 8000
```

Open <http://localhost:8000> and use the browser's developer console (F12).

**Watch rounds live.** Set a target multiplier and a stake, then press *Lancer le Pari
Automatiquement* to play one round every 250 ms. A stake of `0` observes without betting.

**Run the experiment.**

```js
TEST(n, target, betAmount)     // defaults: 100000, 2.00, 1.00
```

Plays `n` rounds and prints the observed win rate, the loss-streak distribution, and the
next-round outcome for each streak length against theory.

Use a stake of `0` for statistical work:

```js
TEST(500000, 2.00, 0)          // half a million rounds, no staking
```

This matters. With a real stake the run stops early if the balance reaches zero, and flat
betting 1 € for 100,000 rounds at a 1% edge has an expected loss of 1,000 € — exactly the
starting balance, so roughly half of such runs terminate before completing. A stake of `0`
never touches the balance and leaves the streak statistics identical.

**Run the betting strategy.**

```js
testStrategy1(rounds, initialBalance, lossTrigger, maxBet, showDetails)
// defaults:  1000,   1000.00,        6,           8.00,   false

testStrategy1(50000)                      // 50k rounds with defaults
testStrategy1(50000, 1000, 6, 64)         // raise the bet cap to 64 €
testStrategy1(1000, 1000, 6, 8, true)     // print every sequence
```

Both functions run on a snapshot of the game state and restore it when they finish, so calling
them never disturbs the balance shown in the UI.

## Repository structure

```
index.html                       Markup and script tags
style.css                        Styling
src/
  seedGenerator.js               Per-session server and client seed generation
  limboAlgorithm.js              HMAC-SHA256 → multiplier; the RNG under test
  balanceManager.js              Balance, stake validation, payouts
  gameState.js                   Nonce, counters, streaks, save/restore
  ui.js                          DOM rendering and input parsing
  gameController.js              Live autoplay loop (start / stop / step)
  experiment.js                  TEST() — the gambler's fallacy measurement
  main.js                        Bootstrap: seeds, button wiring, console help
strategies/
  strategy1Martingale.js         testStrategy1() — capped martingale after a streak
```

Scripts are plain globals loaded in dependency order, not ES modules. For a project of this
size that is a deliberate choice: it keeps the whole thing runnable from a static file server
with nothing installed.

## Limitations

- **Runs are not reproducible.** A fresh seed pair is generated on every page load and there
  is no field to supply your own, so a given run cannot be replayed. The numbers reported
  above were pooled across independent seeds for this reason.
- **Throughput is bound by WebCrypto.** Each round awaits one `crypto.subtle.sign` call;
  100,000 rounds takes roughly 5 seconds in headless Chromium.
- **`expectedWinrate` is an approximation.** The reported `RTP / target` ignores the
  `floor(… × 100) / 100` truncation and the clamp at 1.00×. The error is well below the
  sampling noise at these sample sizes.
- **The strategy simulation starts from the live nonce**, so repeated calls within a single
  page load resample the same window and return identical results. Reload the page for an
  independent run.
- **Streak lengths beyond ~10 are not measurable here.** They occur too rarely to estimate a
  rate from; the table above omits rows with fewer than 200 observations.
- `maxWinStreak` and `currentWinStreak` are tracked in `gameState.js` but never surfaced in
  the UI.

## Note

This is an independent reimplementation of a published provably-fair algorithm, written to
study a probability question. It is not affiliated with any operator, handles no real money,
and is not betting advice. If anything, it is the opposite: the measured conclusion is that no
staking pattern overcomes a negative edge.
