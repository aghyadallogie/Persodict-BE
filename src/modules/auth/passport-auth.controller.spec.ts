import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'http';
import request from 'supertest';
import { AuthService } from './auth.service';
import { AuthController } from './passport-auth.controller';

describe('POST /auth/google', () => {
  let app: INestApplication;
  const authService = { authenticateWithGoogle: jest.fn() };
  const server = () => app.getHttpServer() as Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    app = moduleRef.createNestApplication();
    // Same pipe as main.ts
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    authService.authenticateWithGoogle.mockReset();
  });

  it('returns 200 with { id, email, token }, the same shape as /auth/login', async () => {
    const result = { id: 'user-1', email: 'ada@example.com', token: 'app-jwt' };
    authService.authenticateWithGoogle.mockResolvedValue(result);

    const res = await request(server())
      .post('/auth/google')
      .send({ idToken: 'google-id-token' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(authService.authenticateWithGoogle).toHaveBeenCalledWith(
      'google-id-token',
    );
  });

  it('answers 401 when the service rejects the token', async () => {
    authService.authenticateWithGoogle.mockRejectedValue(
      new UnauthorizedException('Invalid Google token'),
    );

    const res = await request(server())
      .post('/auth/google')
      .send({ idToken: 'bad-token' });

    expect(res.status).toBe(401);
  });

  it.each([
    ['a missing idToken', {}],
    ['an empty idToken', { idToken: '' }],
    ['a non-string idToken', { idToken: 123 }],
  ])('answers 400 for %s, without calling the service', async (_name, body) => {
    const res = await request(server()).post('/auth/google').send(body);

    expect(res.status).toBe(400);
    expect(authService.authenticateWithGoogle).not.toHaveBeenCalled();
  });
});
