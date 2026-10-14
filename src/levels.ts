import { CELL_COUNT, type Board, toggleCell } from './rules';

function createInitialBoard(solution: readonly number[]): Board {
  let board: Board = Array.from({ length: CELL_COUNT }, () => true);

  for (const index of solution) {
    board = toggleCell(board, index);
  }

  return Object.freeze([...board]);
}

export const LEVELS: readonly {
  name: string;
  minimumMoves: number;
  initialBoard: Board;
  solution: readonly number[];
}[] = Object.freeze([
  {
    name: 'First light',
    minimumMoves: 2,
    initialBoard: createInitialBoard([5, 10]),
    solution: Object.freeze([5, 10]),
  },
  {
    name: 'Entangled',
    minimumMoves: 3,
    initialBoard: createInitialBoard([0, 6, 15]),
    solution: Object.freeze([0, 6, 15]),
  },
  {
    name: 'Full bloom',
    minimumMoves: 4,
    initialBoard: createInitialBoard([1, 7, 8, 14]),
    solution: Object.freeze([1, 7, 8, 14]),
  },
].map((level) => Object.freeze(level)));
