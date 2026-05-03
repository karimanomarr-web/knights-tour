/**
 * GeneticSolver – Solves the Knight's Tour using a Genetic Algorithm.
 *
 * Chromosome representation:
 *   An array of `n²-1` direction indices (0–7), representing the sequence of
 *   knight moves attempted from the start cell. Moves that land out-of-bounds
 *   or on a visited cell are skipped during evaluation, truncating the tour.
 *
 * Fitness = number of valid moves completed (max = n²-1).
 *
 * Operators:
 *   - Selection: Tournament (k=5)
 *   - Crossover: Single-point
 *   - Mutation : Random bit-flip on direction genes
 */
class GeneticSolver {
  static MOVES = [
    [-2, -1], [-2,  1],
    [-1, -2], [-1,  2],
    [ 1, -2], [ 1,  2],
    [ 2, -1], [ 2,  1],
  ];

  /**
   * @param {number} n           – board size
   * @param {number} startR      – starting row
   * @param {number} startC      – starting column
   * @param {number} popSize     – population size
   * @param {number} maxGen      – maximum generations
   * @param {number} mutRate     – mutation rate (0–1)
   */
  constructor(n, startR, startC, popSize = 100, maxGen = 500, mutRate = 0.1) {
    this.n       = n;
    this.startR  = startR;
    this.startC  = startC;
    this.popSize = popSize;
    this.maxGen  = maxGen;
    this.mutRate = mutRate;
    this.target  = n * n - 1;
    this.cancelled = false;
  }

  cancel() { this.cancelled = true; }

  /**
   * Run the GA.
   * @param {function} onGeneration – callback(gen, bestFitness, bestPath)
   * @returns {Promise<{path, generation, fitness}>}
   */
  async solve(onGeneration) {
    this.cancelled = false;
    const { n, startR, startC, popSize, maxGen, target } = this;
    const chromLen = target;

    // Initialize population
    let population = Array.from({ length: popSize }, () => this._randomChrom(chromLen));

    let bestEver = { fitness: -1, chrom: null };

    for (let gen = 0; gen < maxGen; gen++) {
      if (this.cancelled) return null;

      // Evaluate
      const evaluated = population.map(chrom => {
        const { fitness, path } = this._evaluate(chrom);
        return { chrom, fitness, path };
      });

      // Find best
      evaluated.sort((a, b) => b.fitness - a.fitness);
      const best = evaluated[0];

      if (best.fitness > bestEver.fitness) {
        bestEver = { fitness: best.fitness, chrom: [...best.chrom], path: best.path };
      }

      if (onGeneration) onGeneration(gen + 1, bestEver.fitness, bestEver.path);

      // Perfect solution?
      if (bestEver.fitness === target) {
        return { path: bestEver.path, generation: gen + 1, fitness: bestEver.fitness };
      }

      // Build next generation
      const eliteCount = Math.max(2, Math.floor(popSize * 0.05));
      const nextPop = evaluated.slice(0, eliteCount).map(e => [...e.chrom]);  // Elitism

      while (nextPop.length < popSize) {
        const p1 = this._tournament(evaluated, 5);
        const p2 = this._tournament(evaluated, 5);
        let [c1, c2] = this._crossover(p1.chrom, p2.chrom);
        c1 = this._mutate(c1);
        c2 = this._mutate(c2);
        nextPop.push(c1);
        if (nextPop.length < popSize) nextPop.push(c2);
      }

      population = nextPop;

      // Yield control every 10 generations to keep UI responsive
      if (gen % 10 === 0) await yieldControl();
    }

    // Return best found (might not be complete)
    return { path: bestEver.path, generation: maxGen, fitness: bestEver.fitness };
  }

  /** Evaluate a chromosome – returns {fitness, path} */
  _evaluate(chrom) {
    const { n, startR, startC } = this;
    const visited = Array.from({ length: n }, () => new Array(n).fill(false));
    const path    = [{ r: startR, c: startC }];
    visited[startR][startC] = true;
    let r = startR, c = startC;

    for (const dir of chrom) {
      const [dr, dc] = GeneticSolver.MOVES[dir];
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n || visited[nr][nc]) continue;
      visited[nr][nc] = true;
      path.push({ r: nr, c: nc });
      r = nr; c = nc;
      if (path.length === n * n) break;
    }

    return { fitness: path.length - 1, path };
  }

  _randomChrom(len) {
    return Array.from({ length: len }, () => Math.floor(Math.random() * 8));
  }

  /** Tournament selection */
  _tournament(pop, k) {
    let best = null;
    for (let i = 0; i < k; i++) {
      const contestant = pop[Math.floor(Math.random() * pop.length)];
      if (!best || contestant.fitness > best.fitness) best = contestant;
    }
    return best;
  }

  /** Single-point crossover */
  _crossover(c1, c2) {
    const pt = 1 + Math.floor(Math.random() * (c1.length - 1));
    return [
      [...c1.slice(0, pt), ...c2.slice(pt)],
      [...c2.slice(0, pt), ...c1.slice(pt)],
    ];
  }

  /** Random gene mutation */
  _mutate(chrom) {
    return chrom.map(g => Math.random() < this.mutRate ? Math.floor(Math.random() * 8) : g);
  }
}
