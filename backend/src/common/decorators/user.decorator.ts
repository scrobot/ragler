import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export enum UserRole {
  ML = 'ML',
  DEV = 'DEV',
  L2 = 'L2',
}

export interface RequestUser {
  id: string;
  role: UserRole;
}

export const User = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | string | UserRole => {
    const request = ctx.switchToHttp().getRequest<Request>();

    const user: RequestUser = {
      id: (request.headers['x-user-id'] as string) || 'anonymous',
      role: parseRole(request.headers['x-user-role'] as string),
    };

    return data ? user[data] : user;
  },
);

function parseRole(role: string | undefined): UserRole {
  if (!role) return UserRole.L2;
  const upperRole = role.toUpperCase();
  if (upperRole === 'ML') return UserRole.ML;
  if (upperRole === 'DEV') return UserRole.DEV;
  return UserRole.L2;
}
