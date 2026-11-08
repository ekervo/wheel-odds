import { parseAbi, type Address } from 'viem'

/**
 * The SqueekCore proxy the live hamster settles into right now.
 * Source: the published deployment record (release core-sepolia-20261103), which matches
 * https://api.squeekchain.com/v1/core (identities.core) and the core's own on-chain
 * configuration. Squeekchain has replaced its core before, and a market is bound to one core for
 * life, so the app checks at runtime that the market reads the core the API reports.
 */
export const LIVE_CORE: Address = '0xfd6c166d4b8e2962e65746a13e5a0797cd4de0c4'

export const coreAbi = parseAbi([
  'struct CoreState { uint64 settledThroughRound; uint64 cumulativeWork; uint96 cumulativeBlockUnits; uint64 blockHeight; uint96 blockProgress; uint32 workPerThousandBlocks; uint256 authorizationNonce; bool paused; }',
  'struct CoreConfiguration { bytes32 streamId; uint64 genesisTimestamp; uint64 roundDuration; uint64 maxWorkPerRound; uint16 maxRoundsPerBatch; address guardian; address reporter; uint32 initialWorkPerThousandBlocks; uint64 targetBlocksPerActiveRound; uint64 difficultySmoothingRounds; uint96 blockUnitsPerBlock; }',
  'struct LedgerPosition { uint64 cumulativeWork; uint96 cumulativeBlockUnits; uint32 workPerThousandBlocks; }',
  'struct RoundCheckpoint { uint64 roundId; uint64 cumulativeWork; uint96 cumulativeBlockUnits; uint32 workPerThousandBlocks; bytes32 dataHash; }',
  'struct RoundPage { uint64 certifiedThroughRound; LedgerPosition start; LedgerPosition end; RoundCheckpoint[] rounds; }',
  'function state() view returns (CoreState)',
  'function configuration() view returns (CoreConfiguration)',
  'function roundPage(uint64 afterRound, uint64 throughRound, uint256 maxRecords) view returns (RoundPage)',
])
