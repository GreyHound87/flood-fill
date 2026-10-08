export type Color = 'red' | 'blue';
export type Grid = Color[][];

export type CellChange = { row: number; col: number; distance: number };

export const SIZE = 10;

export function createGrid(): Grid {
  const grid: Grid = [];

  for (let i = 0; i < SIZE; i++) {
    const row: Color[] = [];

    for (let j = 0; j < SIZE; j++) {
      const color = Math.random() < 0.5 ? 'red' : 'blue';
      row.push(color);
    }

    grid.push(row);
  }

  return grid;
}

export function opposite(color: Color): Color {
  return color === 'blue' ? 'red' : 'blue';
}

export function floodFill(
  grid: Grid,
  row: number,
  col: number,
): { grid: Grid; changed: CellChange[] } {
  const target = grid[row][col];
  const replacement = opposite(target);
  const next = grid.map((r) => [...r]);
  const changed: CellChange[] = [];

  const queue: [number, number, number][] = [[row, col, 0]];
  next[row][col] = replacement;
  changed.push({ row, col, distance: 0 });

  for (let i = 0; i < queue.length; i++) {
    const [r, c, distance] = queue[i];
    const neighbours = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ].filter(([r, c]) => {
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
      return next[r][c] === target;
    });

    neighbours.forEach(([r, c]) => {
      next[r][c] = replacement;
      changed.push({ row: r, col: c, distance: distance + 1 });
      queue.push([r, c, distance + 1]);
    });
  }

  return { grid: next, changed };
}
