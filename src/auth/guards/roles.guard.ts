import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../common/enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      this.logger.log('No roles required, allowing access');
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const request = context.switchToHttp().getRequest();
    
    this.logger.log(`Roles Guard - Path: ${request.url}, Required: [${requiredRoles.join(', ')}], User Role: ${user?.role || 'None'}`);
    
    if (!user) {
      this.logger.error('User not authenticated');
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    
    if (!hasRole) {
      this.logger.error(`Access denied - User ${user.email} with role ${user.role} does not have required roles: [${requiredRoles.join(', ')}]`);
      throw new ForbiddenException('Insufficient permissions');
    }

    this.logger.log(`Access granted - User ${user.email} has required role`);
    return true;
  }
} 