// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

struct CoreConfiguration {
    bytes32 streamId;
    uint64 genesisTimestamp;
    uint64 roundDuration;
    uint64 maxWorkPerRound;
    uint16 maxRoundsPerBatch;
    address guardian;
    address reporter;
    uint32 initialWorkPerThousandBlocks;
    uint64 targetBlocksPerActiveRound;
    uint64 difficultySmoothingRounds;
    uint96 blockUnitsPerBlock;
}

struct LedgerPosition {
    uint64 cumulativeWork;
    uint96 cumulativeBlockUnits;
    uint32 workPerThousandBlocks;
}

struct RoundCheckpoint {
    uint64 roundId;
    uint64 cumulativeWork;
    uint96 cumulativeBlockUnits;
    uint32 workPerThousandBlocks;
    bytes32 dataHash;
}

struct RoundPage {
    uint64 certifiedThroughRound;
    LedgerPosition start;
    LedgerPosition end;
    RoundCheckpoint[] rounds;
}

interface ISqueekCore {
    /// @notice Returns the SqueekCore V3 configuration.
    function configuration() external view returns (CoreConfiguration memory);

    /// @notice Returns certified ledger positions and checkpoints for a round interval.
    function roundPage(uint64 afterRound, uint64 throughRound, uint256 maxRecords)
        external view returns (RoundPage memory);
}

/// @title HamsterRoundMarket
/// @notice Native-ETH pari-mutuel markets settled directly from SqueekCore V3.
/// @dev No privileged roles, fees, upgrades, or discretionary settlement.
contract HamsterRoundMarket is ReentrancyGuard {
    uint64 public constant LINE_STEP = 25;
    uint256 public constant MIN_BET = 0.0001 ether;
    uint256 public constant MAX_HORIZON = 144;
    uint256 public constant GRACE = 7 days;

    ISqueekCore public immutable core;
    uint64 public immutable genesisTimestamp;
    uint64 public immutable roundDuration;
    uint64 public immutable maxWorkPerRound;

    struct Market {
        uint128 overPool;
        uint128 underPool;
        bool settled;
        bool voided;
        bool overWon;
        uint64 work;
        uint128 remainingPool;
        uint128 remainingWinStake;
    }

    struct Stake {
        uint128 stakeOver;
        uint128 stakeUnder;
    }

    mapping(uint64 => mapping(uint64 => Market)) private _markets;
    mapping(uint64 => mapping(uint64 => mapping(address => Stake))) private _stakes;

    error ZeroAddress();
    error InvalidRoundDuration();
    error InvalidRound();
    error RoundTooFarAhead();
    error BettingClosed();
    error InvalidLine();
    error BetTooSmall();
    error PoolOverflow();
    error NoBets();
    error AlreadySettled();
    error RoundNotEnded();
    error SettlementExpired();
    error RoundNotSettled();
    error InvalidWork();
    error NothingToClaim();
    error NotSettled();
    error TransferFailed();

    event BetPlaced(uint64 indexed round, uint64 indexed line, address indexed user, bool over, uint256 amount);
    event Settled(uint64 indexed round, uint64 indexed line, uint64 work, bool overWon, bool voided);
    event Claimed(uint64 indexed round, uint64 indexed line, address indexed user, uint256 payout);

    /// @notice Binds the market to a core and snapshots its round configuration once.
    /// @param core_ Address of the existing SqueekCore V3 proxy.
    constructor(address core_) {
        if (core_ == address(0)) revert ZeroAddress();
        ISqueekCore coreContract = ISqueekCore(core_);
        CoreConfiguration memory config = coreContract.configuration();
        if (config.roundDuration == 0) revert InvalidRoundDuration();
        core = coreContract;
        genesisTimestamp = config.genesisTimestamp;
        roundDuration = config.roundDuration;
        maxWorkPerRound = config.maxWorkPerRound;
    }

    /// @notice Returns zero before genesis, otherwise the current one-indexed round.
    function currentRound() public view returns (uint256) {
        if (block.timestamp < genesisTimestamp) return 0;
        return (block.timestamp - genesisTimestamp) / roundDuration + 1;
    }

    /// @notice Returns the inclusive start timestamp of a one-indexed round.
    function roundStart(uint64 round) public view returns (uint256) {
        if (round == 0) revert InvalidRound();
        return uint256(genesisTimestamp) + uint256(round - 1) * roundDuration;
    }

    /// @notice Returns the exclusive end timestamp of a one-indexed round.
    function roundEnd(uint64 round) public view returns (uint256) {
        if (round == 0) revert InvalidRound();
        return uint256(genesisTimestamp) + uint256(round) * roundDuration;
    }

    /// @notice Adds ETH to either side before the target round starts.
    /// @dev Both sides may be held by one user. Total market ETH is bounded to uint128.
    function bet(uint64 round, uint64 line, bool over) external payable nonReentrant {
        if (round == 0) revert InvalidRound();
        if (uint256(round) > currentRound() + MAX_HORIZON) revert RoundTooFarAhead();
        if (block.timestamp >= roundStart(round)) revert BettingClosed();
        if (line % LINE_STEP != 0 || line > maxWorkPerRound) revert InvalidLine();
        if (msg.value < MIN_BET) revert BetTooSmall();

        Market storage market = _markets[round][line];
        uint256 total = uint256(market.overPool) + market.underPool;
        if (msg.value > type(uint128).max - total) revert PoolOverflow();
        uint128 amount = uint128(msg.value);
        Stake storage stake = _stakes[round][line][msg.sender];
        if (over) {
            market.overPool += amount;
            stake.stakeOver += amount;
        } else {
            market.underPool += amount;
            stake.stakeUnder += amount;
        }
        emit BetPlaced(round, line, msg.sender, over, msg.value);
    }

    /// @notice Permissionlessly settles a market during its grace period using certified work.
    /// @dev Unknown rounds revert; a certified zero-work round is a valid Under outcome.
    function settle(uint64 round, uint64 line) external nonReentrant {
        Market storage market = _markets[round][line];
        if (market.overPool == 0 && market.underPool == 0) revert NoBets();
        if (market.settled) revert AlreadySettled();
        uint256 end = roundEnd(round);
        if (block.timestamp < end) revert RoundNotEnded();
        if (block.timestamp > end + GRACE) revert SettlementExpired();

        RoundPage memory page = core.roundPage(round - 1, round, 1);
        if (page.certifiedThroughRound != round) revert RoundNotSettled();
        if (page.end.cumulativeWork < page.start.cumulativeWork) revert InvalidWork();
        uint64 work = page.end.cumulativeWork - page.start.cumulativeWork;
        bool overWon = work > line;
        uint128 winningPool = overWon ? market.overPool : market.underPool;

        market.settled = true;
        market.voided = winningPool == 0;
        market.overWon = overWon;
        market.work = work;
        if (winningPool != 0) {
            market.remainingPool = market.overPool + market.underPool;
            market.remainingWinStake = winningPool;
        }
        emit Settled(round, line, work, overWon, market.voided);
    }

    /// @notice Pays winnings, or refunds both stakes for a voided or expired unsettled market.
    /// @dev Remaining-pool accounting gives the last winner the exact remainder.
    /// @return payout ETH sent to the caller; failed transfers revert all accounting changes.
    function claim(uint64 round, uint64 line) external nonReentrant returns (uint256 payout) {
        Market storage market = _markets[round][line];
        Stake storage stake = _stakes[round][line][msg.sender];
        if (market.settled && !market.voided) {
            uint128 winningStake = market.overWon ? stake.stakeOver : stake.stakeUnder;
            if (winningStake == 0) revert NothingToClaim();
            payout = uint256(market.remainingPool) * winningStake / market.remainingWinStake;
            market.remainingWinStake -= winningStake;
            market.remainingPool -= uint128(payout);
        } else {
            if (!market.settled && block.timestamp <= roundEnd(round) + GRACE) revert NotSettled();
            payout = uint256(stake.stakeOver) + stake.stakeUnder;
            if (payout == 0) revert NothingToClaim();
        }

        stake.stakeOver = 0;
        stake.stakeUnder = 0;
        (bool success,) = payable(msg.sender).call{value: payout}("");
        if (!success) revert TransferFailed();
        emit Claimed(round, line, msg.sender, payout);
    }

    /// @notice Returns market pools, status, certified work, and remaining payout accounting.
    /// @dev `voided` denotes the void/refund status; original pools remain historical totals.
    function getMarket(uint64 round, uint64 line) external view returns (Market memory) {
        return _markets[round][line];
    }

    /// @notice Returns a user's currently unclaimed Over and Under stakes.
    function stakeOf(uint64 round, uint64 line, address user) external view returns (uint256 over, uint256 under) {
        Stake storage stake = _stakes[round][line][user];
        return (stake.stakeOver, stake.stakeUnder);
    }

    /// @notice Returns the currently claimable ETH amount, or zero when not claimable.
    /// @dev Does not query core or revert for invalid market keys; rounding depends on claim order.
    function claimable(uint64 round, uint64 line, address user) external view returns (uint256) {
        if (round == 0) return 0;
        Market storage market = _markets[round][line];
        Stake storage stake = _stakes[round][line][user];
        if (market.settled && !market.voided) {
            uint128 winningStake = market.overWon ? stake.stakeOver : stake.stakeUnder;
            if (winningStake == 0 || market.remainingWinStake == 0) return 0;
            // Both factors are uint128, so their product always fits uint256.
            return uint256(market.remainingPool) * winningStake / market.remainingWinStake;
        }
        if (market.settled || block.timestamp > roundEnd(round) + GRACE) {
            return uint256(stake.stakeOver) + stake.stakeUnder;
        }
        return 0;
    }
}
