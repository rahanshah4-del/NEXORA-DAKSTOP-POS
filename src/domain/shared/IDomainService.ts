/**
 * IDomainService — base domain service interface.
 * All domain services extend this contract.
 * Interface only. No implementation.
 */

export interface IDomainService<TEntity, TCreateCommand, TUpdateCommand> {
  /** Create a new entity */
  create(command: TCreateCommand): Promise<TEntity>;

  /** Update an existing entity */
  update(command: TUpdateCommand): Promise<TEntity>;

  /** Delete (or soft-delete) an entity */
  delete(id: string): Promise<void>;

  /** Find an entity by ID */
  findById(id: string): Promise<TEntity | null>;

  /** Find all entities with optional pagination */
  findAll(limit?: number, offset?: number): Promise<TEntity[]>;

  /** Count total entities */
  count(): Promise<number>;

  /** Check if an entity exists */
  exists(id: string): Promise<boolean>;
}
