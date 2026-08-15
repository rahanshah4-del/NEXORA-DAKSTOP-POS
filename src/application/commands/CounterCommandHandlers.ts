/**
 * CounterCommandHandlers.ts — Command handlers for POS Counter commands.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result } from '../common/Result';
import type { ILogger } from '../common/IApplicationService';

export class CounterCommandHandlers {
  constructor(private _logger: ILogger) {}

  async openCounter(command: any, ctx: IApplicationContext): Promise<Result<Record<string, unknown>>> {
    const counter = {
      id: `ctr_${Date.now()}`,
      employeeId: command.employeeId ?? ctx.currentUser?.employeeId,
      openedAt: new Date().toISOString(),
      closedAt: null,
      openingBalanceCents: command.openingBalanceCents ?? 0,
      closingBalanceCents: null,
      status: 'open',
    };

    this._logger.info(`Counter opened`, { counterId: counter.id });
    return Result.ok(counter);
  }

  async closeCounter(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    this._logger.info(`Counter closed: ${command.counterId}`, {
      cashCountCents: command.cashCountCents,
    });
    return Result.success();
  }
}
