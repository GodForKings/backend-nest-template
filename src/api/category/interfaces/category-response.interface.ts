/**
 * Интерфейс ответа API для сущности Category.
 * Содержит только поля, которые ожидает клиент.
 * Служебные поля (updatedAt, parentId) исключены.
 */
export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  /** Дочерние категории (только для вложенных запросов) */
  children?: CategoryResponse[];
}

/**
 * Интерфейс пагинированного ответа для списка категорий.
 */
export interface CategoryListResponse {
  items: CategoryResponse[];
  total: number;
}
