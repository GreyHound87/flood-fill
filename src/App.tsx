import { useState } from 'react';

type Color = 'red' | 'blue';
type Grid = Color[][];

const SIZE = 10;

function createGrid(): Grid {
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

function opposite(color: Color): Color {
  return color === 'blue' ? 'red' : 'blue';
}

function floodFill(grid: Grid, row: number, col: number): Grid {
  const target = grid[row][col];
  const replacement = opposite(target);
  const next = grid.map((r) => [...r]);

  const queue: [number, number][] = [[row, col]];
  next[row][col] = replacement;

  for (let i = 0; i < queue.length; i++) {
    const [r, c] = queue[i];
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
      queue.push([r, c]);
    });
  }

  return next;
}

export function App() {
  const [grid, setGrid] = useState<Grid>(createGrid);

  return (
    <main>
      {grid.map((row, i) => {
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: key is stable
          <div key={i}>
            {row.map((color, j) => {
              return (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: key is stable
                  key={`${i}-${j}`}
                  onClick={() => setGrid((g) => floodFill(g, i, j))}
                  type='button'
                  style={{ backgroundColor: color }}
                >{`${i}-${j}`}</button>
              );
            })}
          </div>
        );
      })}
    </main>
  );
}
