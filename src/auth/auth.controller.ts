import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, GenerateTokenDto, AuthResponseDto, VerifyTokenDto, SyncUsersDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import { UserRole } from '../common/enums/role.enum';
import { GetUser } from './decorators/get-user.decorator';
import { ErrorResponseDto } from '../common/dto/response.dto';
import { Auth } from '../common/decorators/auth.decorator';
import { AppLogger } from '../common/utils/logger.util';
import { UserProfileDto } from '../common/dto/user-profile.dto';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('🔐 Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = AppLogger.getInstance('AuthController');

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @ApiOperation({ 
    summary: 'Login with email and password',
    description: `
      Authenticate user with email and password credentials. Returns JWT token for API access.
      \n      **Login Flow:**
      1. User provides email and password
      2. System validates credentials against Supabase Auth
      3. Creates or updates local user profile
      4. Returns JWT token and user information
      \n      **Token Usage:**
      Use the returned access_token in the Authorization header for subsequent requests:
      Authorization: Bearer <access_token>
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
    type: ErrorResponseDto,
    example: {
      statusCode: 429,
      message: 'Too many requests',
      error: 'Too Many Requests',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/auth/login'
    }
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    this.logger.logDebug(`Login attempt for email: ${loginDto.email}`);
    return this.authService.login(loginDto);
  }

  @Post('token')
  @Public()
  @ApiOperation({ 
    summary: 'Generate JWT token for user',
    description: `
      Generate a new JWT token for an authenticated user. This endpoint is typically used
      to refresh tokens or generate tokens for users who are already authenticated.
      \n      **Token Generation:**
      1. User must be authenticated (provide valid session)
      2. System generates new JWT token
      3. Returns token and user information
    `
  })
  @ApiBody({
    type: GenerateTokenDto,
    examples: {
      default: {
        summary: 'Generate Token',
        description: 'Generate JWT token for authenticated user',
        value: {
          user_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Token generated successfully',
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
    status: 400, 
    description: 'Invalid request - missing or invalid user_id',
    type: ErrorResponseDto,
    example: {
      statusCode: 400,
      message: 'User ID is required',
      error: 'Bad Request',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/auth/token'
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - invalid or missing authentication',
    type: ErrorResponseDto,
    example: {
      statusCode: 401,
      message: 'Unauthorized',
      error: 'Unauthorized',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/auth/token'
    }
  })
  async generateToken(@Body() generateTokenDto: GenerateTokenDto): Promise<AuthResponseDto> {
    this.logger.logDebug(`Token generation requested for user: ${generateTokenDto.user_id}`);
    return this.authService.generateTokenForGoogleUser(generateTokenDto.user_id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get current user profile',
    description: `
      Retrieve the profile information for the currently authenticated user.
      \n      **Authentication:**
      Requires valid JWT token in Authorization header:
      Authorization: Bearer <access_token>
      \n      **Profile Information:**
      Returns user details including ID, email, name, role, and avatar URL.
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User profile retrieved successfully',
    type: UserProfileDto,
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      full_name: 'John Doe',
      role: 'USER',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: '2024-01-15T10:30:00.000Z',
      updated_at: '2024-01-15T10:30:00.000Z'
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - invalid or missing JWT token',
    type: ErrorResponseDto,
    example: {
      statusCode: 401,
      message: 'Unauthorized',
      error: 'Unauthorized',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/auth/profile'
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User profile not found',
    type: ErrorResponseDto,
    example: {
      statusCode: 404,
      message: 'User profile not found',
      error: 'Not Found',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/auth/profile'
    }
  })
  async getProfile(@GetUser() user: any) {
    this.logger.logDebug(`Profile requested for user: ${user?.id}, user object:`, user);
    
    if (!user || !user.id) {
      this.logger.error('No user object or user ID found in request');
      throw new UnauthorizedException('User not authenticated');
    }
    
    try {
      const profile = await this.authService.getCurrentUser(user.id);
      this.logger.logDebug(`Profile retrieved successfully for user: ${profile.id} (${profile.email})`);
      return profile;
    } catch (error) {
      this.logger.error(`Error getting profile for user ${user?.id}:`, error);
      throw error;
    }
  }



  @Post('verify-token')
  @Public()
  @ApiOperation({ 
    summary: 'Verify JWT token manually',
    description: 'Debug endpoint to verify JWT token'
  })
  async verifyToken(@Body() body: { token: string }) {
    this.logger.logDebug(`Token verification requested`);
    try {
      const decoded = await this.authService.verifyTokenManually(body.token);
      return { success: true, decoded };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Get('debug')
  @Auth(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'Debug authentication information',
    description: `
      Retrieve debug information about the current authentication session.
      This endpoint is only available to administrators and provides detailed
      information about the JWT token and user session.
      \n      **Debug Information:**
      - JWT token payload
      - User session details
      - Authentication metadata
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Debug information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
            email: { type: 'string', format: 'email', example: 'admin@ebs.com' },
            full_name: { type: 'string', example: 'Admin User' },
            role: { type: 'string', enum: ['USER', 'ADMIN', 'SUPERADMIN'], example: 'ADMIN' }
          }
        },
        token: {
          type: 'object',
          properties: {
            sub: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            email: { type: 'string', example: 'admin@ebs.com' },
            role: { type: 'string', example: 'ADMIN' },
            iat: { type: 'number', example: 1705312200 },
            exp: { type: 'number', example: 1705315800 }
          }
        },
        session: {
          type: 'object',
          properties: {
            authenticated: { type: 'boolean', example: true },
            token_valid: { type: 'boolean', example: true },
            expires_in: { type: 'number', example: 3600 }
          }
        }
      }
    },
    example: {
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'admin@ebs.com',
        full_name: 'Admin User',
        role: 'ADMIN'
      },
      token: {
        sub: '123e4567-e89b-12d3-a456-426614174000',
        email: 'admin@ebs.com',
        role: 'ADMIN',
        iat: 1705312200,
        exp: 1705315800
      },
      session: {
        authenticated: true,
        token_valid: true,
        expires_in: 3600
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - invalid or missing JWT token',
    type: ErrorResponseDto,
    example: {
      statusCode: 401,
      message: 'Unauthorized',
      error: 'Unauthorized',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/auth/debug'
    }
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - insufficient permissions (requires ADMIN or SUPERADMIN role)',
    type: ErrorResponseDto,
    example: {
      statusCode: 403,
      message: 'Forbidden - Admin access required',
      error: 'Forbidden',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/auth/debug'
    }
  })
  async debug() {
    this.logger.logDebug('Debug endpoint accessed');
    return this.authService.debugAuthenticationInfo();
  }

  @Post('sync')
  @Auth(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ 
    summary: 'Sync user data with Supabase',
    description: `
      Synchronize user data between the local database and Supabase Auth.
      This endpoint is used by administrators to ensure data consistency
      between the EBS API and Supabase authentication system.
      \n      **Sync Process:**
      1. Fetch user data from Supabase Auth
      2. Update local user profiles
      3. Return sync results and statistics
    `
  })
  @ApiBody({
    type: SyncUsersDto,
    examples: {
      full: {
        summary: 'Full Sync',
        description: 'Sync all users from Supabase',
        value: {
          sync_all: true
        }
      },
      specific: {
        summary: 'Specific User Sync',
        description: 'Sync specific user by email',
        value: {
          sync_all: false,
          user_email: 'user@example.com'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User sync completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'User sync completed successfully' },
        stats: {
          type: 'object',
          properties: {
            total_users: { type: 'number', example: 150 },
            synced_users: { type: 'number', example: 145 },
            new_users: { type: 'number', example: 5 },
            updated_users: { type: 'number', example: 140 },
            errors: { type: 'number', example: 0 }
          }
        },
        details: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              email: { type: 'string', example: 'user@example.com' },
              status: { type: 'string', example: 'synced' },
              action: { type: 'string', example: 'updated' }
            }
          }
        }
      }
    },
    example: {
      success: true,
      message: 'User sync completed successfully',
      stats: {
        total_users: 150,
        synced_users: 145,
        new_users: 5,
        updated_users: 140,
        errors: 0
      },
      details: [
        {
          email: 'user@example.com',
          status: 'synced',
          action: 'updated'
        },
        {
          email: 'newuser@example.com',
          status: 'synced',
          action: 'created'
        }
      ]
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid sync parameters',
    type: ErrorResponseDto,
    example: {
      statusCode: 400,
      message: 'Invalid sync parameters',
      error: 'Bad Request',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/auth/sync'
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - invalid or missing JWT token',
    type: ErrorResponseDto,
    example: {
      statusCode: 401,
      message: 'Unauthorized',
      error: 'Unauthorized',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/auth/sync'
    }
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - insufficient permissions (requires ADMIN or SUPERADMIN role)',
    type: ErrorResponseDto,
    example: {
      statusCode: 403,
      message: 'Forbidden - Admin access required',
      error: 'Forbidden',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/auth/sync'
    }
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error during sync process',
    type: ErrorResponseDto,
    example: {
      statusCode: 500,
      message: 'Failed to sync users with Supabase',
      error: 'Internal Server Error',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/auth/sync'
    }
  })
  async syncUsers(@Body() syncUsersDto: SyncUsersDto) {
    this.logger.logInfo('User synchronization requested by admin');
    return this.authService.syncUsers(syncUsersDto);
  }
} 