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

export function App() {
  const [grid /* , setGrid */] = useState<Grid>(createGrid);

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
