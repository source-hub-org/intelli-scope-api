// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard, JwtRefreshTokenGuard, LocalAuthGuard } from './guards';
import {
  LoginDto,
  LoginResponseDto,
  TokenResponseDto,
  RefreshTokenDto,
} from './dto';
import { UserDocument } from '../users';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';

// Interface for request after passing through LocalAuthGuard
interface LoginRequest extends Request {
  user: Omit<UserDocument, 'password_hash' | 'hashedRefreshToken'>; // User has been validated by LocalStrategy
}

// Interface for request after passing through JwtAuthGuard
interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    name: string;
  };
}

// Interface for request after passing through JwtRefreshTokenGuard
interface RefreshTokenRequest extends Request {
  user: {
    userId: string;
    email: string;
    refreshToken: string;
  };
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'User has been successfully logged in',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: LoginRequest) {
    return this.authService.login(req.user);
  }

  @ApiOperation({ summary: 'Get user profile' })
  @ApiOkResponse({
    description: 'Returns the user profile',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: '60d21b4667d0d8992e610c85' },
        email: { type: 'string', example: 'john.doe@example.com' },
        name: { type: 'string', example: 'John Doe' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: AuthenticatedRequest) {
    return req.user;
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    description: 'Returns new access and refresh tokens',
    type: TokenResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  @ApiBearerAuth()
  @UseGuards(JwtRefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Request() req: RefreshTokenRequest) {
    const userId = req.user.userId;
    const currentRefreshToken = req.user.refreshToken;
    return this.authService.refreshToken(userId, currentRefreshToken);
  }

  @ApiOperation({ summary: 'User logout' })
  @ApiOkResponse({ description: 'User has been successfully logged out' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: AuthenticatedRequest) {
    return this.authService.logout(req.user.userId);
  }
}
