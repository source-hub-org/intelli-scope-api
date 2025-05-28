// src/auth/local-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  // Using 'local' strategy
  // You can override methods like canActivate if you need more complex logic
  // Example: to automatically log attempts or handle errors differently
  // canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
  //   // console.log('LocalAuthGuard canActivate called');
  //   return super.canActivate(context);
  // }
  // handleRequest(err, user, info, context, status) {
  //   // console.log('LocalAuthGuard handleRequest:', { err, user, info, status });
  //   if (err || !user) {
  //     throw err || new UnauthorizedException(info?.message || 'Unauthorized');
  //   }
  //   return user;
  // }
}
