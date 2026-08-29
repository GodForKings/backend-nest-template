/** Интерфейс модели Category из базы данных (с опциональными дочерними подкатегориями).
 */
export interface CategoryDbModel {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  parentId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  children?: CategoryDbModel[];
}
