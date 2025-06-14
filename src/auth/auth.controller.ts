import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, GenerateTokenDto, AuthResponseDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { GetUser } from './decorators/get-user.decorator';
import { ErrorResponseDto } from '../common/dto/response.dto';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @ApiOperation({ 
    summary: 'Email/password login',
    description: 'Authenticate user with email and password credentials. Returns JWT token for API access.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful - JWT token and user profile returned',
    type: AuthResponseDto
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Invalid credentials - email or password incorrect',
    type: ErrorResponseDto
  })
  @ApiResponse({ 
    status: 429, 
    description: 'Too many requests - rate limit exceeded',
    type: ErrorResponseDto
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('token')
  @Public()
  @ApiOperation({ 
    summary: 'Generate token for Google sign-in users',
    description: `
      Generate a JWT access token for users who have authenticated via Google OAuth through Supabase Auth.
      
      **Usage Flow:**
      1. User signs in with Google via Supabase Auth (frontend)
      2. Frontend receives Supabase user ID
      3. Frontend calls this endpoint with the user_id
      4. Backend validates user exists in Supabase and creates/updates local profile
      5. Returns JWT token for API authentication
      
      This endpoint bridges Google OAuth authentication with the EBS API token system.
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Token generated successfully - JWT token and user profile returned',
    type: AuthResponseDto
  })
  @ApiResponse({ 
    status: 401, 
    description: 'User not found in Supabase Auth or unauthorized',
    type: ErrorResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid user_id format or missing required fields',
    type: ErrorResponseDto
  })
  async generateToken(@Body() generateTokenDto: GenerateTokenDto): Promise<AuthResponseDto> {
    return this.authService.generateTokenForGoogleUser(generateTokenDto.user_id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get current user profile',
    description: 'Retrieve the profile information of the currently authenticated user'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        full_name: { type: 'string' },
        avatar_url: { type: 'string', format: 'uri' },
        role: { type: 'string', enum: ['user', 'admin', 'superadmin'] },
        is_active: { type: 'boolean' },
        email_verified: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        last_login_at: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - invalid or missing JWT token',
    type: ErrorResponseDto
  })
  async getProfile(@GetUser() user: any) {
    return this.authService.getCurrentUser(user.id);
  }

  @Get('debug-jwt')
  @Public()
  @ApiOperation({ 
    summary: 'Debug JWT configuration',
    description: 'Development endpoint to debug JWT token configuration and settings'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'JWT configuration details',
    schema: {
      type: 'object',
      properties: {
        jwtSecretConfigured: { type: 'boolean' },
        jwtSecretLength: { type: 'number' },
        expiresIn: { type: 'string' },
        environment: { type: 'string' }
      }
    }
  })
  async debugJwt() {
    return this.authService.debugJwtConfig();
  }

  @Post('verify-token')
  @Public()
  @ApiOperation({ 
    summary: 'Verify JWT token manually',
    description: 'Manually verify the validity of a JWT token - useful for debugging and testing'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Token verification result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        decoded: { type: 'object' },
        message: { type: 'string' },
        error: { type: 'string' }
      }
    }
  })
  async verifyToken(@Body() body: { token: string }) {
    return this.authService.verifyTokenManually(body.token);
  }

  @Post('sync-users')
  @Public()
  @ApiOperation({ 
    summary: 'Sync Supabase users to local database',
    description: `
      **⚠️ Administrative Function**
      
      Synchronize all users from Supabase Auth to the local profiles database.
      This endpoint is temporarily public for testing but should be restricted in production.
      
      **What it does:**
      - Fetches all users from Supabase Auth
      - Creates missing profiles in local database
      - Updates existing profiles with latest data
      - Cleans up invalid entries
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Users synchronized successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        syncedCount: { type: 'number' },
        skippedCount: { type: 'number' },
        totalUsers: { type: 'number' }
      }
    }
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Synchronization failed',
    type: ErrorResponseDto
  })
  async syncUsers() {
    return this.authService.syncAllUsers();
  }
} 