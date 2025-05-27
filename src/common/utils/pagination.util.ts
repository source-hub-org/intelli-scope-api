import { PaginationOptions, PaginatedResult } from '../interfaces';

/**
 * Utility class for handling pagination
 */
export class PaginationUtils {
  /**
   * Create pagination options from query parameters
   * @param query Query parameters
   * @returns Pagination options
   */
  static createPaginationOptions(
    query: Record<string, unknown>,
  ): PaginationOptions {
    // Convert to number safely
    const pageValue =
      typeof query.page === 'string' || typeof query.page === 'number'
        ? query.page
        : null;
    const limitValue =
      typeof query.limit === 'string' || typeof query.limit === 'number'
        ? query.limit
        : null;

    const page = pageValue ? parseInt(String(pageValue), 10) : 1;
    const limit = limitValue ? parseInt(String(limitValue), 10) : 20;

    // Parse sort parameter if provided
    let sort: Record<string, 1 | -1> | undefined;
    if (query.sort && typeof query.sort === 'string') {
      sort = {};
      const sortFields = query.sort.split(',');

      for (const field of sortFields) {
        if (field.startsWith('-')) {
          sort[field.substring(1)] = -1;
        } else {
          sort[field] = 1;
        }
      }
    }

    return {
      page: page > 0 ? page : 1,
      limit: limit > 0 && limit <= 100 ? limit : 20,
      sort,
    };
  }

  /**
   * Create a paginated result
   * @param data Data array
   * @param total Total number of items
   * @param options Pagination options
   * @returns Paginated result
   */
  static createPaginatedResult<T>(
    data: T[],
    total: number,
    options: PaginationOptions,
  ): PaginatedResult<T> {
    const { page = 1, limit = 20 } = options;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
