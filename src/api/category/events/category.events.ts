/**
 * Идентификаторы событий жизненного цикла категорий каталога.
 */
export const CATEGORY_EVENTS = {
  CREATED: 'category.created',
  UPDATED: 'category.updated',
  REMOVED: 'category.removed',
} as const;

/**
 * Событие создания категории.
 */
export class CategoryCreatedEvent {
  constructor(
    public readonly slug: string,
    public readonly isActive: boolean,
  ) {}
}

/**
 * Событие обновления категории.
 */
export class CategoryUpdatedEvent {
  constructor(
    public readonly oldSlug: string,
    public readonly newSlug: string,
    public readonly oldIsActive: boolean,
    public readonly newIsActive: boolean,
  ) {}
}

/**
 * Событие удаления категории.
 */
export class CategoryRemovedEvent {
  constructor(public readonly slug: string) {}
}
