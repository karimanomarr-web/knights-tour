/**
 * BacktrackingSolver – solves the Knight's Tour using Backtracking.
 * Optionally applies Warnsdorff's heuristic to sort next moves by
 * the fewest onward moves (dramatically reduces backtracking for large n).
 */
class BacktrackingSolver {
  // All 8 possible knight moves
  static MOVES = [
    [-2, -1], [-2,  1],
    [-1, -2], [-1,  2],
    [ 1, -2], [ 1,  2],
    [ 2, -1], [ 2,  1],
  ];

  /**
   * @param {number} n              – board size
   * @param {number} startR         – starting row
   * @param {number} startC         – starting column
   * @param {boolean} useWarnsdorff – enable heuristic
   */
  constructor(n, startR, startC, useWarnsdorff = true) {
    this.n = n;
    this.startR = startR;
    this.startC = startC;
    this.useWarnsdorff = useWarnsdorff;
    this.backtracks = 0;
    this.cancelled = false;
  }

  cancel() { this.cancelled = true; }

  /** Returns path [{r,c}] or null if no tour exists from the given start */
  async solve(onProgress) {
    const n = this.n;
    const board = Array.from({ length: n }, () => new Array(n).fill(-1));
    const path  = [];
    this.backtracks = 0;
    this.cancelled  = false;

    const visit = (r, c, moveNum) => {
      if (this.cancelled) return false;
      board[r][c] = moveNum;
      path.push({ r, c });

      if (moveNum === n * n - 1) return true;  // all cells visited

      let nexts = this._getNextMoves(r, c, board);

      if (this.useWarnsdorff) {
        // Sort by number of onward moves (ascending)
        nexts.sort((a, b) => this._degree(a[0], a[1], board) - this._degree(b[0], b[1], board));
      }

      for (const [nr, nc] of nexts) {
        if (visit(nr, nc, moveNum + 1)) return true;
      }

      // Backtrack
      board[r][c] = -1;
      path.pop();
      this.backtracks++;
      return false;
    };

    // Use iterative approach with explicit stack for cancellation support
    const result = await this._solveIterative(board, path, onProgress);
    return result ? [...path] : null;
  }

  /** Iterative DFS with periodic yield so UI stays responsive */
  async _solveIterative(board, path, onProgress) {
    const n = this.n;
    // Stack frames: { r, c, moveNum, nextsLeft }
    const stack = [];

    const getNextsSorted = (r, c, bd) => {
      let nexts = this._getNextMoves(r, c, bd);
      if (this.useWarnsdorff) {
        nexts.sort((a, b) => this._degree(a[0], a[1], bd) - this._degree(b[0], b[1], bd));
      }
      return nexts;
    };

    // Initial move
    board[this.startR][this.startC] = 0;
    path.push({ r: this.startR, c: this.startC });
    stack.push({ r: this.startR, c: this.startC, moveNum: 0, nexts: getNextsSorted(this.startR, this.startC, board), idx: 0 });

    let stepCounter = 0;

    while (stack.length > 0) {
      if (this.cancelled) return false;

      const frame = stack[stack.length - 1];

      if (path.length === n * n) {
        if (onProgress) onProgress(path.length, this.backtracks);
        return true;
      }

      if (frame.idx >= frame.nexts.length) {
        // Backtrack
        board[frame.r][frame.c] = -1;
        path.pop();
        this.backtracks++;
        stack.pop();
        if (onProgress && this.backtracks % 200 === 0) onProgress(path.length, this.backtracks);
        continue;
      }

      const [nr, nc] = frame.nexts[frame.idx++];
      if (board[nr][nc] !== -1) continue;  // already visited (shouldn't happen with getNextMoves but guard)

      const nextMoveNum = frame.moveNum + 1;
      board[nr][nc] = nextMoveNum;
      path.push({ r: nr, c: nc });
      stack.push({ r: nr, c: nc, moveNum: nextMoveNum, nexts: getNextsSorted(nr, nc, board), idx: 0 });

      stepCounter++;
      if (stepCounter % 500 === 0) {
        if (onProgress) onProgress(path.length, this.backtracks);
        await yieldControl();
      }
    }

    return false;
  }

  _getNextMoves(r, c, board) {
    const moves = [];
    for (const [dr, dc] of BacktrackingSolver.MOVES) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < this.n && nc >= 0 && nc < this.n && board[nr][nc] === -1) {
        moves.push([nr, nc]);
      }
    }
    return moves;
  }

  _degree(r, c, board) {
    return this._getNextMoves(r, c, board).length;
  }
}

function yieldControl() {
  return new Promise(resolve => setTimeout(resolve, 0));
}
