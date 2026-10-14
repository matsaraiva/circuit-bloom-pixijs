import { describe, expect, it } from 'vitest';
import { applyMove, createGame, nextLevel, resetLevel } from '../src/game';
import { LEVELS } from '../src/levels';
import {
  affectedCells,
  BOARD_SIZE,
  CELL_COUNT,
  isSolved,
  toggleCell,
  type Board,
} from '../src/rules';

describe('board rules', () => {
  it('returns the selected cell and orthogonal neighbors at corners, edges, and center', () => {
    expect(affectedCells(0).sort((a, b) => a - b)).toEqual([0, 1, 4]);
    expect(affectedCells(1).sort((a, b) => a - b)).toEqual([0, 1, 2, 5]);
    expect(affectedCells(5).sort((a, b) => a - b)).toEqual([1, 4, 5, 6, 9]);
    expect(affectedCells(15).sort((a, b) => a - b)).toEqual([11, 14, 15]);
  });

  it('does not wrap neighbors between rows', () => {
    expect(affectedCells(3)).not.toContain(4);
    expect(affectedCells(4)).not.toContain(3);
    expect(affectedCells(7)).not.toContain(8);
    expect(affectedCells(8)).not.toContain(7);
  });

  it('reverses a move when the same cell is toggled twice', () => {
    const board = Array.from({ length: CELL_COUNT }, (_, index) => index % 2 === 0);
    expect(toggleCell(toggleCell(board, 6), 6)).toEqual(board);
  });

  it('preserves its input board and recognizes only all-lit boards as solved', () => {
    const board = Array.from({ length: CELL_COUNT }, (_, index) => index === 3);
    const original = [...board];

    toggleCell(board, 2);
    expect(board).toEqual(original);
    expect(isSolved(Array.from({ length: CELL_COUNT }, () => true))).toBe(true);
    expect(isSolved(board)).toBe(false);
    expect(BOARD_SIZE).toBe(4);
    expect(CELL_COUNT).toBe(16);
  });

  it('rejects invalid indices and boards', () => {
    for (const index of [-1, 1.5, CELL_COUNT]) {
      expect(() => affectedCells(index)).toThrow(RangeError);
    }

    expect(() => toggleCell([true], 0)).toThrow(RangeError);
    expect(() => isSolved(Array.from({ length: CELL_COUNT }, () => 1) as unknown as Board)).toThrow(TypeError);
  });
});

describe('fixed levels', () => {
  it('solves each actual level with its published solution', () => {
    for (const level of LEVELS) {
      const result = level.solution.reduce<Board>(
        (board, index) => toggleCell(board, index),
        level.initialBoard,
      );
      expect(isSolved(result), level.name).toBe(true);
    }
  });

  it('accepts alternate solutions for each actual level', () => {
    for (const level of LEVELS) {
      const knownSolutionMask = level.solution.reduce((mask, index) => mask | (1 << index), 0);
      let alternate: number[] | undefined;
      for (let mask = 0; mask < 1 << CELL_COUNT; mask += 1) {
        if (mask === knownSolutionMask) continue;
        const moves = Array.from({ length: CELL_COUNT }, (_, index) => index)
          .filter((index) => (mask & (1 << index)) !== 0);

        const result = moves.reduce<Board>(
          (board, index) => toggleCell(board, index),
          level.initialBoard,
        );
        if (isSolved(result)) {
          alternate = moves;
          break;
        }
      }

      expect(alternate, level.name).toBeDefined();
      const result = alternate!.reduce<Board>(
        (board, index) => toggleCell(board, index),
        level.initialBoard,
      );
      expect(isSolved(result), level.name).toBe(true);
    }
  });

  it('matches the stated minimum move count from exhaustive board enumeration', () => {
    for (const level of LEVELS) {
      const target = level.initialBoard.reduce((mask, lit, index) => (
        lit ? mask : mask | (1 << index)
      ), 0);
      let minimum = CELL_COUNT + 1;

      for (let moves = 0; moves < 1 << CELL_COUNT; moves += 1) {
        let effect = 0;
        for (let index = 0; index < CELL_COUNT; index += 1) {
          if ((moves & (1 << index)) === 0) continue;
          for (const cell of affectedCells(index)) effect ^= 1 << cell;
        }

        if (effect === target) {
          let count = 0;
          for (let bits = moves; bits !== 0; bits &= bits - 1) count += 1;
          if (count < minimum) minimum = count;
        }
      }

      expect(minimum, level.name).toBe(level.minimumMoves);
    }
    expect(LEVELS.map((level) => level.minimumMoves)).toEqual([2, 3, 4]);
    expect(LEVELS[2].initialBoard.every((cell) => !cell)).toBe(true);
  });
});

describe('game state', () => {
  it('counts moves and wins exactly once, then locks the board', () => {
    const initial = createGame(0);
    let state = initial;
    let winCount = 0;

    for (const index of LEVELS[0].solution) {
      const result = applyMove(state, index);
      state = result.state;
      if (result.didWin) winCount += 1;
    }

    expect(state.status).toBe('won');
    expect(state.moves).toBe(2);
    expect(winCount).toBe(1);

    const locked = applyMove(state, 0);
    expect(locked.didWin).toBe(false);
    expect(locked.affected).toEqual([]);
    expect(locked.state).toBe(state);
    expect(initial.board).toEqual(LEVELS[0].initialBoard);
    expect(initial.moves).toBe(0);
  });

  it('resets to a fresh level state and advances only after a nonfinal win', () => {
    const playing = createGame(1);
    const moved = applyMove(playing, LEVELS[1].solution[0]).state;
    const reset = resetLevel(moved);
    expect(reset).toEqual(createGame(1));
    expect(reset).not.toBe(moved);
    expect(reset.board).not.toBe(moved.board);
    expect(nextLevel(moved)).toBe(moved);

    const won = LEVELS[1].solution.reduce(
      (state, index) => applyMove(state, index).state,
      playing,
    );
    expect(won.status).toBe('won');
    expect(nextLevel(won)).toEqual(createGame(2));
  });

  it('marks the final win complete, locks it, and replays from level one', () => {
    const finalState = LEVELS[2].solution.reduce(
      (state, index) => applyMove(state, index).state,
      createGame(2),
    );
    expect(finalState.status).toBe('complete');
    expect(finalState.moves).toBe(4);
    expect(applyMove(finalState, 3).state).toBe(finalState);
    expect(nextLevel(finalState)).toBe(finalState);

    const replay = createGame();
    expect(replay).toEqual({
      levelIndex: 0,
      board: LEVELS[0].initialBoard,
      moves: 0,
      status: 'playing',
    });
    expect(replay.board).not.toBe(LEVELS[0].initialBoard);
  });
});
