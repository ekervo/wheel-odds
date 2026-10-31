import { parseAbi, type Address } from 'viem'

/**
 * The SqueekCore proxy that the live hamster settles into right now.
 * Source: https://api.squeekchain.com/v1/core (identities.core). The core in the
 * published deployment record (0x74665d...) stopped receiving settlements, so the
 * app checks at runtime that the market is bound to the core the live API reports.
 */
export const LIVE_CORE: Address = '0x980b4424c007caf7a1f3670b48c8eaef7ebc3d44'

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
