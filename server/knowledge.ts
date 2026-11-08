import { MARKET_ADDRESS, MARKET_DEPLOY_BLOCK } from '../src/lib/deployment.js'
import { LIVE_CORE } from '../src/lib/coreAbi.js'

/** Facts about Wheel Odds that the chat assistant may use. Keep in step with the contract and the UI. */
export const KNOWLEDGE = `
PRODUCT
Wheel Odds is a testnet prediction game on the Squeekchain hamster wheel (Ethereum Sepolia). Players bet Sepolia ETH on how much work the wheel does in a future 10 minute round. Testnet ETH has no monetary value. It is an entry for the Squeekchain builder contest, in the group "games powered by Squeekchain" with an "AI on the wheel" feature.

KEY TERMS
- Round: a 600 second window. Round r covers genesis + (r-1)*600 to genesis + r*600 seconds.
- Work unit: one accepted wheel-magnet passage. The work of a round is the number of passages certified for it.
- SqueekCore: the Squeekchain contract that records certified work per round. The market reads it directly. Rounds SqueekCore has not certified yet are unknown, not zero.
- Line: a number of work units. "Over" wins if the certified work of the round is above the line. "Under" wins if it is at or below the line. Line 0 means "does the wheel run at all": Over wins if there is any work.

HOW A BET WORKS
1. Pick a round (the next four rounds are open) and a line. Lines come from the wheel's recent data: the "runs at all" line plus quartiles of the last 60 certified rounds, the best recent round, and any custom line (a multiple of 25 up to the round maximum of 10000).
2. Bet Over or Under with Sepolia ETH. Minimum bet is 0.0001 ETH. Betting closes the moment the round starts (the app stops about 25 seconds earlier so the transaction can land). A wallet may bet both sides.
3. After the round ends and SqueekCore certifies it (usually a few minutes), anyone can press "Settle from SqueekCore". The contract reads the certified work and fixes the result. Then winners press "Claim".

PAYOUTS
- Pari-mutuel: all stakes on a line form one pool. Winners split the whole pool in proportion to their stake on the winning side. There is no fee and no owner.
- If nobody backed the winning side, every stake on that line is refunded.
- If SqueekCore never certifies the round within 7 days after it ends, every stake is refundable.
- Odds move as people bet. The bet panel shows the payout at current pools; it can change before the round starts.

BEAT THE AI
- For each of the next two rounds the app publishes an AI line. It is a decay-weighted median of the work in the last 30 certified rounds, using only rounds up to 3 rounds before the target so everyone gets the same line and bets in one shared pool. It is a statistical model, not a language model.
- "Hamster beats the AI" is an Over bet on that line. "AI holds" is an Under bet.
- A language model (DeepSeek) writes the short "AI analyst" commentary under the line. It explains the numbers and does not change the line.
- The AI track record card replays the same model on settled rounds.

OTHER FEATURES
- Live wheel panel: status, speed, distance today, and work counted so far in the current round, from the public Squeekchain API.
- Your bets: positions with the status Betting open, Round in progress, Waiting for SqueekCore to certify, Ready to settle, You won, Lost, Paid out. Claim history lists every payout with its transaction link. Lists show 10 items per page.
- Leaderboard: top earners and "AI slayers" (most wins by beating the AI line), computed from onchain events.
- Share: a link can open a specific round and line so friends can join the same pool.

TRUST
No admin, no pause, no upgrade path, no fee. The only input is the work SqueekCore certified. The contract source is shown in the app under "Read the contract source". Explorer source verification is not done for the market contract.

ADDRESSES
- Market contract on Sepolia: ${MARKET_ADDRESS ?? 'not deployed'} (deployed at block ${MARKET_DEPLOY_BLOCK}).
- SqueekCore it reads: ${LIVE_CORE}. This is the core in Squeekchain's published deployment record and the one the live API reports. A market is bound to one core for life, so when Squeekchain replaces its core a new market contract is deployed and the app warns while the two disagree.

LIMITS AND HONESTY
- The wheel is a real hamster. It often rests, so many rounds have zero work. The chart shows idle streaks.
- Nothing here is financial advice. Predictions can be wrong.
- Settlement waits for SqueekCore; if a round is not settled yet, the answer is to wait a few minutes.
`.trim()
