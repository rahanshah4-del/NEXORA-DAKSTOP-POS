/**
 * DomainEventDispatcher.ts — Publishes domain events after successful command execution.
 *
 * In the current architecture, events are logged. When an EventBus implementation
 * exists, they will be published to subscribers for async processing.
 */

import type { IApplicationService } from '../common/IApplicationService';
import type { ILogger } from '../common/IApplicationService';

export class DomainEventDispatcher implements IApplicationService {
  readonly serviceName = 'DomainEventDispatcher';

  constructor(private _logger: ILogger) {}

  /**
   * Publish a domain event.
   * Currently logs; will publish to IEventBus when implemented.
   */
  publish(eventType: string, data: Record<string, unknown>): void {
    this._logger.info(`Domain event: ${eventType}`, data);
  }

  /**
   * Publish multiple domain events.
   */
  publishAll(events: Array<{ eventType: string; data: Record<string, unknown> }>): void {
    for (const event of events) {
      this.publish(event.eventType, event.data);
    }
  }
}
