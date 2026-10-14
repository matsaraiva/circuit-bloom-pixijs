import './style.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/playfair-display/latin-500.css';
import '@fontsource/playfair-display/latin-500-italic.css';
import { createBoard } from './board';
import { applyMove, createGame, nextLevel, resetLevel } from './game';
import { LEVELS } from './levels';
import { BOARD_SIZE } from './rules';

const flowerMark = '<svg viewBox="0 0 40 40" aria-hidden="true"><g fill="currentColor"><ellipse cx="20" cy="13" rx="4" ry="8"/><ellipse cx="20" cy="13" rx="4" ry="8" transform="rotate(60 20 20)"/><ellipse cx="20" cy="13" rx="4" ry="8" transform="rotate(120 20 20)"/><ellipse cx="20" cy="13" rx="4" ry="8" transform="rotate(180 20 20)"/><ellipse cx="20" cy="13" rx="4" ry="8" transform="rotate(240 20 20)"/><ellipse cx="20" cy="13" rx="4" ry="8" transform="rotate(300 20 20)"/></g><circle cx="20" cy="20" r="3" fill="#f4d08e"/></svg>';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="page-shell">
    <header class="site-header">
      <a class="wordmark" href="./" aria-label="Circuit Bloom home">${flowerMark}<span>CIRCUIT BLOOM</span></a>
      <span class="header-note">A LITTLE LIGHT GOES A LONG WAY</span>
    </header>
    <main class="garden-layout">
      <section class="introduction" aria-labelledby="game-title">
        <p class="eyebrow"><span></span> A BOTANICAL LOGIC PUZZLE</p>
        <h1 id="game-title">Circuit<br> <em>Bloom.</em></h1>
        <p class="intro-copy"><span class="intro-scene">A quiet garden. A connected world.<br> </span>Bring every flower to light.</p>
        <div class="how-to">
          <div class="cross-diagram" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
          <div><h2>One tap. A little ripple.</h2><p>Tap a flower to flip it and its<br class="desktop-break"> up, down, left and right neighbors.</p></div>
        </div>
        <p class="keyboard-note">Use <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> to choose, <kbd>Enter</kbd> to bloom.</p>
      </section>
      <section class="game" aria-label="Circuit garden">
        <div class="garden-heading">
          <div class="level-heading"><span class="small-label" id="level-number">GARDEN 01 / 03</span><h2 id="level-name">First light</h2></div>
          <div class="move-counter"><span id="moves">0</span><span class="small-label">MOVES</span></div>
        </div>
        <div class="board-frame" id="board-frame" tabindex="0" role="group" aria-label="Garden board. Use arrow keys to choose a flower, then Enter or Space to flip it and its neighbors." aria-describedby="board-help">
          <div id="board" class="board-mount"><span class="loading">Planting a little light…</span></div>
        </div>
        <span class="sr-only" id="board-help">All 16 flowers must be lit. The selected flower and its orthogonal neighbors change together. Tab leaves the board.</span>
        <div class="garden-toolbar">
          <div class="bloom-count"><span class="count-dot"></span><span id="lit-count">0 / 16</span><span>in bloom</span></div>
          <button type="button" class="reset-button" id="reset" aria-label="Reset this garden"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 7a6.5 6.5 0 1 1-.2 5M4 3v4h4"/></svg>Reset</button>
        </div>
        <div class="garden-result" id="result">
          <div><p id="status-heading">Every flower is connected.</p><p id="status-detail">Find the spark. There’s no rush.</p></div>
          <button type="button" class="advance-button" id="advance" hidden>Next garden <span aria-hidden="true">↗</span></button>
        </div>
        <p class="sr-only" id="announcement" role="status" aria-live="polite" aria-atomic="true"></p>
      </section>
    </main>
    <footer class="site-footer"><span>A small garden by <strong>Matheus</strong></span><span>THREE GARDENS · TAKE YOUR TIME</span></footer>
  </div>`;

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const frame = element<HTMLDivElement>('board-frame');
const host = element<HTMLDivElement>('board');
const advance = element<HTMLButtonElement>('advance');
let state = createGame();
let selected = 0;

async function start(): Promise<void> {
  const board = await createBoard(host, selectFlower, state.board);
  host.querySelector('.loading')?.remove();
  // The renderer owns pointer input; the same state transition serves keyboard input.
  function selectFlower(index: number): void {
    selected = index;
    const move = applyMove(state, index);
    if (move.state === state) return;
    state = move.state;
    board.setState(state.board, true);
    if (document.activeElement === frame) board.setFocus(selected);
    updateInterface();
    if (move.didWin) board.celebrate();
  }

  function updateInterface(): void {
    const level = LEVELS[state.levelIndex];
    const lit = state.board.filter(Boolean).length;
    const finished = state.status !== 'playing';
    element('level-number').textContent = `GARDEN ${String(state.levelIndex + 1).padStart(2, '0')} / 03`;
    element('level-name').textContent = level.name;
    element('moves').textContent = String(state.moves);
    element('lit-count').textContent = `${lit} / 16`;
    element('result').classList.toggle('is-won', finished);
    element('status-heading').textContent = state.status === 'complete' ? 'A garden of light. Beautifully done.' : finished ? 'Every flower found its light.' : 'Every flower is connected.';
    element('status-detail').textContent = finished ? `Bloomed in ${state.moves} ${state.moves === 1 ? 'move' : 'moves'}.${state.moves === level.minimumMoves ? ' A perfect little circuit.' : ''}` : 'Find the spark. There’s no rush.';
    advance.hidden = !finished;
    advance.innerHTML = state.status === 'complete' ? 'Bloom again <span aria-hidden="true">↻</span>' : 'Next garden <span aria-hidden="true">↗</span>';
    frame.dataset.board = state.board.map(Number).join('');
    frame.dataset.status = state.status;
    frame.dataset.level = String(state.levelIndex);
    frame.dataset.selected = String(selected);
    frame.setAttribute('aria-label', `${lit} of 16 flowers lit. Row ${Math.floor(selected / BOARD_SIZE) + 1}, column ${selected % BOARD_SIZE + 1}: ${state.board[selected] ? 'lit' : 'closed'}. Use arrows to choose, Enter or Space to flip.${finished ? ' Garden complete.' : ''}`);
    element('announcement').textContent = finished ? `${state.status === 'complete' ? 'All three gardens complete.' : 'Garden complete.'} ${state.moves} moves. ${advance.textContent?.trim()} is available.` : `${lit} of 16 flowers lit. ${state.moves} moves.`;
    board.setInteractive(!finished);
  }

  function restore(): void {
    selected = 0;
    board.setState(state.board, false);
    board.setFocus(document.activeElement === frame ? selected : null);
    updateInterface();
  }

  element('reset').addEventListener('click', () => {
    state = resetLevel(state);
    restore();
  });
  advance.addEventListener('click', () => {
    state = state.status === 'complete' ? createGame() : nextLevel(state);
    restore();
    frame.focus({ preventScroll: true });
  });
  frame.addEventListener('focus', () => board.setFocus(selected));
  frame.addEventListener('blur', () => board.setFocus(null));
  frame.addEventListener('keydown', (event) => {
    if (state.status !== 'playing') return;
    const row = Math.floor(selected / BOARD_SIZE);
    const column = selected % BOARD_SIZE;
    const destinations: Record<string, number> = {
      ArrowUp: row > 0 ? selected - BOARD_SIZE : selected,
      ArrowDown: row < BOARD_SIZE - 1 ? selected + BOARD_SIZE : selected,
      ArrowLeft: column > 0 ? selected - 1 : selected,
      ArrowRight: column < BOARD_SIZE - 1 ? selected + 1 : selected,
      Home: row * BOARD_SIZE,
      End: row * BOARD_SIZE + BOARD_SIZE - 1,
    };
    if (event.key in destinations) {
      event.preventDefault();
      selected = destinations[event.key];
      board.setFocus(selected);
      updateInterface();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) selectFlower(selected);
    }
  });
  updateInterface();
  if (import.meta.hot) import.meta.hot.dispose(() => board.destroy());
}

start().catch((error: unknown) => {
  console.error('Unable to start Circuit Bloom:', error);
  host.innerHTML = '<p class="render-error">This garden needs WebGL to bloom.<br>Please try a browser with hardware acceleration enabled.</p>';
  element('reset').setAttribute('disabled', '');
  frame.removeAttribute('tabindex');
});
