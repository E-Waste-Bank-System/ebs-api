import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    this.logger.log(`JWT Auth Guard - Path: ${request.url}, Auth Header: ${authHeader ? 'Present' : 'Missing'}`);
    
    return super.canActivate(context);
  }

  handleRequest(err, user, info, context) {
    const request = context?.switchToHttp()?.getRequest();
    
    if (err || !user) {
      this.logger.error(`JWT Auth failed - Path: ${request?.url}, Error: ${err?.message || 'No user'}, Info: ${info?.message || 'No info'}`);
      throw err || new UnauthorizedException('Invalid authentication token');
    }
    
    this.logger.log(`JWT Auth successful - User: ${user.email}, Role: ${user.role}`);
    return user;
  }
} 