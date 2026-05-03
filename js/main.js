/**
 * main.js – wires all UI controls to Board, BacktrackingSolver, and GeneticSolver.
 */

// ── DOM refs ──────────────────────────────────────────────────────────────────
const boardEl        = document.getElementById('board');
const boardSizeInput = document.getElementById('boardSize');
const boardSizeSlider= document.getElementById('boardSizeSlider');
const startRowInput  = document.getElementById('startRow');
const startColInput  = document.getElementById('startCol');
const useWarnsdorff  = document.getElementById('useWarnsdorff');
const popSizeInput   = document.getElementById('popSize');
const maxGenInput    = document.getElementById('maxGen');
const mutRateInput   = document.getElementById('mutRate');
const mutValEl       = document.querySelector('.mut-val');
const speedInput     = document.getElementById('speed');
const startBtn       = document.getElementById('startBtn');
const resetBtn       = document.getElementById('resetBtn');
const errorMsg       = document.getElementById('errorMsg');
const algoTabs       = document.querySelectorAll('.algo-tab');
const optsBacktracking = document.getElementById('opts-backtracking');
const optsGenetic      = document.getElementById('opts-genetic');
const overlay          = document.getElementById('overlay');
const overlayIcon      = document.getElementById('overlayIcon');
const overlayMsg       = document.getElementById('overlayMsg');
const overlaySub       = document.getElementById('overlaySub');
const gaPanel          = document.getElementById('gaPanel');
const gaTarget         = document.getElementById('gaTarget');
const fitnessFill      = document.getElementById('fitnessFill');
const fitnessPct       = document.getElementById('fitnessPct');
const genLog           = document.getElementById('genLog');
const statAlgo         = document.getElementById('statAlgo');
const statBoard        = document.getElementById('statBoard');
const statMoves        = document.getElementById('statMoves');
const statBack         = document.getElementById('statBack');
const statBackItem     = document.getElementById('statBackItem');
const statGen          = document.getElementById('statGen');
const statGenItem      = document.getElementById('statGenItem');
const statFit          = document.getElementById('statFit');
const statFitItem      = document.getElementById('statFitItem');
const statStatus       = document.getElementById('statStatus');

// ── State ─────────────────────────────────────────────────────────────────────
let currentAlgo   = 'backtracking';
let board         = null;
let activeSolver  = null;
let isRunning     = false;

// ── Init ──────────────────────────────────────────────────────────────────────
initBoard();
updateStartInputMaxes();

// ── Sync board size slider <-> number input ───────────────────────────────────
boardSizeSlider.addEventListener('input', () => {
  boardSizeInput.value = boardSizeSlider.value;
  updateStartInputMaxes();
  initBoard();
});
boardSizeInput.addEventListener('change', () => {
  let v = parseInt(boardSizeInput.value) || 8;
  v = Math.max(5, Math.min(12, v));
  boardSizeInput.value = v;
  boardSizeSlider.value = v;
  updateStartInputMaxes();
  initBoard();
});

// ── Sync start position inputs → board highlight ─────────────────────────────
function syncStartHighlight() {
  if (!board || isRunning) return;
  const n  = board.n;
  const sr = parseInt(startRowInput.value);
  const sc = parseInt(startColInput.value);
  if (!isNaN(sr) && !isNaN(sc) && sr >= 0 && sr < n && sc >= 0 && sc < n) {
    board.setSelectedStart(sr, sc);
  }
}
startRowInput.addEventListener('input', syncStartHighlight);
startColInput.addEventListener('input', syncStartHighlight);

// ── Mutation rate label ───────────────────────────────────────────────────────
mutRateInput.addEventListener('input', () => {
  mutValEl.textContent = parseFloat(mutRateInput.value).toFixed(2);
});

// ── Algorithm tabs ────────────────────────────────────────────────────────────
algoTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    algoTabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    currentAlgo = tab.dataset.algo;
    optsBacktracking.classList.toggle('hidden', currentAlgo !== 'backtracking');
    optsGenetic.classList.toggle('hidden', currentAlgo !== 'genetic');
    statAlgo.textContent = currentAlgo === 'backtracking' ? 'Backtracking' : 'Genetic';
    updateStatsVisibility();
    resetBoard();
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
startBtn.addEventListener('click', async () => {
  if (isRunning) return;
  clearError();

  const n  = parseInt(boardSizeInput.value) || 8;
  const sr = parseInt(startRowInput.value)  || 0;
  const sc = parseInt(startColInput.value)  || 0;

  if (n < 5) { showError('Minimum board size is 5 × 5.'); return; }
  if (sr < 0 || sr >= n || sc < 0 || sc >= n) {
    showError(`Start position must be within 0–${n-1} for a ${n}×${n} board.`);
    return;
  }

  setRunning(true);
  resetBoard();
  board.setSelectedStart(sr, sc);
  board.markStart(sr, sc);
  setStatus('running', 'Solving…');
  statBoard.textContent = `${n} × ${n}`;
  statMoves.textContent = '0';
  statBack.textContent  = '0';
  statGen.textContent   = '0';
  statFit.textContent   = '0';
  overlay.classList.add('hidden');

  if (currentAlgo === 'backtracking') {
    await runBacktracking(n, sr, sc);
  } else {
    await runGenetic(n, sr, sc);
  }
});

// ── Reset ─────────────────────────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  if (activeSolver) activeSolver.cancel();
  isRunning = false;
  resetBoard();
  setRunning(false);
  setStatus('idle', 'Idle');
  clearError();
});

// ── Backtracking runner ───────────────────────────────────────────────────────
async function runBacktracking(n, sr, sc) {
  const warnsdorff = useWarnsdorff.checked;
  activeSolver = new BacktrackingSolver(n, sr, sc, warnsdorff);

  const path = await activeSolver.solve((moves, backs) => {
    statMoves.textContent = moves;
    statBack.textContent  = backs;
  });

  if (!path || activeSolver.cancelled) {
    if (!activeSolver.cancelled) showOverlay('fail', '✗', 'No Solution Found', `n=${n}, start (${sr},${sc})`);
    setStatus('idle', 'Cancelled');
    setRunning(false);
    return;
  }

  // Animate the found path
  const delayMs = speedToDelay();
  statMoves.textContent = path.length;
  statBack.textContent  = activeSolver.backtracks;

  await board.animatePath(path, delayMs, (i, _) => {
    statMoves.textContent = i + 1;
  });

  if (!activeSolver.cancelled) {
    const complete = path.length === n * n;
    if (complete) showOverlay('success', '♞', "Tour Complete!", `${n}×${n} board · ${activeSolver.backtracks} backtracks`);
    else          showOverlay('fail', '✗', 'Partial Tour', `${path.length} / ${n*n} cells visited`);
    setStatus(complete ? 'success' : 'fail', complete ? 'Complete' : 'Partial');
  }

  setRunning(false);
}

// ── Genetic runner ────────────────────────────────────────────────────────────
async function runGenetic(n, sr, sc) {
  const popSize = parseInt(popSizeInput.value) || 100;
  const maxGen  = parseInt(maxGenInput.value)  || 500;
  const mutRate = parseFloat(mutRateInput.value) || 0.1;
  const target  = n * n - 1;

  gaTarget.textContent = `Target: ${target} moves`;
  gaPanel.classList.remove('hidden');
  genLog.innerHTML = '';
  fitnessFill.style.width = '0%';
  fitnessPct.textContent  = '0%';

  activeSolver = new GeneticSolver(n, sr, sc, popSize, maxGen, mutRate);

  let lastBest = -1;
  const result = await activeSolver.solve((gen, bestFit, bestPath) => {
    statGen.textContent   = gen;
    statFit.textContent   = bestFit;
    statMoves.textContent = bestFit + 1;

    const pct = Math.round((bestFit / target) * 100);
    fitnessFill.style.width = pct + '%';
    fitnessPct.textContent  = pct + '%';

    // Log entry every 10 gens or when fitness improves
    if (gen % 10 === 0 || bestFit > lastBest) {
      const entry = document.createElement('div');
      entry.className = 'gen-entry' + (bestFit > lastBest ? ' best' : '');
      entry.textContent = `G${gen}: ${bestFit}`;
      genLog.appendChild(entry);
      genLog.scrollTop = genLog.scrollHeight;
    }
    lastBest = bestFit;
  });

  if (!result || activeSolver.cancelled) {
    setStatus('idle', 'Cancelled');
    setRunning(false);
    return;
  }

  // Animate best found path
  const delayMs = speedToDelay();
  await board.animatePath(result.path, delayMs, (i, _) => {
    statMoves.textContent = i + 1;
  });

  if (!activeSolver.cancelled) {
    const complete = result.fitness === target;
    if (complete) {
      showOverlay('success', '🧬', 'Tour Complete!', `Gen ${result.generation} · Fitness ${result.fitness}/${target}`);
      setStatus('success', 'Complete');
    } else {
      showOverlay('fail', '🧬', `Best: ${result.fitness}/${target} Moves`, `Gen ${result.generation} · Increase population or generations`);
      setStatus('fail', 'Partial');
    }
  }

  setRunning(false);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function initBoard() {
  const n = parseInt(boardSizeInput.value) || 8;
  board = new Board(boardEl, n, (r, c) => {
    if (isRunning) return;  // ignore clicks while solving
    startRowInput.value = r;
    startColInput.value = c;
    board.setSelectedStart(r, c);
    clearError();
  });
  // Sync current input values to the board highlight
  const sr = Math.max(0, Math.min(n - 1, parseInt(startRowInput.value) || 0));
  const sc = Math.max(0, Math.min(n - 1, parseInt(startColInput.value) || 0));
  board.setSelectedStart(sr, sc);
  statBoard.textContent = `${n} × ${n}`;
  overlay.classList.add('hidden');
  gaPanel.classList.add('hidden');
  genLog.innerHTML = '';
}

function resetBoard() {
  if (board) board.reset();
  overlay.classList.add('hidden');
}

function updateStartInputMaxes() {
  const n = parseInt(boardSizeInput.value) || 8;
  startRowInput.max = n - 1;
  startColInput.max = n - 1;
  if (parseInt(startRowInput.value) >= n) startRowInput.value = 0;
  if (parseInt(startColInput.value) >= n) startColInput.value = 0;
}

function setRunning(val) {
  isRunning = val;
  startBtn.disabled = val;
}

function speedToDelay() {
  // speed 1 → 600ms, speed 10 → 20ms
  const s = parseInt(speedInput.value) || 5;
  return Math.round(600 - (s - 1) * (580 / 9));
}

function showOverlay(type, icon, msg, sub) {
  overlayIcon.textContent = icon;
  overlayMsg.textContent  = msg;
  overlaySub.textContent  = sub || '';
  overlay.classList.remove('hidden');
}

function setStatus(type, label) {
  statStatus.textContent = label;
  statStatus.className   = 'stat-value status-badge ' + type;
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
}

function clearError() {
  errorMsg.classList.add('hidden');
  errorMsg.textContent = '';
}

function updateStatsVisibility() {
  const ga = currentAlgo === 'genetic';
  statBackItem.style.display = ga ? 'none'  : '';
  statGenItem.style.display  = ga ? ''      : 'none';
  statFitItem.style.display  = ga ? ''      : 'none';
  if (!ga) {
    gaPanel.classList.add('hidden');
  }
}

// Init stats visibility
updateStatsVisibility();
