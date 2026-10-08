import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import styles from './Board3D.module.css';
import { type Color, type Grid, SIZE } from './grid.ts';

const CELL = 1;
const GAP = 0.15;
const SPACING = CELL + GAP;
const FOV = 50;

type Board = {
  meshes: THREE.Mesh[][];
  materials: Record<Color, THREE.MeshStandardMaterial>;
};

export function Board3D({ grid }: { grid: Grid }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<Board | null>(null);

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

    const half = ((SIZE - 1) * SPACING) / 2;
    const meshes: THREE.Mesh[][] = [];

    for (let row = 0; row < SIZE; row++) {
      const line: THREE.Mesh[] = [];

      for (let col = 0; col < SIZE; col++) {
        const mesh = new THREE.Mesh(geometry, materials.blue);
        mesh.position.set(col * SPACING - half, 0, row * SPACING - half);
        scene.add(mesh);
        line.push(mesh);
      }

      meshes.push(line);
    }

    boardRef.current = { meshes, materials };

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
      observer.disconnect();
      renderer.setAnimationLoop(null);
      renderer.dispose();
      renderer.domElement.remove();
      geometry.dispose();
      materials.red.dispose();
      materials.blue.dispose();
      boardRef.current = null;
    };
  }, []);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        board.meshes[row][col].material = board.materials[grid[row][col]];
      }
    }
  }, [grid]);

  return <div ref={mountRef} className={styles.board} />;
}
