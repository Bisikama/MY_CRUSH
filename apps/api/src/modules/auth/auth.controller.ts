import { applyDecorators, Body, Controller, Get, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { nicknameSchema } from '@duoquest/shared-types';
import type { Response } from 'express';
import { z } from 'zod';
import { ApiEndpoint } from '../../common/api-endpoint';
import { AllowGuest, csrfToken, LocalAccount, Public, type AuthRequest } from './auth-guard';
import {
  clearFlow,
  emailSchema,
  fail,
  flowNonce,
  passwordSchema,
  sessionCookie,
  tokenSchema,
} from './auth-security';
import { AuthSessions, publicIdentity } from './auth-session.service';
import { AuthService } from './auth.service';
import { EmailChallenges, type Purpose } from './email-challenge.service';

const emailBody = z.object({ email: emailSchema }).strict();
const challenge = z.object({ challengeId: z.string().uuid() }).strict();
const verifyBody = challenge.extend({ code: z.string().regex(/^\d{6}$/) });
const completeBody = challenge.extend({ password: passwordSchema });
const registerBody = completeBody.extend({ nickname: nicknameSchema });
const loginBody = emailBody.extend({ password: z.string().min(1).max(256) });
const changeBody = z
  .object({ currentPassword: z.string().min(1).max(256), password: passwordSchema })
  .strict();
const migrateBody = z.object({ token: tokenSchema }).strict();
const ok = z.object({ ok: z.literal(true) });
const flow = z.object({
  challengeId: z.string().uuid(),
  email: z.string(),
  purpose: z.enum(['REGISTER', 'RESET_PASSWORD']),
  verified: z.boolean(),
  resendAt: z.string().datetime(),
});
const localPublic = () => applyDecorators(LocalAccount(), Public());
const ip = (request: AuthRequest) => request.socket.remoteAddress ?? 'unknown';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AuthSessions) private readonly sessions: AuthSessions,
    @Inject(EmailChallenges) private readonly challenges: EmailChallenges,
  ) {}

  @Public()
  @ApiEndpoint({
    summary: 'Lấy CSRF token cho phiên trình duyệt',
    response: z.object({ csrfToken: z.string() }),
  })
  @Get('csrf')
  csrf(@Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    const binding = request.authBinding ?? 'flow:' + flowNonce(request, response);
    return { csrfToken: csrfToken(request, binding) };
  }

  @Public()
  @ApiEndpoint({
    summary: 'Đọc danh tính hiện tại',
    response: z.object({
      kind: z.enum(['anonymous', 'guest', 'account']),
      playerId: z.string().optional(),
      nickname: z.string().optional(),
      role: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
    }),
  })
  @Get('me')
  me(@Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return publicIdentity(request.principal ?? null);
  }

  @localPublic()
  @ApiEndpoint({
    summary: 'Đọc bước xác minh đang thực hiện',
    response: z.object({ register: flow.nullable(), reset: flow.nullable() }),
  })
  @Get('flow')
  async flow(@Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    const binding = request.authBinding;
    return binding
      ? {
          register: await this.challenges.current(binding, 'REGISTER'),
          reset: await this.challenges.current(binding, 'RESET_PASSWORD'),
        }
      : { register: null, reset: null };
  }

  @localPublic()
  @ApiEndpoint({
    summary: 'Hủy xác minh để đổi email',
    body: z.object({ purpose: z.enum(['REGISTER', 'RESET_PASSWORD']) }).strict(),
    response: ok,
    status: 201,
  })
  @Post('flow/cancel')
  async cancelFlow(@Req() request: AuthRequest, @Body() body: unknown) {
    const { purpose } = z
      .object({ purpose: z.enum(['REGISTER', 'RESET_PASSWORD']) })
      .strict()
      .parse(body);
    await this.challenges.cancel(request.authBinding!, purpose);
    return { ok: true };
  }

  private start(request: AuthRequest, body: unknown, purpose: Purpose) {
    if (purpose === 'REGISTER' && request.principal?.accountId)
      fail(409, 'CONFLICT', 'Hãy đăng xuất trước khi tạo tài khoản khác.');
    return this.challenges.send(
      purpose,
      request.authBinding!,
      ip(request),
      emailBody.parse(body).email,
      request.principal?.playerId ?? null,
    );
  }

  private resend(request: AuthRequest, body: unknown, purpose: Purpose) {
    return this.challenges.send(
      purpose,
      request.authBinding!,
      ip(request),
      undefined,
      request.principal?.playerId ?? null,
      challenge.parse(body).challengeId,
    );
  }

  private verify(request: AuthRequest, body: unknown, purpose: Purpose) {
    const data = verifyBody.parse(body);
    return this.challenges.verify(
      purpose,
      request.authBinding!,
      ip(request),
      data.challengeId,
      data.code,
    );
  }

  @localPublic()
  @ApiEndpoint({
    summary: 'Kiểm tra email và gửi mã đăng ký',
    body: emailBody,
    response: flow,
    status: 201,
    errors: [409, 429, 503],
  })
  @Post('register/start')
  registerStart(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.start(request, body, 'REGISTER');
  }

  @localPublic()
  @ApiEndpoint({
    summary: 'Gửi lại mã đăng ký',
    body: challenge,
    response: flow,
    status: 201,
    errors: [429, 503],
  })
  @Post('register/resend')
  registerResend(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.resend(request, body, 'REGISTER');
  }

  @localPublic()
  @ApiEndpoint({
    summary: 'Xác minh mã đăng ký',
    body: verifyBody,
    response: flow,
    status: 201,
    errors: [429],
  })
  @Post('register/verify')
  registerVerify(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.verify(request, body, 'REGISTER');
  }

  @localPublic()
  @ApiEndpoint({
    summary: 'Tạo tài khoản từ email đã xác minh',
    body: registerBody,
    response: ok,
    status: 201,
    errors: [409],
  })
  @Post('register/complete')
  async registerComplete(
    @Req() request: AuthRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = registerBody.parse(body);
    sessionCookie(
      response,
      await this.auth.register(
        request.authBinding!,
        data.challengeId,
        data.nickname,
        data.password,
        request.principal,
      ),
    );
    clearFlow(response);
    return { ok: true };
  }

  @localPublic()
  @ApiEndpoint({
    summary: 'Đăng nhập tài khoản',
    body: loginBody,
    response: ok,
    status: 201,
    errors: [401, 409, 429],
  })
  @Post('login')
  async login(
    @Req() request: AuthRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = loginBody.parse(body);
    sessionCookie(
      response,
      await this.auth.login(data.email, data.password, ip(request), request.principal),
    );
    clearFlow(response);
    return { ok: true };
  }

  @AllowGuest()
  @ApiEndpoint({
    summary: 'Đăng xuất phiên hiện tại',
    auth: true,
    response: ok,
    status: 201,
    errors: [409],
  })
  @Post('logout')
  async logout(@Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.principal!, false);
    sessionCookie(response);
    clearFlow(response);
    return { ok: true };
  }

  @LocalAccount()
  @ApiEndpoint({
    summary: 'Đăng xuất mọi phiên tài khoản',
    auth: true,
    response: ok,
    status: 201,
    errors: [409],
  })
  @Post('logout-all')
  async logoutAll(@Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.principal!, true);
    sessionCookie(response);
    clearFlow(response);
    return { ok: true };
  }

  @localPublic()
  @ApiEndpoint({
    summary: 'Yêu cầu mã đặt lại mật khẩu',
    body: emailBody,
    response: flow,
    status: 201,
    errors: [429],
  })
  @Post('password-reset/start')
  resetStart(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.start(request, body, 'RESET_PASSWORD');
  }

  @localPublic()
  @ApiEndpoint({
    summary: 'Gửi lại mã đặt lại mật khẩu',
    body: challenge,
    response: flow,
    status: 201,
    errors: [429],
  })
  @Post('password-reset/resend')
  resetResend(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.resend(request, body, 'RESET_PASSWORD');
  }

  @localPublic()
  @ApiEndpoint({
    summary: 'Xác minh mã đặt lại mật khẩu',
    body: verifyBody,
    response: flow,
    status: 201,
    errors: [429],
  })
  @Post('password-reset/verify')
  resetVerify(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.verify(request, body, 'RESET_PASSWORD');
  }

  @localPublic()
  @ApiEndpoint({
    summary: 'Đặt mật khẩu mới và thu hồi các phiên cũ',
    body: completeBody,
    response: ok,
    status: 201,
  })
  @Post('password-reset/complete')
  async resetComplete(
    @Req() request: AuthRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = completeBody.parse(body);
    const accountId = await this.auth.reset(
      request.authBinding!,
      data.challengeId,
      data.password,
      request.principal,
    );
    if (request.principal?.accountId === accountId) sessionCookie(response);
    clearFlow(response);
    return { ok: true };
  }

  @LocalAccount()
  @ApiEndpoint({
    summary: 'Đổi mật khẩu tài khoản',
    auth: true,
    body: changeBody,
    response: ok,
    status: 201,
  })
  @Post('password/change')
  async change(
    @Req() request: AuthRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = changeBody.parse(body);
    sessionCookie(
      response,
      await this.auth.change(request.principal!, data.currentPassword, data.password),
    );
    clearFlow(response);
    return { ok: true };
  }

  @Public()
  @ApiEndpoint({
    summary: 'Chuyển guest token cũ sang phiên cookie',
    body: migrateBody,
    response: ok,
    status: 201,
    errors: [401, 409],
  })
  @Post('guest/migrate')
  async migrate(
    @Req() request: AuthRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    sessionCookie(
      response,
      await this.auth.migrate(
        migrateBody.parse(body).token,
        request.authBinding!,
        request.principal,
      ),
    );
    clearFlow(response);
    return { ok: true };
  }
}
