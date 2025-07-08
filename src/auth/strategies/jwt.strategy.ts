import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupabaseService } from '../../supabase/supabase.service';
import { Profile } from '../../profiles/entities/profile.entity';
import { UserRole } from '../../common/enums/role.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    console.log('JWT Strategy constructor - JWT_SECRET loaded:', jwtSecret ? 'Yes (length: ' + jwtSecret.length + ')' : 'No');
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    try {
      console.log('JWT Strategy validating payload:', payload);
      
      if (!payload || !payload.sub) {
        console.log('Invalid payload - missing sub field');
        throw new UnauthorizedException('Invalid token payload');
      }
      
      // First, try to get profile from our database
      let profile = await this.profileRepository.findOne({
        where: { id: payload.sub },
      });

      if (!profile) {
        console.log('Profile not found in database, trying to get from Supabase Auth...');
        
        // Try to get user from Supabase Auth
        const supabaseUser = await this.supabaseService.getUserById(payload.sub);
        
        if (!supabaseUser) {
          console.log('User not found in Supabase Auth either:', payload.sub);
          throw new UnauthorizedException('User not found');
        }

        // Create profile from Supabase user data
        profile = this.profileRepository.create({
          id: supabaseUser.id,
          email: supabaseUser.email,
          full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
          avatar_url: supabaseUser.user_metadata?.avatar_url,
          role: UserRole.USER, // Default role, can be changed by admin
          is_active: true,
          email_verified: supabaseUser.email_confirmed_at ? true : false,
        });
        profile = await this.profileRepository.save(profile);
        
        console.log('Profile created in database with ID:', profile.id);
      }

      if (!profile.is_active) {
        console.log('User account is inactive:', payload.sub);
        throw new UnauthorizedException('Account is inactive');
      }

      const userObject = {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        avatar_url: profile.avatar_url,
      };

      console.log('JWT validation successful for user:', profile.email, 'role:', profile.role, 'returning:', userObject);
      return userObject;
    } catch (error) {
      console.error('JWT validation error:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
} 