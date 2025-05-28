// src/utils/object-id.util.ts

/**
 * Safely converts a MongoDB ObjectId or any other value to a string
 * This utility handles various edge cases and prevents TypeScript warnings
 *
 * @param id - The ObjectId or any value to convert to string
 * @returns A string representation of the id
 */
export function safeObjectIdToString(id: unknown): string {
  if (id === null || id === undefined) {
    return '';
  }

  // If it's already a string, return it
  if (typeof id === 'string') {
    return id;
  }

  // If it has a toString method (like ObjectId), use it
  if (
    typeof id === 'object' &&
    'toString' in id &&
    typeof (id as { toString(): string }).toString === 'function'
  ) {
    return (id as { toString(): string }).toString();
  }

  // For other types, use a safe string conversion
  try {
    // For primitive types
    if (
      typeof id === 'number' ||
      typeof id === 'boolean' ||
      typeof id === 'bigint'
    ) {
      return String(id);
    }

    // For objects, use JSON.stringify to avoid [object Object]
    if (typeof id === 'object') {
      return JSON.stringify(id);
    }

    // Fallback for other types (symbol, function, etc.)
    // Instead of using String(id) which can cause linting issues,
    // we'll return a descriptive string of the type
    return `[${typeof id}]`;
  } catch (error) {
    console.error('Error converting id to string:', error);
    return '';
  }
}
