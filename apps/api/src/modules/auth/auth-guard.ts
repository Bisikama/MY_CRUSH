import {
  CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Response } from 'express';
import type { AccountRole } from '@prisma/client';
import { webOrigins, env } from '../../common/config';
import { AuthSessions, type Principal } from './auth-session.service';
import { equal, fail, flowNonce, mac, readCookie, SESSION_COOKIE } from './auth-security';

const access = 'dq:auth';
export const Public = () => SetMetadata(access, 'public');
export const AllowGuest = () => SetMetadata(access, 'guest');
export const Roles = (...roles: AccountRole[]) => SetMetadata(access, roles);
export type AuthRequest = Request & { principal?: Principal; authBinding?: string };
export const CurrentPlayer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<AuthRequest>().principal!.playerId,
);
export const LocalAccount = () => SetMetadata('dq:local-account', true);

export function csrfToken(request: Request, binding: string) {
  return mac('csrf', binding, readCookie(request.headers.cookie, SESSION_COOKIE) ?? '');
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthSessions) private readonly sessions: AuthSessions,
  ) {}

  async canActivate(context: ExecutionContext) {
    if (context.getType() !== 'http') return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const targets = [context.getHandler(), context.getClass()];
    const mode = this.reflector.getAllAndOverride<'public' | 'guest' | AccountRole[]>(
      access,
      targets,
    );
    const origin = request.headers.origin;
    const localOrigins = [
      process.env.AUTH_WEB_ORIGIN ?? 'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:' + env.API_PORT,
      'http://127.0.0.1:' + env.API_PORT,
    ];
    const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const localAccount = this.reflector.getAllAndOverride<boolean>('dq:local-account', targets);
    if (
      localAccount &&
      (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress ?? '') ||
        !['localhost', '127.0.0.1', '::1', '[::1]'].includes(request.hostname) ||
        (origin ? !localOrigins.includes(origin) : mutating))
    )
      fail(403, 'FORBIDDEN', 'Auth tài khoản hiện chỉ hỗ trợ localhost.');

    const needsPrincipal =
      mode !== 'public' ||
      mutating ||
      request.path.endsWith('/auth/me') ||
      request.path.endsWith('/auth/flow') ||
      request.path.endsWith('/auth/csrf');
    const principal = needsPrincipal
      ? await this.sessions.resolve(
          readCookie(request.headers.cookie, SESSION_COOKIE),
          mode !== 'public' && (mutating || !request.path.startsWith('/api/auth/')),
        )
      : null;
    request.principal = principal ?? undefined;
    if (principal || request.path.startsWith('/api/auth/'))
      context.switchToHttp().getResponse<Response>().setHeader('Cache-Control', 'no-store');
    if (mode !== 'public' && !principal) fail(401, 'UNAUTHORIZED', 'Cần phiên hợp lệ.');
    if (
      principal &&
      mode !== 'public' &&
      mode !== 'guest' &&
      (!principal.role || (Array.isArray(mode) && !mode.includes(principal.role)))
    )
      fail(403, 'FORBIDDEN', 'Bạn không có quyền sử dụng API này.');

    const nonce = flowNonce(request);
    request.authBinding = principal
      ? 'session:' + principal.sessionId
      : nonce
        ? 'flow:' + nonce
        : undefined;
    if (
      mutating &&
      (!origin ||
        ![...webOrigins, ...localOrigins.slice(2)].includes(origin) ||
        !request.authBinding ||
        typeof request.headers['x-csrf-token'] !== 'string' ||
        !equal(request.headers['x-csrf-token'], csrfToken(request, request.authBinding)))
    )
      fail(403, 'CSRF_INVALID', 'Yêu cầu không khớp phiên. Hãy tải lại trang.');
    return true;
  }
}
