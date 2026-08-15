/**
 * ApplicationClock.ts — Provides UTC and context-aware timestamps.
 */

import type { IClock, IApplicationService } from '../common/IApplicationService';
import type { IApplicationContext } from '../common/ApplicationContext';

export class ApplicationClock implements IClock {
  readonly serviceName = 'ApplicationClock';

  utcNow(): string {
    return new Date().toISOString();
  }

  nowInContext(context: IApplicationContext): string {
    try {
      return new Date().toLocaleString('en-US', { timeZone: context.timezone });
    } catch {
      return new Date().toISOString();
    }
  }
}
