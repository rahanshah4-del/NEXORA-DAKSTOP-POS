/**
 * Workspace Domain — Service, Validator, Policy, Factory, Events.
 * Interface only. No implementation.
 */

import type { ICreateWorkspaceCommand, IUpdateWorkspaceCommand } from '../commands/IMiscCommands';
import type { IWorkspaceCreatedEvent } from '../events/IDomainEvents';

export interface Workspace {
  id: string;
  name: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IWorkspaceService {
  create(command: ICreateWorkspaceCommand): Promise<Workspace>;
  update(command: IUpdateWorkspaceCommand): Promise<Workspace>;
  findById(id: string): Promise<Workspace | null>;
  getCurrent(): Promise<Workspace | null>;
  deactivate(id: string): Promise<void>;
  getStats(): Promise<Record<string, unknown>>;
}

export interface IWorkspaceValidator {
  validateCreate(command: ICreateWorkspaceCommand): import('../shared/IValidationResult').IValidationResult;
  validateUpdate(command: IUpdateWorkspaceCommand): import('../shared/IValidationResult').IValidationResult;
  validateName(name: string): import('../shared/IValidationResult').IValidationResult;
}

export interface IWorkspacePolicy {
  maxBranches(): number;
  maxDevices(): number;
  maxUsers(): number;
  allowedPlans(): string[];
  planLimits(plan: string): Record<string, number>;
}

export interface IWorkspaceFactory {
  create(command: ICreateWorkspaceCommand): Workspace;
}

export interface IWorkspaceEventPublisher {
  workspaceCreated(event: Omit<IWorkspaceCreatedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
}
