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

  // For NestJS Swagger v11, we need to use a different approach
  // Create an array of decorators
  const decorators = [];

  if (page) {
    // Add page query parameter
    decorators.push(
      // @ts-expect-error - Known type issue with NestJS Swagger v11
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
    // Add limit query parameter
    decorators.push(
      // @ts-expect-error - Known type issue with NestJS Swagger v11
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
    // Add sort query parameter
    decorators.push(
      // @ts-expect-error - Known type issue with NestJS Swagger v11
      ApiQuery({
        name: 'sort',
        required: false,
        type: String,
        description: 'Sort fields (prefix with - for descending)',
        example: '-createdAt,name',
      }),
    );
  }

  // Apply all decorators
  return applyDecorators(...decorators);
}
