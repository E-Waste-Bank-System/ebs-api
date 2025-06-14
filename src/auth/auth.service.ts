import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { SupabaseService } from '../supabase/supabase.service';
import { Profile } from '../profiles/entities/profile.entity';
import { UserRole } from '../common/enums/role.enum';
import { LoginDto, AuthResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    try {
      console.log('Login attempt for email:', email);
      
      // Debug: Check if JWT_SECRET is loaded
      const jwtSecret = this.configService.get('JWT_SECRET');
      console.log('JWT_SECRET loaded:', jwtSecret ? 'Yes (length: ' + jwtSecret.length + ')' : 'No');
      
      // Authenticate with Supabase Auth
      const { data, error } = await this.supabaseService
        .getClient()
        .auth.signInWithPassword({
          email,
          password,
        });

      if (error || !data.user) {
        console.log('Supabase Auth failed:', error?.message);
        throw new UnauthorizedException('Invalid credentials');
      }

      console.log('Supabase Auth successful, syncing profile...');

      // Get or create profile in our database
      let profile = await this.profileRepository.findOne({
        where: { email: data.user.email },
      });

      if (!profile) {
        console.log('Profile not found, creating from Supabase data...');
        // Create new profile from Supabase user data
        profile = this.profileRepository.create({
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
          avatar_url: data.user.user_metadata?.avatar_url,
          role: UserRole.USER, // Default role, admins can change this
          is_active: true,
          email_verified: data.user.email_confirmed_at ? true : false,
        });
        profile = await this.profileRepository.save(profile);
        
        // Update the profile with the Supabase user ID after saving
        profile.id = data.user.id;
        profile = await this.profileRepository.save(profile);
        
        console.log('New profile created:', profile.id);
      } else {
        console.log('Profile found, updating last login...');
        // Update last login
        profile.last_login_at = new Date();
        await this.profileRepository.save(profile);
      }

      // Generate JWT token manually
      const payload = { 
        sub: profile.id, 
        email: profile.email,
        role: profile.role,
      };
      
      console.log('About to sign JWT with payload:', payload);
      
      // Use jsonwebtoken directly instead of JwtService
      const access_token = jwt.sign(payload, jwtSecret, { 
        expiresIn: this.configService.get('JWT_EXPIRES_IN') || '24h' 
      });

      console.log('Login successful for user:', profile.id);

      return {
        access_token,
        user: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
          avatar_url: profile.avatar_url,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async getCurrentUser(userId: string): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: { id: userId },
    });

    if (!profile) {
      throw new UnauthorizedException('User not found');
    }

    return profile;
  }

  async validateGoogleLogin(profile: any): Promise<AuthResponseDto> {
    try {
      let user = await this.profileRepository.findOne({
        where: { email: profile.email },
      });

      if (!user) {
        user = this.profileRepository.create({
          email: profile.email,
          full_name: profile.name,
          avatar_url: profile.picture,
        });
        await this.profileRepository.save(user);
      }

      user.last_login_at = new Date();
      await this.profileRepository.save(user);

      const payload = { 
        sub: user.id, 
        email: user.email,
        role: user.role,
      };
      
      const jwtSecret = this.configService.get('JWT_SECRET');
      const access_token = jwt.sign(payload, jwtSecret, { 
        expiresIn: this.configService.get('JWT_EXPIRES_IN') || '24h' 
      });

      return {
        access_token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          avatar_url: user.avatar_url,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  async syncAllUsers() {
    try {
      console.log('Starting sync of all Supabase Auth users...');
      
      // First, clean up any existing empty email entries
      await this.cleanupEmptyEmails();
      
      // Get all users from Supabase Auth
      const { data: { users }, error } = await this.supabaseService
        .getClient()
        .auth.admin.listUsers();

      if (error) {
        console.error('Error fetching Supabase users:', error);
        throw new Error('Failed to fetch users from Supabase Auth');
      }

      console.log(`Found ${users.length} users in Supabase Auth`);

      let syncedCount = 0;
      let skippedCount = 0;

      for (const supabaseUser of users) {
        try {
          // Skip users with empty or invalid emails
          if (!supabaseUser.email || supabaseUser.email.trim() === '') {
            console.log(`Skipping user with empty email: ${supabaseUser.id}`);
            skippedCount++;
            continue;
          }

          // Check if profile already exists by email
          const existingProfile = await this.profileRepository.findOne({
            where: { email: supabaseUser.email },
          });

          if (existingProfile) {
            console.log(`Profile already exists for ${supabaseUser.email}, skipping...`);
            skippedCount++;
            continue;
          }

          // Check if profile already exists by ID
          const existingProfileById = await this.profileRepository.findOne({
            where: { id: supabaseUser.id },
          });

          if (existingProfileById) {
            console.log(`Profile already exists with ID ${supabaseUser.id}, skipping...`);
            skippedCount++;
            continue;
          }

          // Create new profile
          const profile = this.profileRepository.create({
            email: supabaseUser.email,
            full_name: supabaseUser.user_metadata?.full_name || 
                      supabaseUser.user_metadata?.name || 
                      supabaseUser.email.split('@')[0],
            avatar_url: supabaseUser.user_metadata?.avatar_url,
            role: UserRole.USER, // Default role
            is_active: true,
            email_verified: supabaseUser.email_confirmed_at ? true : false,
          });

          const savedProfile = await this.profileRepository.save(profile);
          
          // Update with Supabase user ID
          savedProfile.id = supabaseUser.id;
          await this.profileRepository.save(savedProfile);

          console.log(`Synced user: ${supabaseUser.email} (ID: ${supabaseUser.id})`);
          syncedCount++;
        } catch (userError) {
          console.error(`Error syncing user ${supabaseUser.email}:`, userError.message);
          skippedCount++;
          continue; // Continue with next user instead of failing completely
        }
      }

      console.log(`Sync completed. Synced: ${syncedCount}, Skipped: ${skippedCount}`);

      return {
        message: 'User sync completed successfully',
        synced: syncedCount,
        skipped: skippedCount,
        total: users.length,
      };
    } catch (error) {
      console.error('Error syncing users:', error);
      throw new Error('Failed to sync users');
    }
  }

  async cleanupEmptyEmails() {
    try {
      console.log('Cleaning up profiles with empty emails...');
      
      // Delete profiles with empty or null emails
      const result = await this.profileRepository
        .createQueryBuilder()
        .delete()
        .from('profiles')
        .where('email IS NULL OR email = :emptyEmail', { emptyEmail: '' })
        .execute();

      console.log(`Cleaned up ${result.affected} profiles with empty emails`);
      
      return {
        message: 'Empty email cleanup completed',
        deleted: result.affected,
      };
    } catch (error) {
      console.error('Error cleaning up empty emails:', error);
      throw new Error('Failed to cleanup empty emails');
    }
  }

  async debugJwtConfig() {
    const jwtSecret = this.configService.get('JWT_SECRET');
    return {
      hasJwtSecret: !!jwtSecret,
      jwtSecretLength: jwtSecret ? jwtSecret.length : 0,
      jwtSecretPreview: jwtSecret ? jwtSecret.substring(0, 10) + '...' : 'Not set',
      nodeEnv: this.configService.get('NODE_ENV'),
    };
  }

  async verifyTokenManually(token: string) {
    try {
      const jwtSecret = this.configService.get('JWT_SECRET');
      console.log('Verifying token with secret length:', jwtSecret?.length);
      
      const decoded = jwt.verify(token, jwtSecret);
      console.log('Token decoded successfully:', decoded);
      
      return {
        success: true,
        decoded,
        message: 'Token is valid',
      };
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Token verification failed',
      };
    }
  }
} 