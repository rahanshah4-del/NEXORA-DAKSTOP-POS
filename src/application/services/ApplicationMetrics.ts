/**
 * ApplicationMetrics.ts — In-memory performance metrics tracker.
 *
 * Tracks command/query counts, durations, and failure rates.
 */

import type { IMetrics, ApplicationMetricsSnapshot } from '../common/IApplicationService';

export class ApplicationMetrics implements IMetrics {
  readonly serviceName = 'ApplicationMetrics';

  private _totalCommands = 0;
  private _totalQueries = 0;
  private _failedCommands = 0;
  private _failedQueries = 0;
  private _commandDurations: number[] = [];
  private _queryDurations: number[] = [];
  private _counters = new Map<string, number>();

  recordExecution(
    operationType: string,
    operationName: string,
    durationMs: number,
    success: boolean,
  ): void {
    if (operationType === 'command') {
      this._totalCommands++;
      if (!success) this._failedCommands++;
      this._commandDurations.push(durationMs);
      // Keep last 1000
      if (this._commandDurations.length > 1000) this._commandDurations.shift();
    } else {
      this._totalQueries++;
      if (!success) this._failedQueries++;
      this._queryDurations.push(durationMs);
      if (this._queryDurations.length > 1000) this._queryDurations.shift();
    }
  }

  incrementCounter(name: string, tags?: Record<string, string>): void {
    const key = tags ? `${name}:${Object.values(tags).join(':')}` : name;
    this._counters.set(key, (this._counters.get(key) ?? 0) + 1);
  }

  getSnapshot(): ApplicationMetricsSnapshot {
    return {
      totalCommands: this._totalCommands,
      totalQueries: this._totalQueries,
      failedCommands: this._failedCommands,
      failedQueries: this._failedQueries,
      averageCommandDurationMs: this._avg(this._commandDurations),
      averageQueryDurationMs: this._avg(this._queryDurations),
      counters: Object.fromEntries(this._counters),
    };
  }

  private _avg(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}
