import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface RequestUser {
  id: string;
}

export const User = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | string => {
    const request = ctx.switchToHttp().getRequest<Request>();

    const user: RequestUser = {
      id: (request.headers['x-user-id'] as string) || 'anonymous',
    };

    return data ? user[data] : user;
  },
);
