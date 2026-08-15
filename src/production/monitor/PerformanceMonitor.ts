/**
 * PerformanceMonitor — Track IPC latency, command/query timing, memory, render timing.
 */

export interface TimingRecord {
  name: string;
  durationMs: number;
  timestamp: string;
  success: boolean;
}

export interface PerformanceSnapshot {
  ipcAvgMs: number;
  commandAvgMs: number;
  queryAvgMs: number;
  renderAvgMs: number;
  memoryMB: number;
  totalCommands: number;
  totalQueries: number;
  failureRate: number;
}

export class PerformanceMonitor {
  private timings: TimingRecord[] = [];
  private maxTimings = 1_000;

  /** Record a timing measurement. */
  record(name: string, durationMs: number, success = true): void {
    this.timings.push({ name, durationMs, timestamp: new Date().toISOString(), success });
    if (this.timings.length > this.maxTimings) this.timings.shift();
  }

  /** Measure execution time of an async function. */
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      this.record(name, performance.now() - start, true);
      return result;
    } catch (err) {
      this.record(name, performance.now() - start, false);
      throw err;
    }
  }

  /** Get a performance snapshot. */
  getSnapshot(): PerformanceSnapshot {
    const commands = this.timings.filter(t => t.name.startsWith('cmd:'));
    const queries = this.timings.filter(t => t.name.startsWith('qry:'));
    const ipc = this.timings.filter(t => t.name.startsWith('ipc:'));
    const renders = this.timings.filter(t => t.name.startsWith('render:'));
    const total = this.timings.length;
    const failed = this.timings.filter(t => !t.success).length;

    return {
      ipcAvgMs: this.avg(ipc),
      commandAvgMs: this.avg(commands),
      queryAvgMs: this.avg(queries),
      renderAvgMs: this.avg(renders),
      memoryMB: Math.round((performance as any).memory?.usedJSHeapSize / 1024 / 1024) || 0,
      totalCommands: commands.length,
      totalQueries: queries.length,
      failureRate: total > 0 ? Math.round((failed / total) * 100) : 0,
    };
  }

  /** Get recent timings. */
  getRecentTimings(count = 50): TimingRecord[] {
    return this.timings.slice(-count).reverse();
  }

  private avg(records: TimingRecord[]): number {
    if (records.length === 0) return 0;
    return Math.round(records.reduce((s, r) => s + r.durationMs, 0) / records.length);
  }
}

export const perfMonitor = new PerformanceMonitor();
