export const BOARD_SIZE = 4;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

export type Board = readonly boolean[];

function validateBoard(board: Board): void {
  if (!Array.isArray(board) || board.length !== CELL_COUNT) {
    throw new RangeError(`A board must contain exactly ${CELL_COUNT} cells.`);
  }

  if (board.some((cell) => typeof cell !== 'boolean')) {
    throw new TypeError('Every board cell must be a boolean.');
  }
}

function validateIndex(index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= CELL_COUNT) {
    throw new RangeError(`Cell index must be an integer from 0 to ${CELL_COUNT - 1}.`);
  }
}

/** Returns the selected cell followed by its in-bounds orthogonal neighbors. */
export function affectedCells(index: number): number[] {
  validateIndex(index);

  const row = Math.floor(index / BOARD_SIZE);
  const column = index % BOARD_SIZE;
  const affected = [index];

  if (row > 0) affected.push(index - BOARD_SIZE);
  if (column < BOARD_SIZE - 1) affected.push(index + 1);
  if (row < BOARD_SIZE - 1) affected.push(index + BOARD_SIZE);
  if (column > 0) affected.push(index - 1);

  return affected;
}

/** Returns a new board with the selected cell and its neighbors flipped. */
export function toggleCell(board: Board, index: number): boolean[] {
  validateBoard(board);
  const affected = affectedCells(index);
  const next = [...board];

  for (const cellIndex of affected) {
    next[cellIndex] = !next[cellIndex];
  }

  return next;
}

/** A board is solved when every cell is lit. */
export function isSolved(board: Board): boolean {
  validateBoard(board);
  return board.every(Boolean);
}
