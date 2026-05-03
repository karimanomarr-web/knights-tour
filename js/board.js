/**
 * Board – renders and animates the n×n chessboard.
 */
class Board {
  /**
   * @param {HTMLElement} el         – the #board container
   * @param {number} n               – board dimension
   * @param {function} onCellClick   – callback(r, c) when user clicks a cell
   */
  constructor(el, n, onCellClick) {
    this.el          = el;
    this.n           = n;
    this.cells       = [];   // flat array [row * n + col]
    this.onCellClick = onCellClick || null;
    this._selectedR  = 0;
    this._selectedC  = 0;
    this._build();
  }

  _build() {
    this.el.innerHTML = '';
    this.el.style.gridTemplateColumns = `repeat(${this.n}, 1fr)`;
    this.cells = [];

    for (let r = 0; r < this.n; r++) {
      for (let c = 0; c < this.n; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
        cell.id = `cell-${r}-${c}`;
        cell.title = `Row ${r}, Col ${c}`;
        if (this.onCellClick) {
          cell.classList.add('clickable');
          cell.addEventListener('click', () => {
            if (this.onCellClick) this.onCellClick(r, c);
          });
        }
        this.el.appendChild(cell);
        this.cells.push(cell);
      }
    }
    // Show default start cell
    this._highlightSelected(this._selectedR, this._selectedC);
  }

  /** Reset all cells to their default light/dark state, keeping the start highlight */
  reset() {
    for (let r = 0; r < this.n; r++) {
      for (let c = 0; c < this.n; c++) {
        const cell = this.cells[r * this.n + c];
        const base = (r + c) % 2 === 0 ? 'light' : 'dark';
        cell.className = 'cell ' + base + (this.onCellClick ? ' clickable' : '');
        cell.textContent = '';
        cell.style.removeProperty('--step-ratio');
      }
    }
    this._highlightSelected(this._selectedR, this._selectedC);
  }

  /** Programmatically update which cell is highlighted as the start */
  setSelectedStart(r, c) {
    // Clear old
    if (this._selectedR !== undefined) {
      const old = this.cells[this._selectedR * this.n + this._selectedC];
      if (old) old.classList.remove('selected-start');
    }
    this._selectedR = r;
    this._selectedC = c;
    this._highlightSelected(r, c);
  }

  _highlightSelected(r, c) {
    if (r < 0 || r >= this.n || c < 0 || c >= this.n) return;
    const cell = this.cells[r * this.n + c];
    if (cell) cell.classList.add('selected-start');
  }

  /** Mark a cell visited with its move number (0-indexed position in path) */
  markVisited(r, c, moveIndex, totalMoves) {
    const cell = this.cells[r * this.n + c];
    const ratio = totalMoves > 1 ? moveIndex / (totalMoves - 1) : 0;
    cell.style.setProperty('--step-ratio', ratio.toFixed(3));
    cell.className = 'cell visited number-visible';
    cell.textContent = moveIndex + 1;
  }

  /** Place the knight on a cell (shown as ♞) */
  markCurrent(r, c) {
    const cell = this.cells[r * this.n + c];
    cell.className = 'cell current';
    cell.textContent = '♞';
  }

  /** Mark the starting cell with a ring */
  markStart(r, c) {
    const cell = this.cells[r * this.n + c];
    cell.classList.add('start-cell');
  }

  /** Replay a complete path array [{r, c}] with per-step delay ms */
  async animatePath(path, delayMs, onStep) {
    const total = path.length;
    for (let i = 0; i < total; i++) {
      // clear previous "current" marker
      if (i > 0) {
        const prev = path[i - 1];
        this.markVisited(prev.r, prev.c, i - 1, total);
      }
      const { r, c } = path[i];
      this.markCurrent(r, c);
      if (onStep) onStep(i, path[i]);
      if (i < total - 1) await sleep(delayMs);
    }
    // final cell visited
    const last = path[total - 1];
    this.markVisited(last.r, last.c, total - 1, total);
    if (onStep) onStep(total - 1, last);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
