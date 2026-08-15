/**
 * Branch Domain — Service, Validator, Policy, Factory, Events.
 * Interface only. No implementation.
 */

import type { IBranchMetadata } from '../../sync/enterprise/IBranchMetadata';
import type { ICreateBranchCommand, IUpdateBranchCommand, ISwitchBranchCommand } from '../commands/IMiscCommands';
import type { IBranchCreatedEvent, IBranchSwitchedEvent } from '../events/IDomainEvents';

export interface ICreateBranchDomainCommand {
  workspaceId: string;
  name: string;
  code: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  currency: string;
  timezone: string;
}

export interface IBranchService {
  create(command: ICreateBranchDomainCommand): Promise<IBranchMetadata>;
  update(branchId: string, data: Partial<IBranchMetadata>): Promise<IBranchMetadata>;
  findById(branchId: string): Promise<IBranchMetadata | null>;
  getCurrent(): Promise<IBranchMetadata | null>;
  getAll(workspaceId: string): Promise<IBranchMetadata[]>;
  switchBranch(command: ISwitchBranchCommand): Promise<IBranchMetadata>;
  updateConfig(config: Partial<IBranchMetadata['config']>): Promise<void>;
  updateLocalization(localization: Partial<IBranchMetadata['localization']>): Promise<void>;
  updateBusinessHours(hours: Partial<IBranchMetadata['businessHours']>): Promise<void>;
  isWithinBusinessHours(date?: Date): boolean;
  getBusinessDate(): string;
  deactivate(branchId: string): Promise<void>;
}

export interface IBranchValidator {
  validateCreate(command: ICreateBranchDomainCommand): import('../shared/IValidationResult').IValidationResult;
  validateSwitch(command: ISwitchBranchCommand): import('../shared/IValidationResult').IValidationResult;
  validateCode(code: string): import('../shared/IValidationResult').IValidationResult;
  validateTimezone(timezone: string): import('../shared/IValidationResult').IValidationResult;
}

export interface IBranchPolicy {
  maxBranchesPerWorkspace(): number;
  codePattern(): RegExp;
  defaultCurrency(): string;
  defaultTimezone(): string;
  supportedCurrencies(): string[];
  supportedTimezones(): string[];
}

export interface IBranchFactory {
  create(command: ICreateBranchDomainCommand): IBranchMetadata;
  createDefault(workspaceId: string): IBranchMetadata;
}

export interface IBranchEventPublisher {
  branchCreated(event: Omit<IBranchCreatedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  branchSwitched(event: Omit<IBranchSwitchedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
}
