import { Logger } from '@nestjs/common';

const logger = new Logger('LogActivityDecorator');

/**
 * Type definition for the details function
 */
export type DetailsFunction = (args: any[], result: any) => Record<string, any>;

/**
 * Decorator to log activity when a method is called
 * @param action The action being performed (e.g., 'create', 'update', 'delete')
 * @param resource The resource being affected (e.g., 'user', 'product')
 * @param detailsFunction Optional function to customize the details logged
 */
export function LogActivity(
  action: string,
  resource: string,
  detailsFunction?: DetailsFunction,
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Try to find the ActivityLogService in the class instance
      const activityLogService = this.activityLogService;

      if (!activityLogService) {
        logger.warn(
          `ActivityLogService not found in ${target.constructor.name}. Activity will not be logged.`,
        );
        return originalMethod.apply(this, args);
      }

      try {
        // Execute the original method
        const result = await originalMethod.apply(this, args);

        // Try to find userId in the first argument
        const userId = typeof args[0] === 'string' ? args[0] : undefined;

        // Only log if we have a userId
        if (userId) {
          // Prepare details
          let details: Record<string, any>;

          if (detailsFunction) {
            // Use custom details function if provided
            details = detailsFunction(args, result);
          } else {
            // Default details include args and result
            details = {
              args,
              result,
            };
          }

          // Log the activity
          await activityLogService.logActivity({
            userId,
            action,
            resource,
            details,
          });
        }

        return result;
      } catch (error) {
        // If there's an error, log it as part of the activity
        if (typeof args[0] === 'string') {
          const userId = args[0];

          await activityLogService.logActivity({
            userId,
            action,
            resource,
            details: {
              args,
              error: error instanceof Error ? error.message : String(error),
            },
          });
        }

        // Re-throw the error
        throw error;
      }
    };

    return descriptor;
  };
}
