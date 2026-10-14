import { Application, Container, Graphics, Rectangle } from 'pixi.js';
import { affectedCells, BOARD_SIZE, type Board } from './rules';

export const BOARD_VIEW_SIZE = 560;
export const GRID_ORIGIN = 48;
export const CELL_STEP = 116;

export type BoardView = {
  setState(board: Board, animate?: boolean): void;
  setInteractive(enabled: boolean): void;
  setFocus(index: number | null): void;
  celebrate(): void;
  destroy(): void;
};

type CellVisual = {
  root: Container;
  openPlant: Container;
  closedBud: Container;
  neighborOutline: Graphics;
  focusOutline: Graphics;
  current: number;
  target: number;
  velocity: number;
  pulse: number;
};

type Sparkle = { graphic: Graphics; angle: number };

const TILE_HALF = 52;
const PALETTES = [
  { petal: 0x83edcf, edge: 0xc2ffe9 },
  { petal: 0xc3a8ff, edge: 0xeadfff },
  { petal: 0xffbf91, edge: 0xffe3c8 },
];
const GOLD = 0xf4cf83;
const MINT = 0x69d9bd;

function makeTile(index: number): Container {
  const tile = new Container();
  const bed = new Graphics();
  const tint = index % 3 === 1 ? 0x102a28 : 0x0f2725;
  bed.roundRect(-TILE_HALF, -TILE_HALF, TILE_HALF * 2, TILE_HALF * 2, 15)
    .fill({ color: tint, alpha: 0.98 })
    .stroke({ color: 0x24534b, alpha: 0.9, width: 1 });

  // Fine traces and junctions keep the beds connected to the circuit motif.
  const trace = new Graphics();
  trace.moveTo(-42, 38).lineTo(-31, 38).lineTo(-25, 32).lineTo(-17, 32)
    .stroke({ color: 0x397569, alpha: 0.38, width: 1 });
  trace.circle(-42, 38, 1.8).fill({ color: 0x68bca5, alpha: 0.55 });
  trace.moveTo(42, -38).lineTo(32, -38).lineTo(26, -32).lineTo(18, -32)
    .stroke({ color: 0x397569, alpha: 0.32, width: 1 });
  trace.circle(42, -38, 1.6).fill({ color: 0x68bca5, alpha: 0.48 });

  if (index % 2 === 0) {
    trace.moveTo(-42, -24).lineTo(-34, -24).lineTo(-29, -19)
      .stroke({ color: 0x397569, alpha: 0.22, width: 0.8 });
  } else {
    trace.moveTo(42, 24).lineTo(34, 24).lineTo(29, 19)
      .stroke({ color: 0x397569, alpha: 0.22, width: 0.8 });
  }
  tile.addChild(bed, trace);
  return tile;
}

function makeIntercellTraces(): Graphics {
  const traces = new Graphics();
  const firstCenter = GRID_ORIGIN + CELL_STEP / 2;
  const traceStyle = { color: 0x4c9788, alpha: 0.42, width: 1.15 };

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const y = firstCenter + row * CELL_STEP;
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      const x = firstCenter + column * CELL_STEP;

      if (column < BOARD_SIZE - 1) {
        const gapStart = x + TILE_HALF + 0.5;
        const gapEnd = x + CELL_STEP - TILE_HALF - 0.5;
        const middle = (gapStart + gapEnd) / 2;
        traces.moveTo(gapStart, y).lineTo(middle - 2, y).lineTo(middle, y - 2)
          .lineTo(middle + 2, y).lineTo(gapEnd, y).stroke(traceStyle);
        traces.circle(middle, y - 2, 1.45).fill({ color: 0x80cdb3, alpha: 0.62 });
      }

      if (row < BOARD_SIZE - 1) {
        const gapStart = y + TILE_HALF + 0.5;
        const gapEnd = y + CELL_STEP - TILE_HALF - 0.5;
        const middle = (gapStart + gapEnd) / 2;
        traces.moveTo(x, gapStart).lineTo(x, middle - 2).lineTo(x + 2, middle)
          .lineTo(x, middle + 2).lineTo(x, gapEnd).stroke(traceStyle);
        traces.circle(x + 2, middle, 1.45).fill({ color: 0x80cdb3, alpha: 0.62 });
      }
    }
  }

  return traces;
}

function makeLeaf(x: number, y: number, rotation: number, color: number, alpha: number): Graphics {
  const leaf = new Graphics();
  leaf.ellipse(x, y, 6, 12).fill({ color, alpha }).stroke({ color: 0x9be5c7, alpha: alpha * 0.45, width: 0.75 });
  leaf.rotation = rotation;
  return leaf;
}

function makeOpenPlant(index: number): Container {
  const plant = new Container();
  const palette = PALETTES[index % PALETTES.length];
  const foliage = new Graphics();
  foliage.moveTo(0, 32).bezierCurveTo(0, 23, 1, 14, 0, 5)
    .stroke({ color: 0x73c99f, alpha: 0.88, width: 2, cap: 'round' });
  plant.addChild(foliage);
  plant.addChild(makeLeaf(-9, 22, -0.86, 0x4d9a76, 0.82));
  plant.addChild(makeLeaf(9, 15, 0.86, 0x5cab83, 0.78));

  const bloom = new Container();
  bloom.position.set(0, -5);
  for (let petal = 0; petal < 8; petal += 1) {
    const shape = new Graphics();
    shape.ellipse(0, -14, 9, 15)
      .fill({ color: palette.petal, alpha: 0.9 })
      .stroke({ color: palette.edge, alpha: 0.78, width: 0.9 });
    shape.rotation = (Math.PI * 2 * petal) / 8;
    bloom.addChild(shape);
  }
  const core = new Graphics();
  core.circle(0, 0, 7.2).fill({ color: GOLD }).stroke({ color: 0xffe9b0, alpha: 0.85, width: 1 });
  core.circle(-1.6, -1.8, 1.6).fill({ color: 0xfff1ca, alpha: 0.9 });
  bloom.addChild(core);
  plant.addChild(bloom);
  return plant;
}

function makeClosedBud(index: number): Container {
  const plant = new Container();
  const stem = new Graphics();
  stem.moveTo(0, 32).bezierCurveTo(0, 23, 0, 15, 0, 7)
    .stroke({ color: 0x4e9b78, alpha: 0.7, width: 1.8, cap: 'round' });
  plant.addChild(stem);
  plant.addChild(makeLeaf(-8, 22, -0.82, 0x3b795e, 0.72));
  plant.addChild(makeLeaf(8, 16, 0.82, 0x498a68, 0.68));

  const bud = new Graphics();
  const budColor = index % 3 === 1 ? 0x45516b : 0x345d52;
  bud.roundRect(-7.5, -13, 15, 23, 7.5)
    .fill({ color: budColor, alpha: 0.95 })
    .stroke({ color: 0x709887, alpha: 0.68, width: 1 });
  bud.moveTo(0, -13).lineTo(-4, -8).lineTo(0, -5).lineTo(4, -8).closePath()
    .fill({ color: index % 3 === 1 ? 0x736a8a : 0x668c70, alpha: 0.86 });
  bud.ellipse(-2.5, -7, 1.4, 3).fill({ color: 0xe1edce, alpha: 0.28 });
  plant.addChild(bud);
  return plant;
}

function makeOutline(color: number, width: number, alpha: number): Graphics {
  const outline = new Graphics();
  outline.roundRect(-TILE_HALF + 1, -TILE_HALF + 1, TILE_HALF * 2 - 2, TILE_HALF * 2 - 2, 14)
    .stroke({ color, width, alpha });
  return outline;
}

function validateBoard(board: Board): void {
  if (!Array.isArray(board) || board.length !== BOARD_SIZE * BOARD_SIZE || board.some((cell) => typeof cell !== 'boolean')) {
    throw new RangeError(`A board must contain ${BOARD_SIZE * BOARD_SIZE} boolean cells.`);
  }
}

export async function createBoard(
  host: HTMLElement,
  onSelect: (index: number) => void,
  initialBoard: Board,
): Promise<BoardView> {
  validateBoard(initialBoard);

  const app = new Application();
  await app.init({
    width: BOARD_VIEW_SIZE,
    height: BOARD_VIEW_SIZE,
    antialias: true,
    autoDensity: true,
    backgroundAlpha: 0,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    preference: 'webgl',
  });

  app.canvas.style.display = 'block';
  app.canvas.style.touchAction = 'manipulation';
  app.canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(app.canvas);

  const stage = app.stage;
  const scene = new Container();
  const cells: CellVisual[] = [];
  const root = new Container();
  root.addChild(scene);
  stage.addChild(root);
  scene.addChild(makeIntercellTraces());

  const sparkleColors = [GOLD, 0xa9f2da, 0xc7b2ff, 0xffc794];
  const rings: Graphics[] = [];
  for (let ringIndex = 0; ringIndex < 3; ringIndex += 1) {
    const ring = new Graphics();
    ring.circle(0, 0, 64).stroke({ color: sparkleColors[ringIndex], width: 0.9, alpha: 0.9 });
    ring.position.set(BOARD_VIEW_SIZE / 2, BOARD_VIEW_SIZE / 2);
    ring.alpha = 0;
    scene.addChild(ring);
    rings.push(ring);
  }

  const sparkles: Sparkle[] = [];
  for (let i = 0; i < 12; i += 1) {
    const graphic = new Graphics();
    graphic.circle(0, 0, i % 3 === 0 ? 2.6 : 1.8).fill({ color: sparkleColors[i % sparkleColors.length] });
    graphic.alpha = 0;
    scene.addChild(graphic);
    sparkles.push({ graphic, angle: (Math.PI * 2 * i) / 12 });
  }

  for (let index = 0; index < BOARD_SIZE * BOARD_SIZE; index += 1) {
    const row = Math.floor(index / BOARD_SIZE);
    const column = index % BOARD_SIZE;
    const cell = new Container();
    cell.position.set(GRID_ORIGIN + (column + 0.5) * CELL_STEP, GRID_ORIGIN + (row + 0.5) * CELL_STEP);
    cell.hitArea = new Rectangle(-58, -58, 116, 116);
    cell.eventMode = 'static';
    cell.cursor = 'pointer';
    cell.addChild(makeTile(index));

    const closedBud = makeClosedBud(index);
    const openPlant = makeOpenPlant(index);
    closedBud.alpha = initialBoard[index] ? 0 : 1;
    openPlant.alpha = initialBoard[index] ? 1 : 0;
    cell.addChild(closedBud, openPlant);

    const neighborOutline = makeOutline(MINT, 1.4, 0.54);
    const focusOutline = makeOutline(GOLD, 2, 0.92);
    neighborOutline.alpha = 0;
    focusOutline.alpha = 0;
    cell.addChild(neighborOutline, focusOutline);

    const visual: CellVisual = {
      root: cell,
      openPlant,
      closedBud,
      neighborOutline,
      focusOutline,
      current: initialBoard[index] ? 1 : 0,
      target: initialBoard[index] ? 1 : 0,
      velocity: 0,
      pulse: 0,
    };
    cells.push(visual);
    scene.addChild(cell);
  }

  scene.addChild(...rings, ...sparkles.map(({ graphic }) => graphic));

  let isInteractive = true;
  let hoverIndex: number | null = null;
  let focusIndex: number | null = null;
  let celebrationTime = -1;
  let destroyed = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const refreshHighlights = (): void => {
    for (const cell of cells) {
      cell.neighborOutline.alpha = 0;
      cell.focusOutline.alpha = 0;
    }
    if (!isInteractive) return;
    const index = hoverIndex ?? focusIndex;
    if (index === null) return;
    for (const affected of affectedCells(index)) {
      if (affected === index) cells[affected].focusOutline.alpha = 1;
      else cells[affected].neighborOutline.alpha = 1;
    }
  };

  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index].root;
    cell.on('pointertap', () => {
      if (isInteractive) onSelect(index);
    });
    cell.on('pointerover', (event) => {
      if (isInteractive && event.pointerType === 'mouse') {
        hoverIndex = index;
        refreshHighlights();
      }
    });
    cell.on('pointerout', (event) => {
      if (event.pointerType === 'mouse' && hoverIndex === index) {
        hoverIndex = null;
        refreshHighlights();
      }
    });
  }

  const setInteractive = (enabled: boolean): void => {
    isInteractive = enabled;
    if (!enabled) hoverIndex = null;
    for (const visual of cells) {
      visual.root.eventMode = enabled ? 'static' : 'none';
      visual.root.cursor = enabled ? 'pointer' : 'default';
    }
    refreshHighlights();
  };

  const stopCelebration = (): void => {
    celebrationTime = -1;
    for (const ring of rings) ring.alpha = 0;
    for (const sparkle of sparkles) sparkle.graphic.alpha = 0;
  };

  const snapToTargets = (): void => {
    for (const cell of cells) {
      cell.current = cell.target;
      cell.velocity = 0;
      cell.pulse = 0;
      cell.openPlant.alpha = cell.current;
      cell.closedBud.alpha = 1 - cell.current;
      cell.openPlant.scale.set(1);
      cell.closedBud.scale.set(1);
    }
    stopCelebration();
  };

  const onMotionPreferenceChange = (): void => {
    if (reducedMotion.matches) snapToTargets();
  };

  reducedMotion.addEventListener('change', onMotionPreferenceChange);

  const resizeScene = (width: number, height: number): void => {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    app.renderer.resize(safeWidth, safeHeight);
    const squareSize = Math.min(safeWidth, safeHeight);
    const scale = squareSize / BOARD_VIEW_SIZE;
    root.scale.set(scale);
    root.position.set((safeWidth - squareSize) / 2, (safeHeight - squareSize) / 2);
  };

  const initialBounds = host.getBoundingClientRect();
  resizeScene(initialBounds.width || BOARD_VIEW_SIZE, initialBounds.height || initialBounds.width || BOARD_VIEW_SIZE);
  const resizeObserver = new ResizeObserver((entries) => {
    const bounds = entries[0]?.contentRect;
    if (bounds) resizeScene(bounds.width, bounds.height);
  });
  resizeObserver.observe(host);

  const updateVisuals = (deltaMs: number): void => {
    const dt = Math.min(deltaMs, 50) / 1000;
    const frequency = 19;
    const damping = 0.86;
    let celebrationPulse = 0;

    if (celebrationTime >= 0) {
      celebrationTime += deltaMs;
      const phase = Math.min(1, celebrationTime / 960);
      celebrationPulse = Math.sin(Math.PI * phase) * (1 - phase * 0.35);
      for (let i = 0; i < rings.length; i += 1) {
        const start = i * 0.13;
        const local = Math.max(0, Math.min(1, (phase - start) / (1 - start)));
        rings[i].scale.set(0.4 + local * 2.6);
        rings[i].alpha = phase < start ? 0 : (1 - local) * 0.58;
      }
      for (let i = 0; i < sparkles.length; i += 1) {
        const sparkle = sparkles[i];
        const local = Math.max(0, Math.min(1, (phase - 0.08) / 0.78));
        const radius = 38 + local * (i % 2 === 0 ? 102 : 72);
        sparkle.graphic.position.set(
          BOARD_VIEW_SIZE / 2 + Math.cos(sparkle.angle) * radius,
          BOARD_VIEW_SIZE / 2 + Math.sin(sparkle.angle) * radius,
        );
        sparkle.graphic.alpha = phase < 0.08 || phase > 0.95 ? 0 : Math.sin(Math.PI * local) * 0.9;
      }
      if (phase >= 1) {
        celebrationTime = -1;
        for (const ring of rings) ring.alpha = 0;
        for (const sparkle of sparkles) sparkle.graphic.alpha = 0;
      }
    }

    for (const cell of cells) {
      if (reducedMotion.matches) {
        cell.current = cell.target;
        cell.velocity = 0;
      } else {
        const acceleration = (cell.target - cell.current) * frequency * frequency
          - 2 * damping * frequency * cell.velocity;
        cell.velocity += acceleration * dt;
        const previousDistance = cell.target - cell.current;
        cell.current += cell.velocity * dt;
        if (previousDistance === 0 || (cell.target - cell.current) * previousDistance <= 0) {
          cell.current = cell.target;
          cell.velocity = 0;
        } else if (Math.abs(cell.target - cell.current) < 0.001 && Math.abs(cell.velocity) < 0.02) {
          cell.current = cell.target;
          cell.velocity = 0;
        }
      }
      cell.pulse = Math.max(0, cell.pulse - dt * 2.8);
      const scale = 1 + cell.pulse * 0.1 + celebrationPulse * 0.08;
      cell.openPlant.alpha = cell.current;
      cell.closedBud.alpha = 1 - cell.current;
      cell.openPlant.scale.set(scale);
      cell.closedBud.scale.set(scale);
    }
  };

  const tickerUpdate = (): void => updateVisuals(app.ticker.deltaMS);
  app.ticker.minFPS = 30;
  app.ticker.add(tickerUpdate);

  const onVisibilityChange = (): void => {
    if (document.hidden) app.ticker.stop();
    else app.ticker.start();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  if (document.hidden) app.ticker.stop();

  return {
    setState(board, animate = true) {
      validateBoard(board);
      if (!animate) stopCelebration();
      for (let index = 0; index < cells.length; index += 1) {
        const visual = cells[index];
        const target = board[index] ? 1 : 0;
        if (visual.target !== target) visual.pulse = 1;
        visual.target = target;
        if (!animate || reducedMotion.matches) {
          visual.current = target;
          visual.velocity = 0;
          visual.pulse = 0;
          visual.openPlant.alpha = target;
          visual.closedBud.alpha = 1 - target;
          visual.openPlant.scale.set(1);
          visual.closedBud.scale.set(1);
        }
      }
    },
    setInteractive,
    setFocus(index) {
      if (index !== null && (!Number.isInteger(index) || index < 0 || index >= cells.length)) {
        throw new RangeError(`Focus index must be null or an integer from 0 to ${cells.length - 1}.`);
      }
      focusIndex = index;
      refreshHighlights();
    },
    celebrate() {
      if (reducedMotion.matches) return;
      celebrationTime = 0;
      for (const ring of rings) ring.alpha = 0;
      for (const sparkle of sparkles) sparkle.graphic.alpha = 0;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      reducedMotion.removeEventListener('change', onMotionPreferenceChange);
      app.ticker.remove(tickerUpdate);
      app.destroy({ removeView: true }, { children: true });
    },
  };
}
