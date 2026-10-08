import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import styles from './Board3D.module.css';
import { type CellChange, type Grid, SIZE } from './grid.ts';

const CELL = 1;
const GAP = 0.15;
const SPACING = CELL + GAP;
const FOV = 50;
const HOVER_THROTTLE_MS = 50;
const FLIP_DURATION_MS = 250;
const STAGGER_MS = 40;
const HALF_TURN = Math.PI;

type Cell = { row: number; col: number };

type Tile = { group: THREE.Group; halves: [THREE.Mesh, THREE.Mesh] };

type Flip = { fromRotation: number; startAt: number };

type Board = {
  tiles: Tile[][];
  flips: Map<THREE.Group, Flip>;
};

const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;

const flipTarget = (flip: Flip) =>
  (flip.fromRotation + HALF_TURN) % (HALF_TURN * 2);

export function Board3D({
  grid,
  onCellClick,
}: {
  grid: Grid;
  onCellClick: (row: number, col: number) => CellChange[];
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<Board | null>(null);
  const hoverRef = useRef<Cell | null>(null);
  const onCellClickRef = useRef(onCellClick);

  useEffect(() => {
    onCellClickRef.current = onCellClick;
  }, [onCellClick]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#000');

    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(6, 12, 4);
    scene.add(sun);

    const halfBox = new THREE.BoxGeometry(CELL, CELL / 2, CELL);
    const materials = {
      red: new THREE.MeshStandardMaterial({ color: '#ff453a' }),
      blue: new THREE.MeshStandardMaterial({ color: '#0a84ff' }),
    };
    const hoverMaterials = {
      red: new THREE.MeshStandardMaterial({
        color: '#ff453a',
        emissive: '#ff453a',
        emissiveIntensity: 0.35,
      }),
      blue: new THREE.MeshStandardMaterial({
        color: '#0a84ff',
        emissive: '#0a84ff',
        emissiveIntensity: 0.35,
      }),
    };

    const half = ((SIZE - 1) * SPACING) / 2;
    const tiles: Tile[][] = [];
    const clickables: THREE.Group[] = [];

    for (let row = 0; row < SIZE; row++) {
      const tileRow: Tile[] = [];

      for (let col = 0; col < SIZE; col++) {
        const top = new THREE.Mesh(halfBox, materials.red);
        top.position.y = CELL / 4;
        const bottom = new THREE.Mesh(halfBox, materials.blue);
        bottom.position.y = -CELL / 4;

        const group = new THREE.Group();
        group.add(top, bottom);
        group.position.set(col * SPACING - half, 0, row * SPACING - half);
        scene.add(group);

        tileRow.push({ group, halves: [top, bottom] });
        clickables.push(group);
      }

      tiles.push(tileRow);
    }

    const flips = new Map<THREE.Group, Flip>();

    boardRef.current = { tiles, flips };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const castAt = (event: { clientX: number; clientY: number }) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(clickables).at(0);
    };

    const cellAt = (point: THREE.Vector3): Cell => ({
      row: Math.round((point.z + half) / SPACING),
      col: Math.round((point.x + half) / SPACING),
    });

    const applyGlow = (tile: Tile, hovered: boolean) => {
      const [top, bottom] = tile.halves;
      top.material = hovered ? hoverMaterials.red : materials.red;
      bottom.material = hovered ? hoverMaterials.blue : materials.blue;
    };

    const setHover = (cell: Cell | null) => {
      const prev = hoverRef.current;
      if (prev?.row === cell?.row && prev?.col === cell?.col) return;

      hoverRef.current = cell;

      if (prev) applyGlow(tiles[prev.row][prev.col], false);
      if (cell) applyGlow(tiles[cell.row][cell.col], true);
      renderer.domElement.style.cursor = cell ? 'pointer' : 'default';
    };

    const startWave = (changed: CellChange[]) => {
      const now = performance.now();

      for (const { row, col, distance } of changed) {
        const group = tiles[row][col].group;
        const pending = flips.get(group);
        if (pending) {
          group.rotation.x = flipTarget(pending);
          flips.delete(group);
        }
        flips.set(group, {
          fromRotation: group.rotation.x,
          startAt: now + distance * STAGGER_MS,
        });
      }
    };

    let lastHoverCheck = 0;

    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < HOVER_THROTTLE_MS) return;
      lastHoverCheck = now;

      const hit = castAt(event);
      setHover(hit ? cellAt(hit.point) : null);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;

      const hit = castAt(event);
      if (!hit) return;

      const { row, col } = cellAt(hit.point);
      startWave(onCellClickRef.current(row, col));
    };

    const onPointerLeave = () => setHover(null);

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      const halfSpan = ((SIZE - 1) * SPACING + CELL) / 2;
      const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
      const nearOffset = (halfSpan - CELL / 2) / Math.SQRT2;
      const vertical =
        (halfSpan + CELL / 2) / tanHalfFov / Math.SQRT2 + nearOffset;
      const horizontal = halfSpan / tanHalfFov / camera.aspect + nearOffset;
      const distance = Math.max(vertical, horizontal) * 1.15;
      camera.position.set(0, distance * Math.SQRT1_2, distance * Math.SQRT1_2);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    renderer.setAnimationLoop(() => {
      const now = performance.now();

      for (const [group, flip] of flips) {
        const p = (now - flip.startAt) / FLIP_DURATION_MS;
        if (p <= 0) continue;

        if (p >= 1) {
          group.rotation.x = flipTarget(flip);
          flips.delete(group);
          continue;
        }

        group.rotation.x = flip.fromRotation + easeOutCubic(p) * HALF_TURN;
      }

      renderer.render(scene, camera);
    });

    return () => {
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      observer.disconnect();
      renderer.setAnimationLoop(null);
      renderer.dispose();
      renderer.domElement.remove();
      halfBox.dispose();
      materials.red.dispose();
      materials.blue.dispose();
      hoverMaterials.red.dispose();
      hoverMaterials.blue.dispose();
      boardRef.current = null;
      hoverRef.current = null;
    };
  }, []);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const tile = board.tiles[row][col];
        const targetRotation = grid[row][col] === 'red' ? 0 : HALF_TURN;
        const flip = board.flips.get(tile.group);
        if (flip && flipTarget(flip) !== targetRotation) {
          board.flips.delete(tile.group);
        }
        if (!board.flips.has(tile.group)) {
          tile.group.rotation.x = targetRotation;
        }
      }
    }
  }, [grid]);

  return <div ref={mountRef} className={styles.board} />;
}
