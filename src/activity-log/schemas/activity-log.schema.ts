import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ActivityLogDocument = ActivityLog & Document;

// Define sub-schemas for nested objects
@Schema({ _id: false })
class Actor {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  ipAddress: string;

  @Prop()
  userAgent?: string;
}

@Schema({ _id: false })
class Resource {
  @Prop({ required: true, index: true })
  type: string;

  @Prop({ index: true })
  id?: string;

  @Prop()
  displayName?: string;
}

@Schema({ _id: false })
class ChangedField {
  @Prop({ required: true })
  field: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  oldValue?: any;

  @Prop({ type: MongooseSchema.Types.Mixed })
  newValue?: any;
}

@Schema({ _id: false })
class Details {
  @Prop()
  httpMethod?: string;

  @Prop()
  httpPath?: string;

  @Prop({ type: Object })
  requestParams?: Record<string, any>;

  @Prop({ type: Object })
  requestQuery?: Record<string, any>;

  @Prop({ type: [ChangedField] })
  changedFields?: ChangedField[];

  @Prop({ type: Object })
  inputPayloadSummary?: Record<string, any>;

  @Prop({ type: Object })
  entitySnapshot?: Record<string, any>;
}

@Schema({ _id: false })
class FailureDetails {
  @Prop()
  errorCode?: string;

  @Prop()
  message?: string;
}

@Schema({ collection: 'activity_logs', timestamps: true })
export class ActivityLog {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    index: true,
    ref: 'User',
  })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({
    required: true,
    default: Date.now,
    index: true,
  })
  timestamp: Date;

  @Prop({
    required: true,
    index: true,
    enum: [
      'API_ACCESS',
      'LOGIN_SUCCESS',
      'LOGIN_FAILURE',
      'LOGOUT',
      'CREATE_ENTITY',
      'UPDATE_ENTITY',
      'DELETE_ENTITY',
    ],
  })
  actionType: string;

  @Prop({ type: Actor, required: true })
  actor: Actor;

  @Prop({ type: Resource, required: true })
  resource: Resource;

  @Prop({ type: Details })
  details?: Details;

  @Prop({
    required: true,
    enum: ['SUCCESS', 'FAILURE'],
    default: 'SUCCESS',
  })
  operationStatus: string;

  @Prop({ type: FailureDetails })
  failureDetails?: FailureDetails;

  @Prop()
  traceId?: string;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

// Create indexes for efficient querying
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ actionType: 1, timestamp: -1 });
ActivityLogSchema.index({ 'resource.type': 1, 'resource.id': 1 });
ActivityLogSchema.index({ timestamp: -1 }); // For general time-based queries
