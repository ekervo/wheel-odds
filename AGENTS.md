# Wheel Odds

> Built by @gemresearches

## What This App Does

Over/under prediction market on the Squeekchain hamster wheel. Players bet Sepolia ETH on the work counted in a future 600-second round. `HamsterRoundMarket` settles permissionlessly from SqueekCore `roundPage`, pays pro rata (pari-mutuel, no fee, no owner), and refunds if the winning side is empty or the round is never certified within 7 days.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind, wagmi v2, viem, ConnectKit (dark Squeekchain theme, tokens in `tailwind.config.js`).
- Contract: `contracts/HamsterRoundMarket.sol` (Solidity 0.8.28, Foundry).
- Chain: Ethereum Sepolia (11155111). Stakes are native ETH, not USDC.

## Key Files

- `src/App.tsx` composition root; `src/components/` WheelHero, MarketBoard, BetPanel, Positions, RoundHistory.
- `src/lib/market.ts` market address, deploy block, ABIs, lines. Set `MARKET_ADDRESS` and `MARKET_DEPLOY_BLOCK` after deploy.
- `src/lib/wheel.ts` read-only Squeekchain API client.
- `src/hooks/useSqueek.ts`, `src/hooks/useMarket.ts` reads and writes.

## AI analyst

- `server/index.ts` (run with `bun run server`, port 3001, proxied at `/api` by Vite) asks DeepSeek to explain the forecast line. The key is `DEEPSEEK_API_KEY` in `.env`, added by the user, never in source.
- The line itself comes from `src/lib/forecast.ts` (deterministic, shared by client and server). The LLM only explains. The server builds all prompt facts itself and caches one answer per round.
- The registry's public Sepolia RPC answers 429, so the app and server use publicnode and tenderly endpoints instead.

- Logic lives in `server/core.ts`; `server/index.ts` is the local http server and `api/ai/chat.ts`, `api/ai/take.ts` are the Vercel functions (use `.js` import extensions so they resolve in ESM). Site chat: `POST /api/ai/chat`, facts in `server/knowledge.ts` (update it when rules or UI change). Shared budget of 30 calls a minute, 12 turns and 600 characters per message.
- Leaderboard: `src/lib/leaderboard.ts` rebuilds results from BetPlaced and Settled events with the contract's pro rata rule; AI lines of settled rounds are recomputed with `forecast()`.
- Invite links use the query `?r=<round>&l=<line>&s=over|under&a=1` (`src/lib/invite.ts`), built on `getShareBase()`.

## Decisions and gotchas

- Squeekchain replaces its SqueekCore from time to time (20261025, then 20261103). A market is bound to one core for life, so a replacement means: update `LIVE_CORE` in `src/lib/coreAbi.ts`, deploy a new `HamsterRoundMarket` with the new core, update `src/lib/deployment.ts`. The UI warns while the market and the API disagree. The published record and the API agreed on `0xfd6c...` at the last check.
- `roundPage(r-1, r, 1)` returns `certifiedThroughRound == r` only once round r is certified; the contract requires equality (verified against the live core).
- Betting closes when a round starts (block timestamp). The UI stops 25 seconds earlier.

## Deployed contracts

- HamsterRoundMarket: `0x806036c434e9e7c4beea602dfa2ae7cac602fecb` on Ethereum Sepolia, deployed at block 12090651, bound to SqueekCore `0xfd6c166d4b8e2962e65746a13e5a0797cd4de0c4` (release core-sepolia-20261103).
- Previous markets (unsettled stakes there are refundable straight from the contract, no UI): `0xd780ecea3f58da7a3f8129ac1e8d06332107e7c9` (core `0x980b4424...`), earlier core in the 20261025 installation.
- `public/HamsterRoundMarket.sol` is a copy of the contract shown in the app's source viewer. Re-copy it if the contract changes.
