// src/auth/local-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  // Sử dụng strategy 'local'
  // Bạn có thể override các phương thức như canActivate nếu cần logic phức tạp hơn
  // Ví dụ: để tự động log attempt hoặc xử lý lỗi theo cách khác
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
