import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

/**
 * Decorator to add pagination query parameters to Swagger documentation
 * @param options Options for the decorator
 * @returns Decorator
 */
export function ApiPagination(options?: {
  page?: boolean;
  limit?: boolean;
  sort?: boolean;
}) {
  const { page = true, limit = true, sort = true } = options || {};

  const decorators = [];

  if (page) {
    decorators.push(
      ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number (1-based)',
        example: 1,
      }),
    );
  }

  if (limit) {
    decorators.push(
      ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of items per page (max 100)',
        example: 20,
      }),
    );
  }

  if (sort) {
    decorators.push(
      ApiQuery({
        name: 'sort',
        required: false,
        type: String,
        description: 'Sort fields (prefix with - for descending)',
        example: '-createdAt,name',
      }),
    );
  }

  return applyDecorators(...decorators);
}
