import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
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

@ApiTags('🔐 Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @ApiOperation({ 
    summary: 'Login with email and password',
    description: `
      Authenticate user with email and password credentials. Returns JWT token for API access.
      
      **Login Flow:**
      1. User provides email and password
      2. System validates credentials against Supabase Auth
      3. Creates or updates local user profile
      4. Returns JWT token and user information
      
      **Token Usage:**
      Use the returned access_token in the Authorization header for subsequent requests:
      \`Authorization: Bearer <access_token>\`
    `
  })
  @ApiBody({
    type: LoginDto,
    examples: {
      admin: {
        summary: 'Admin Login',
        description: 'Login as administrator',
        value: {
          email: 'admin@ebs.com',
          password: 'admin123'
        }
      },
      user: {
        summary: 'Regular User Login',
        description: 'Login as regular user',
        value: {
          email: 'user@example.com',
          password: 'password123'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful - JWT token and user profile returned',
    type: AuthResponseDto,
    example: {
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        full_name: 'John Doe',
        role: 'USER',
        avatar_url: 'https://example.com/avatar.jpg'
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Invalid credentials - email or password incorrect',
    type: ErrorResponseDto,
    example: {
      statusCode: 401,
      message: 'Invalid credentials',
      error: 'Unauthorized',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/auth/login'
    }
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
    summary: 'Generate token for Google OAuth users',
    description: `
      Generate a JWT access token for users authenticated via Google OAuth through Supabase Auth.
      
      **Google OAuth Flow:**
      1. User signs in with Google via Supabase Auth (frontend)
      2. Frontend receives Supabase user ID from OAuth callback
      3. Frontend calls this endpoint with the user_id
      4. Backend validates user exists in Supabase and creates/updates local profile
      5. Returns JWT token for API authentication
      
      **Integration:**
      This endpoint bridges Google OAuth authentication with the EBS API token system,
      enabling seamless integration between Supabase Auth and the NestJS backend.
    `
  })
  @ApiBody({
    type: GenerateTokenDto,
    examples: {
      googleUser: {
        summary: 'Google OAuth User',
        description: 'Generate token for Google authenticated user',
        value: {
          user_id: '550e8400-e29b-41d4-a716-446655440000'
        }
      }
    }
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
        id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
        email: { type: 'string', format: 'email', example: 'user@example.com' },
        full_name: { type: 'string', example: 'John Doe' },
        avatar_url: { type: 'string', format: 'uri', example: 'https://example.com/avatar.jpg' },
        role: { type: 'string', enum: ['USER', 'ADMIN', 'SUPERADMIN'], example: 'USER' },
        is_active: { type: 'boolean', example: true },
        email_verified: { type: 'boolean', example: true },
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
    description: '🔧 Development endpoint to debug JWT token configuration and settings'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'JWT configuration details',
    schema: {
      type: 'object',
      properties: {
        hasJwtSecret: { type: 'boolean', example: true },
        jwtSecretLength: { type: 'number', example: 64 },
        jwtSecretPreview: { type: 'string', example: 'supersecret...' },
        nodeEnv: { type: 'string', example: 'development' }
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
    description: '🔧 Manually verify the validity of a JWT token - useful for debugging and testing'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { 
          type: 'string', 
          description: 'JWT token to verify',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      },
      required: ['token']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Token verification result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', example: true },
        decoded: { 
          type: 'object',
          properties: {
            sub: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            email: { type: 'string', example: 'user@example.com' },
            role: { type: 'string', example: 'USER' },
            iat: { type: 'number', example: 1642618800 },
            exp: { type: 'number', example: 1642705200 }
          }
        },
        message: { type: 'string', example: 'Token is valid' }
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
      
      **Use Cases:**
      - Initial data migration
      - Sync after bulk user operations
      - Recovery from data inconsistencies
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Users synchronized successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User sync completed successfully' },
        synced: { type: 'number', example: 15 },
        skipped: { type: 'number', example: 3 },
        total: { type: 'number', example: 18 }
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