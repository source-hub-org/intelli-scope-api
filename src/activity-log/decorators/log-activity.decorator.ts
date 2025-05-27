import { Logger } from '@nestjs/common';
import 'reflect-metadata';

const logger = new Logger('LogActivityDecorator');

/**
 * Metadata key for LogActivity decorator
 */
export const LOG_ACTIVITY_METADATA = 'log_activity_metadata';

/**
 * Type definition for the details function
 */
export type DetailsFunction = (args: any[], result: any) => Record<string, any>;

/**
 * Options for the LogActivity decorator
 */
export interface LogActivityOptions {
  actionType: string;
  resourceType: string;
  getResourceId?: (args: any[]) => string | undefined;
  getResourceName?: (args: any[]) => string | undefined;
  getEntitySnapshot?: (args: any[], result: any) => Record<string, any>;
  getInputPayload?: (args: any[]) => Record<string, any>;
  getChangedFields?: (
    args: any[],
    result: any,
  ) => Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}

/**
 * Decorator to log activity when a method is called
 * @param options Configuration options for activity logging
 */
export function LogActivity(options: LogActivityOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    // Store metadata on the method
    Reflect.defineMetadata(LOG_ACTIVITY_METADATA, options, target, propertyKey);

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

        // Try to find userId in the first argument or from the options
        const userId =
          typeof args[0] === 'string'
            ? args[0]
            : options.getResourceId
              ? options.getResourceId(args)
              : undefined;

        // Only log if we have a userId
        if (userId) {
          // Prepare details
          let details: Record<string, any> = {};

          if (options.getEntitySnapshot) {
            details.entitySnapshot = options.getEntitySnapshot(args, result);
          }

          if (options.getInputPayload) {
            details.inputPayload = options.getInputPayload(args);
          }

          if (options.getChangedFields) {
            details.changedFields = options.getChangedFields(args, result);
          }

          // If no specific details were added, include default details
          if (Object.keys(details).length === 0) {
            details = {
              args,
              result,
            };
          }

          // Log the activity
          await activityLogService.logActivity({
            userId,
            action: options.actionType,
            resource: options.resourceType,
            details,
          });
        }

        return result;
      } catch (error) {
        // If there's an error, log it as part of the activity
        const userId =
          typeof args[0] === 'string'
            ? args[0]
            : options.getResourceId
              ? options.getResourceId(args)
              : undefined;

        if (userId) {
          await activityLogService.logActivity({
            userId,
            action: options.actionType,
            resource: options.resourceType,
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
