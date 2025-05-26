import { applyDecorators, SetMetadata } from '@nestjs/common';

export const LOG_ACTIVITY_METADATA = 'log_activity_metadata';

export interface LogActivityOptions {
  // Type of action being performed
  actionType: 'CREATE_ENTITY' | 'UPDATE_ENTITY' | 'DELETE_ENTITY';

  // Type of resource being affected (e.g., 'User', 'Product')
  resourceType: string;

  // Function to extract resource ID from method arguments
  getResourceId?: (args: any[]) => string;

  // Function to extract resource display name from method arguments
  getResourceName?: (args: any[]) => string;

  // Function to extract entity snapshot from method arguments or result
  getEntitySnapshot?: (args: any[], result: any) => Record<string, any>;

  // Function to extract input payload summary from method arguments
  getInputPayload?: (args: any[]) => Record<string, any>;

  // Function to extract changed fields for update operations
  getChangedFields?: (
    args: any[],
    result: any,
  ) => Array<{ field: string; oldValue: any; newValue: any }>;
}

/**
 * Decorator to log activity when a method is called
 * @param options Configuration options for activity logging
 */
export function LogActivity(options: LogActivityOptions) {
  return applyDecorators(SetMetadata(LOG_ACTIVITY_METADATA, options));
}
