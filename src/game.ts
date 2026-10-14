import { LEVELS } from './levels';
import { affectedCells, isSolved, toggleCell, type Board } from './rules';

export type GameState = {
  levelIndex: number;
  board: Board;
  moves: number;
  status: 'playing' | 'won' | 'complete';
};

function validateLevelIndex(levelIndex: number): void {
  if (!Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex >= LEVELS.length) {
    throw new RangeError(`Level index must be an integer from 0 to ${LEVELS.length - 1}.`);
  }
}

export function createGame(levelIndex = 0): GameState {
  validateLevelIndex(levelIndex);
  const level = LEVELS[levelIndex];

  return {
    levelIndex,
    board: [...level.initialBoard],
    moves: 0,
    status: 'playing',
  };
}

export function applyMove(
  state: GameState,
  index: number,
): { state: GameState; didWin: boolean; affected: number[] } {
  const cells = affectedCells(index);

  if (state.status !== 'playing') {
    return { state, didWin: false, affected: [] };
  }

  const board = toggleCell(state.board, index);
  const solved = isSolved(board);
  const finalLevel = state.levelIndex === LEVELS.length - 1;
  const nextState: GameState = {
    ...state,
    board,
    moves: state.moves + 1,
    status: solved ? (finalLevel ? 'complete' : 'won') : 'playing',
  };

  return { state: nextState, didWin: solved, affected: cells };
}

export function resetLevel(state: GameState): GameState {
  return createGame(state.levelIndex);
}

export function nextLevel(state: GameState): GameState {
  if (state.status !== 'won' || state.levelIndex >= LEVELS.length - 1) {
    return state;
  }

  return createGame(state.levelIndex + 1);
}
