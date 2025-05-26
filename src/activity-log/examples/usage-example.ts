/**
 * This file provides examples of how to use the activity logging module
 * in a NestJS application. It is not meant to be executed directly.
 *
 * @file This is an example file only, not meant to be executed
 * @eslint-disable
 */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

// Example 1: Import the ActivityLogModule in your app.module.ts
import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log.module';

@Module({
  imports: [
    // ... other modules
    ActivityLogModule,
    // ... other modules
  ],
})
export class AppModule {}

// Example 2: Using the @LogActivity decorator in a service
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LogActivity } from '../decorators/log-activity.decorator';
import { User, UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // Example of logging a create operation
  @LogActivity({
    actionType: 'CREATE_ENTITY',
    resourceType: 'User',
    getResourceId: (args) => args[0]._id?.toString(),
    getResourceName: (args) => `User: ${args[0].name || args[0].email}`,
    getEntitySnapshot: (args, result) => ({
      _id: result._id,
      email: result.email,
      name: result.name,
      // Exclude sensitive fields like password_hash
    }),
    getInputPayload: (args) => ({
      email: args[0].email,
      name: args[0].name,
      // Exclude sensitive fields like password
    }),
  })
  async create(createUserDto: any): Promise<User> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  // Example of logging an update operation
  @LogActivity({
    actionType: 'UPDATE_ENTITY',
    resourceType: 'User',
    getResourceId: (args) => args[0], // First argument is userId
    getResourceName: (args) =>
      `User: ${args[0]?.name || args[0]?.email || 'Unknown'}`,
    getInputPayload: (args) => args[1], // Second argument is updateUserDto
    getChangedFields: (args, result) => {
      // Using _userId to indicate it's intentionally unused in this example
      const _userId = args[0];
      const updateData = args[1];

      // In a real implementation, you would fetch the old user data
      // and compare with the result. For this example, we'll simplify:
      return Object.keys(updateData).map((field) => ({
        field,
        oldValue: 'Previous value', // This would be oldUser[field] in real code
        newValue: result[field],
      }));
    },
  })
  async update(userId: string, updateUserDto: any): Promise<User> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, updateUserDto, { new: true })
      .exec();

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return updatedUser;
  }

  // Example of logging a delete operation
  @LogActivity({
    actionType: 'DELETE_ENTITY',
    resourceType: 'User',
    getResourceId: (args) => args[0], // First argument is userId
    getEntitySnapshot: (args, _result) => {
      // In a real implementation, you would fetch the user data
      // For this example, we'll return a simplified object
      return {
        _id: args[0], // userId
        email: 'user@example.com',
        name: 'User Name',
        // Exclude sensitive fields
      };
    },
  })
  async remove(userId: string): Promise<void> {
    await this.userModel.findByIdAndDelete(userId).exec();
  }
}

// Example 3: Manually logging an activity from anywhere in your application
import { ActivityLogService } from '../activity-log.service';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class CustomService {
  constructor(
    private readonly activityLogService: ActivityLogService,
    private readonly clsService: ClsService,
  ) {}

  async performCustomAction(data: any): Promise<void> {
    // Your business logic here

    // Get user from CLS context
    const user = this.clsService.get('user');

    // Manually log the activity
    if (user) {
      await this.activityLogService.logActivity({
        userId: user._id,
        actionType: 'CUSTOM_ACTION',
        timestamp: new Date(),
        actor: {
          username: user.name || user.email || 'unknown',
          ipAddress: this.clsService.get('ipAddress') || 'unknown',
          userAgent: this.clsService.get('userAgent'),
        },
        resource: {
          type: 'CustomResource',
          id: data.id,
          displayName: `Custom: ${data.name}`,
        },
        details: {
          inputPayloadSummary: {
            // Include relevant, non-sensitive data
            name: data.name,
            type: data.type,
          },
        },
        operationStatus: 'SUCCESS',
        traceId: this.clsService.getId(),
      });
    }
  }
}
