import { useState } from 'react';
import styles from './App.module.css';
import { Board3D } from './Board3D.tsx';
import { createGrid, floodFill, type Grid } from './grid.ts';

export function App() {
  const [grid, setGrid] = useState<Grid>(createGrid);

  return (
    <main className={styles.app}>
      <button type='button' onClick={() => setGrid(createGrid())}>
        reset
      </button>
      <Board3D
        grid={grid}
        onCellClick={(row, col) => {
          const { grid: next, changed } = floodFill(grid, row, col);
          setGrid(next);
          return changed;
        }}
      />
    </main>
  );
}
