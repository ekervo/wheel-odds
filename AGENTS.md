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

- The published deployment record (docs.squeekchain.com/assets/deployments/sepolia.json) lists SqueekCore `0x74665d...`, but it stopped receiving settlements around round 1973. The live API (`/v1/core`) reports core `0x980b4424c007caf7a1f3670b48c8eaef7ebc3d44` (genesis 1793022600), which has the same storage layout digest and Reporter. The market is constructed against the live core and the UI warns if the API ever reports a different one.
- `roundPage(r-1, r, 1)` returns `certifiedThroughRound == r` only once round r is certified; the contract requires equality (verified against the live core).
- Betting closes when a round starts (block timestamp). The UI stops 25 seconds earlier.

## Deployed contracts

- HamsterRoundMarket: `0xd780ecea3f58da7a3f8129ac1e8d06332107e7c9` on Ethereum Sepolia, deployed at block 12033253, bound to SqueekCore `0x980b4424c007caf7a1f3670b48c8eaef7ebc3d44`.
- `public/HamsterRoundMarket.sol` is a copy of the contract shown in the app's source viewer. Re-copy it if the contract changes.
