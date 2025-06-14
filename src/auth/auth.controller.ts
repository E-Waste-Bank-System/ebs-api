import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { GetUser } from './decorators/get-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@GetUser() user: any) {
    return this.authService.getCurrentUser(user.id);
  }

  @Get('debug-jwt')
  @Public()
  @ApiOperation({ summary: 'Debug JWT token validation' })
  async debugJwt() {
    return this.authService.debugJwtConfig();
  }

  @Post('verify-token')
  @Public()
  @ApiOperation({ summary: 'Verify a JWT token manually' })
  async verifyToken(@Body() body: { token: string }) {
    return this.authService.verifyTokenManually(body.token);
  }

  @Post('sync-users')
  @Public()
  @ApiOperation({ summary: 'Sync all Supabase Auth users to profiles table (Temporarily public for testing)' })
  @ApiResponse({ status: 200, description: 'Users synced successfully' })
  async syncUsers() {
    return this.authService.syncAllUsers();
  }
} 