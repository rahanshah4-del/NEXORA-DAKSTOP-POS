/**
 * Authentication Domain — Service, Validator, Policy, Factory, Events.
 * Interface only. No implementation.
 */

import type { User } from '../../types/models';
import type { ILoginCommand, ILogoutCommand, IRefreshTokenCommand } from '../commands/IMiscCommands';
import type { IUserLoggedInEvent, IUserLoggedOutEvent } from '../events/IDomainEvents';

export interface AuthSession {
  userId: string;
  email: string;
  displayName: string | null;
  role: string;
  token: string;
  refreshToken: string;
  expiresAt: string;
  deviceId: string;
}

export interface IAuthService {
  login(command: ILoginCommand): Promise<AuthSession>;
  logout(command: ILogoutCommand): Promise<void>;
  refreshToken(command: IRefreshTokenCommand): Promise<AuthSession>;
  getCurrentUser(): Promise<User | null>;
  getCurrentSession(): Promise<AuthSession | null>;
  isAuthenticated(): boolean;
  hasPermission(permission: string): boolean;
  hasRole(role: string): boolean;
  updatePassword(currentPassword: string, newPassword: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  validateSession(): Promise<boolean>;
}

export interface IAuthValidator {
  validateLogin(command: ILoginCommand): import('../shared/IValidationResult').IValidationResult;
  validatePassword(password: string): import('../shared/IValidationResult').IValidationResult;
  validateEmail(email: string): import('../shared/IValidationResult').IValidationResult;
  validateToken(token: string): import('../shared/IValidationResult').IValidationResult;
}

export interface IAuthPolicy {
  minPasswordLength(): number;
  requireSpecialChars(): boolean;
  requireNumbers(): boolean;
  sessionTimeoutMinutes(): number;
  maxLoginAttempts(): number;
  lockoutDurationMinutes(): number;
  mfaRequired(): boolean;
  tokenRefreshBeforeExpiryMinutes(): number;
}

export interface IAuthFactory {
  createSession(user: User, token: string, refreshToken: string, deviceId: string): AuthSession;
}

export interface IAuthEventPublisher {
  userLoggedIn(event: Omit<IUserLoggedInEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  userLoggedOut(event: Omit<IUserLoggedOutEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
}
