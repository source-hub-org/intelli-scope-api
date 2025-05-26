import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
// import * as bcrypt from 'bcrypt';

export type UserDocument = User & Document;

@Schema({ timestamps: true }) // Automatically adds createdAt and updatedAt
export class User {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password_hash: string; // Will store hashed password

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, required: false, default: null }) // Stores hashed refresh token
  hashedRefreshToken?: string | null;

  // You can add other fields like role, isActive, etc.
}

export const UserSchema = SchemaFactory.createForClass(User);

// Middleware to hash password before saving
UserSchema.pre<UserDocument>('save', function (next) {
  // Only hash password if it has been modified (or is a new user)
  if (!this.isModified('password_hash')) {
    return next();
  }
  // If password_hash is assigned directly (e.g., when creating a user), it has already been hashed by the service
  // This case is to ensure that if `this.password_hash` is set to plain text, it will be hashed
  // However, the hash logic should be in the service for clarity.
  // For safety, if password_hash doesn't look like a bcrypt hash string, we would hash it.
  // But it's best to always pass in an already hashed password here.
  // In this example, we will hash the password in the service.
  next();
});

// Method to compare password (not necessary if using bcrypt.compare in the service)
// UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
//   return bcrypt.compare(candidatePassword, this.password_hash);
// };
