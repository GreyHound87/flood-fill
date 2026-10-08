import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import styles from './Board3D.module.css';
import { type Color, type Grid, SIZE } from './grid.ts';

const CELL = 1;
const GAP = 0.15;
const SPACING = CELL + GAP;
const FOV = 50;
const HOVER_THROTTLE_MS = 50;

type Cell = { row: number; col: number };

type Board = {
  meshes: THREE.Mesh[][];
  colors: Color[][];
  materials: Record<Color, THREE.MeshStandardMaterial>;
  hoverMaterials: Record<Color, THREE.MeshStandardMaterial>;
};

export function Board3D({
  grid,
  onCellClick,
}: {
  grid: Grid;
  onCellClick: (row: number, col: number) => void;
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

    const geometry = new THREE.BoxGeometry(CELL, CELL, CELL);
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
    const meshes: THREE.Mesh[][] = [];
    const colors: Color[][] = [];
    const clickables: THREE.Mesh[] = [];

    for (let row = 0; row < SIZE; row++) {
      const line: THREE.Mesh[] = [];
      const colorRow: Color[] = [];

      for (let col = 0; col < SIZE; col++) {
        const mesh = new THREE.Mesh(geometry, materials.blue);
        mesh.position.set(col * SPACING - half, 0, row * SPACING - half);
        scene.add(mesh);
        line.push(mesh);
        clickables.push(mesh);
        colorRow.push('blue');
      }

      meshes.push(line);
      colors.push(colorRow);
    }

    boardRef.current = { meshes, colors, materials, hoverMaterials };

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

    const setHover = (cell: Cell | null) => {
      const prev = hoverRef.current;
      if (prev?.row === cell?.row && prev?.col === cell?.col) return;

      if (prev) {
        meshes[prev.row][prev.col].material =
          materials[colors[prev.row][prev.col]];
      }
      if (cell) {
        meshes[cell.row][cell.col].material =
          hoverMaterials[colors[cell.row][cell.col]];
      }
      hoverRef.current = cell;
      renderer.domElement.style.cursor = cell ? 'pointer' : 'default';
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
      onCellClickRef.current(row, col);
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
      geometry.dispose();
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

    const hovered = hoverRef.current;

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        board.colors[row][col] = grid[row][col];
        board.meshes[row][col].material =
          hovered?.row === row && hovered?.col === col
            ? board.hoverMaterials[grid[row][col]]
            : board.materials[grid[row][col]];
      }
    }
  }, [grid]);

  return <div ref={mountRef} className={styles.board} />;
}
