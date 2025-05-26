import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type UserDocument = User & Document;

@Schema({ timestamps: true }) // Tự động thêm createdAt và updatedAt
export class User {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password_hash: string; // Sẽ lưu password đã hash

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, required: false, default: null }) // Lưu hashed refresh token
  hashedRefreshToken?: string | null;

  // Bạn có thể thêm các trường khác như role, isActive, etc.
}

export const UserSchema = SchemaFactory.createForClass(User);

// Middleware để hash password trước khi lưu
UserSchema.pre<UserDocument>('save', async function (next) {
  // Chỉ hash password nếu nó đã được thay đổi (hoặc là user mới)
  if (!this.isModified('password_hash')) {
    return next();
  }
  // Nếu password_hash được gán trực tiếp (ví dụ: khi tạo user), nó đã được hash từ service rồi
  // Trường hợp này dùng để đảm bảo nếu `this.password_hash` được set bằng plain text thì sẽ được hash
  // Tuy nhiên, logic hash nên nằm ở service để rõ ràng hơn.
  // Để an toàn, nếu password_hash không giống một chuỗi hash bcrypt, ta sẽ hash nó.
  // Nhưng tốt nhất là luôn truyền password đã hash vào đây.
  // Trong ví dụ này, ta sẽ hash password ở service.
  next();
});

// Method để so sánh password (không cần thiết nếu dùng bcrypt.compare ở service)
// UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
//   return bcrypt.compare(candidatePassword, this.password_hash);
// };
