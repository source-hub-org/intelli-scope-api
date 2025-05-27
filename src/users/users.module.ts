import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { UserCrudService } from './services/user-crud.service';
import { UserAuthenticationService } from './services/user-authentication.service';

/**
 * Module for user management functionality
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [
    // Main service (facade)
    UsersService,

    // Specialized services
    UserCrudService,
    UserAuthenticationService,
  ],
  exports: [
    // Export services that other modules might need
    UsersService,
    UserCrudService,
    UserAuthenticationService,
  ],
})
export class UsersModule {}
