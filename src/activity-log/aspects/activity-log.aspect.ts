/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Injectable, Logger } from '@nestjs/common';
// TODO: The @nestjs/core/aspect module is not available in the current version
// Using placeholder interfaces until the proper module is available
interface WrapParams {
  instance: any;
  methodName: string;
  args: any[];
  proceed: () => Promise<any>;
}

// Placeholder decorators
function Aspect() {
  return function (target: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return target;
  };
}

function LazyDecorator() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    return descriptor;
  };
}

function createDecorator(_aspect: any) {
  return function () {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor,
    ) {
      return descriptor;
    };
  };
}
import { Observable, catchError, from, of, switchMap, throwError } from 'rxjs';
import { ActivityLogService } from '../activity-log.service';
import {
  LOG_ACTIVITY_METADATA,
  LogActivityOptions,
} from '../decorators/log-activity.decorator';
import { ClsService } from 'nestjs-cls';

@Aspect()
@Injectable()
export class ActivityLogAspect {
  private readonly logger = new Logger(ActivityLogAspect.name);

  constructor(
    private readonly activityLogService: ActivityLogService,
    private readonly clsService: ClsService,
  ) {}

  /**
   * Create a decorator that logs activity when a method is called
   */
  @LazyDecorator()
  static logActivity(): unknown {
    return createDecorator(ActivityLogAspect);
  }

  /**
   * Method that wraps the decorated method to log activity
   */
  wrap(params: WrapParams): Observable<unknown> {
    const { instance, methodName, args } = params;

    try {
      // Get metadata from the decorator
      const metadata = Reflect.getMetadata(
        LOG_ACTIVITY_METADATA,
        instance.constructor.prototype,
        methodName,
      ) as LogActivityOptions;

      if (!metadata) {
        return from(params.proceed());
      }

      // Get user from CLS context
      const user = this.clsService.get('user');
      if (!user) {
        return from(params.proceed());
      }

      // Get trace ID from CLS context
      const traceId = this.clsService.getId();

      // Execute the original method and log activity
      return from(params.proceed()).pipe(
        switchMap((result) => {
          // Log activity asynchronously
          this.logMethodActivity({
            user,
            metadata,
            args,
            result,
            traceId,
            status: 'SUCCESS',
          });
          return of(result);
        }),
        catchError((error: unknown) => {
          // Log failed activity asynchronously
          this.logMethodActivity({
            user,
            metadata,
            args,
            result: null,
            traceId,
            status: 'FAILURE',
            error,
          });
          return throwError(() => error);
        }),
      );
    } catch (_error) {
      // If anything fails in our wrapper, just proceed with the original method
      return from(params.proceed());
    }
  }

  /**
   * Log activity for a method call
   */
  private logMethodActivity({
    user,
    metadata,
    args,
    result,
    traceId,
    status,
    error = null,
  }: {
    user: Record<string, unknown>;
    metadata: LogActivityOptions;
    args: unknown[];
    result: unknown;
    traceId: string;
    status: 'SUCCESS' | 'FAILURE';
    error?: unknown;
  }): void {
    try {
      const {
        actionType,
        resourceType,
        getResourceId,
        getResourceName,
        getEntitySnapshot,
        getInputPayload,
        getChangedFields,
      } = metadata;

      // Extract resource ID if function provided
      const resourceId = getResourceId ? getResourceId(args) : undefined;

      // Extract resource name if function provided
      const resourceName = getResourceName ? getResourceName(args) : undefined;

      // Prepare log data
      const logData = {
        userId: user._id as string,
        actionType,
        timestamp: new Date(),
        actor: {
          username:
            (user.name as string) || (user.email as string) || 'unknown',
          ipAddress: this.clsService.get('ipAddress') || 'unknown',
          userAgent: this.clsService.get('userAgent'),
        },
        resource: {
          type: resourceType,
          id: resourceId,
          displayName: resourceName,
        },
        details: {},
        operationStatus: status,
        traceId,
      };

      // Add entity snapshot if applicable
      if (getEntitySnapshot && status === 'SUCCESS') {
        logData.details['entitySnapshot'] = getEntitySnapshot(args, result);
      }

      // Add input payload if applicable
      if (getInputPayload) {
        logData.details['inputPayloadSummary'] = getInputPayload(args);
      }

      // Add changed fields for update operations
      if (
        actionType === 'UPDATE_ENTITY' &&
        getChangedFields &&
        status === 'SUCCESS'
      ) {
        logData.details['changedFields'] = getChangedFields(args, result);
      }

      // Add failure details if applicable
      if (status === 'FAILURE' && error) {
        const err = error as Record<string, unknown>;
        logData['failureDetails'] = {
          errorCode:
            (err.code as string) || (err.status as string) || 'UNKNOWN',
          message: (err.message as string) || 'Unknown error',
        };
      }

      // Log asynchronously
      void this.activityLogService.logActivity(logData as any);
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        `Failed to log method activity: ${error.message}`,
        error.stack,
      );
    }
  }
}
