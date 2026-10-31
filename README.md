# Wheel Odds

A prediction game on the Squeekchain hamster wheel. Every 10 minutes the wheel's work is counted and settled onchain by SqueekCore. You bet Sepolia ETH on whether a future round's work lands over or under a line, and the contract pays winners from the certified number. Nobody can settle it by hand, and there is no admin or fee.

Built by [@gemresearches](https://x.com/gemresearches)

## What you can do

- Watch the live wheel: status, speed, distance, and the work counted so far this round.
- See what the wheel actually did over the last 30 settled rounds.
- Beat the AI: for the next rounds, an AI forecaster publishes the work it expects. Bet that the wheel beats it or that the AI holds, and see its track record on settled rounds.
- An AI analyst (DeepSeek) explains each forecast in plain words, using only facts read from the ledger.
- An Ask AI chat that answers questions about the site, its rules and the live wheel (English or Vietnamese).
- A leaderboard of top earners and AI slayers, rebuilt from onchain events.
- Invite links that open a specific round, line and side so friends can join the same pool.
- A How it works section with the rules, the trust guarantees and the full contract source.
- Bet over or under on any of the next four rounds, at fixed lines or a custom line.
- Review your claim history with a link to every payout transaction.
- Settle a finished round yourself once SqueekCore has certified it, then claim winnings.
- Get a full refund if nobody backed the winning side, or if a round is never certified within 7 days.

Testnet only. Stakes are Sepolia ETH with no monetary value.

## Tech stack

React 18, Vite, TypeScript, Tailwind CSS, wagmi v2, viem, ConnectKit. Solidity 0.8.28 with Foundry and OpenZeppelin.

## Development

Prerequisites: [Bun](https://bun.sh) and [Foundry](https://book.getfoundry.sh).

```sh
bun install
bun run dev
```

Environment variables:

- `DEEPSEEK_API_KEY`: key for the AI analyst. Optional. Without it the forecast and betting still work and the analyst panel says it is switched off.
- `DEEPSEEK_MODEL`: model name, defaults to `deepseek-chat`. Optional.
- `AI_SERVER_PORT`: port of the analyst backend, defaults to 3001. Optional.
- `RPC_PROXY_BASE_URL`, `RPC_PROXY_TOKEN`, `RPC_PROXY_CHAINS`: provided by the hosting environment, used by the backend for Sepolia reads. Optional: without them the backend uses public Sepolia endpoints.

The analyst runs as a small backend so the key never reaches the browser. Start it next to the app:

```sh
bun run server
```

Other commands:

- `bun run server` starts the AI analyst backend.
- `bun run check` runs lint and typecheck.
- `bun run contracts:build` compiles the contract.
- `bun run contracts:test` runs the Foundry tests (install the test helper first with `forge install foundry-rs/forge-std`).
