/**
 * Utility class for sanitizing data
 */
export class SanitizerUtils {
  /**
   * Sanitize an object by masking sensitive fields
   * @param obj Object to sanitize
   * @param sensitiveFields Array of sensitive field names
   * @param maskValue Value to use for masking (default: '[REDACTED]')
   * @returns Sanitized object
   */
  static sanitizeObject(
    obj: Record<string, any>,
    sensitiveFields: string[],
    maskValue = '[REDACTED]',
  ): Record<string, any> {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sanitized = { ...obj };

    for (const key in sanitized) {
      if (sensitiveFields.includes(key)) {
        sanitized[key] = maskValue;
      } else if (
        typeof sanitized[key] === 'object' &&
        sanitized[key] !== null
      ) {
        sanitized[key] = this.sanitizeObject(
          sanitized[key],
          sensitiveFields,
          maskValue,
        );
      }
    }

    return sanitized;
  }

  /**
   * Remove sensitive fields from an object
   * @param obj Object to clean
   * @param sensitiveFields Array of sensitive field names
   * @returns Cleaned object
   */
  static removeSensitiveFields(
    obj: Record<string, any>,
    sensitiveFields: string[],
  ): Record<string, any> {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const cleaned = { ...obj };

    for (const key in cleaned) {
      if (sensitiveFields.includes(key)) {
        delete cleaned[key];
      } else if (typeof cleaned[key] === 'object' && cleaned[key] !== null) {
        cleaned[key] = this.removeSensitiveFields(
          cleaned[key],
          sensitiveFields,
        );
      }
    }

    return cleaned;
  }
}
