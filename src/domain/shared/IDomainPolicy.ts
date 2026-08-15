/**
 * IDomainPolicy — base domain policy interface.
 * Policies encode business rules that must be satisfied.
 * Interface only. No implementation.
 */

export interface IDomainPolicy<TEntity, TContext = Record<string, unknown>> {
  /** Name of the policy (for diagnostics) */
  readonly policyName: string;

  /** Description of the business rule */
  readonly description: string;

  /** Evaluate whether the entity satisfies this policy */
  isSatisfiedBy(entity: TEntity, context?: TContext): boolean;

  /** Explain why the policy is not satisfied */
  explainViolation(entity: TEntity, context?: TContext): string | null;

  /** Check if this policy is currently active/enabled */
  isActive(): boolean;

  /** Get the severity of a policy violation */
  getSeverity(): PolicySeverity;
}

export type PolicySeverity = 'error' | 'warning' | 'info';
