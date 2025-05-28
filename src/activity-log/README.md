# Activity Logging Module for NestJS

This module provides a comprehensive activity logging mechanism for NestJS applications using MongoDB. It captures and records user activities such as API access and data changes (Create/Update/Delete operations).

## Features

- **Automatic API Access Logging**: Logs all API requests made by authenticated users
- **Data Change Logging**: Logs Create/Update/Delete operations on entities
- **Asynchronous Processing**: All logging operations are performed asynchronously to prevent impact on application performance
- **Configurable**: Easily configure what to log and what to exclude
- **Sensitive Data Handling**: Built-in sanitization of sensitive information
- **MongoDB Storage**: All logs are stored in a dedicated MongoDB collection

## Installation

1. Import the `ActivityLogModule` in your application's root module:

```typescript
import { Module } from '@nestjs/common';
import { ActivityLogModule } from './activity-log/activity-log.module';

@Module({
  imports: [
    // ... other modules
    ActivityLogModule,
    // ... other modules
  ],
})
export class AppModule {}
```

2. Ensure you have the required dependencies:

```bash
npm install nestjs-cls
```

## Usage

### Automatic API Access Logging

API access logging is handled automatically by the `ActivityLogInterceptor` which is registered globally. It logs all requests made by authenticated users.

You can configure paths to exclude from logging in your environment variables:

```
ACTIVITY_LOGGING_ENABLED=true
ACTIVITY_LOG_EXCLUDE_PATHS=/health,/metrics,/docs
```

### Logging Data Changes

To log data changes (Create/Update/Delete operations), use the `@LogActivity` decorator on your service methods:

```typescript
import { Injectable } from '@nestjs/common';
import { LogActivity } from '../activity-log/decorators/log-activity.decorator';

@Injectable()
export class UserService {
  @LogActivity({
    actionType: 'CREATE_ENTITY',
    resourceType: 'User',
    getResourceId: (args) => args[0]._id?.toString(),
    getResourceName: (args) => `User: ${args[0].name || args[0].email}`,
    getEntitySnapshot: (args, result) => ({
      _id: result._id,
      email: result.email,
      name: result.name,
      // Exclude sensitive fields
    }),
    getInputPayload: (args) => ({
      email: args[0].email,
      name: args[0].name,
      // Exclude sensitive fields
    }),
  })
  async create(createUserDto: any): Promise<User> {
    // Your implementation
  }
}
```

### Manual Logging

You can also log activities manually using the `ActivityLogService`:

```typescript
import { Injectable } from '@nestjs/common';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class CustomService {
  constructor(
    private readonly activityLogService: ActivityLogService,
    private readonly clsService: ClsService,
  ) {}

  async performCustomAction(data: any): Promise<void> {
    // Your business logic
    
    const user = this.clsService.get('user');
    
    if (user) {
      await this.activityLogService.logActivity({
        userId: user._id,
        actionType: 'CUSTOM_ACTION',
        // ... other log data
      });
    }
  }
}
```

## Configuration

The module can be configured using environment variables:

- `ACTIVITY_LOGGING_ENABLED`: Enable/disable activity logging (default: `true`)
- `ACTIVITY_LOG_SENSITIVE_FIELDS`: Comma-separated list of sensitive fields to redact (default: `password,password_hash,token,secret`)
- `ACTIVITY_LOG_EXCLUDE_PATHS`: Comma-separated list of paths to exclude from logging (default: `/health,/metrics`)

## MongoDB Schema

Activity logs are stored in the `activity_logs` collection with the following structure:

```typescript
{
  _id: ObjectId,
  userId: ObjectId,        // Indexed
  timestamp: Date,         // Indexed, default sort
  actionType: string,      // e.g., "API_ACCESS", "CREATE_ENTITY", etc. (Indexed)
  actor: {
    username: string,
    ipAddress: string,
    userAgent: string      // Optional
  },
  resource: {
    type: string,          // e.g., "User", "Product", etc. (Indexed)
    id: string,            // Optional ID of the specific entity (Indexed)
    displayName: string    // Optional human-readable identifier
  },
  details: {
    // For API_ACCESS
    httpMethod: string,
    httpPath: string,
    requestParams: object,
    requestQuery: object,
    // For CUD operations
    changedFields: [{ field: string, oldValue: any, newValue: any }],
    inputPayloadSummary: object,
    entitySnapshot: object
  },
  operationStatus: string, // "SUCCESS" or "FAILURE"
  failureDetails: {
    errorCode: string,
    message: string
  },
  traceId: string          // For request correlation
}
```

## Best Practices

1. **Handle Sensitive Data**: Always exclude or mask sensitive information in logs
2. **Use Indexes**: The module creates indexes for efficient querying, but consider adding more based on your query patterns
3. **Monitor Collection Size**: Implement a retention policy for logs to prevent excessive database growth
4. **Error Handling**: The module handles errors internally to prevent affecting the main application flow, but monitor for logging errors in your application logs