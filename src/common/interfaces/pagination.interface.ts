/**
 * Interface for pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}

/**
 * Interface for pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * Interface for paginated results
 */
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
