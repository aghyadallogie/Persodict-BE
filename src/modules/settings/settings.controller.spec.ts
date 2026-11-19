import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'http';
import request from 'supertest';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.interface';
import { PassportJwtAuthGuard } from '../auth/guards/passport-jwt.guard';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

const LOGGED_IN_USER = 'user-me';

describe('SettingsController', () => {
  let app: INestApplication;
  const service = { create: jest.fn(), getByUserId: jest.fn() };
  const server = () => app.getHttpServer() as Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [{ provide: SettingsService, useValue: service }],
    })
      // Stand in for a valid login: what matters here is which user the controller trusts.
      .overrideGuard(PassportJwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
          req.user = { userId: LOGGED_IN_USER, email: 'me@example.com' };
          return true;
        },
      })
      .compile();

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
    jest.resetAllMocks();
    service.create.mockResolvedValue({
      id: 's1',
      userId: LOGGED_IN_USER,
      userLangs: ['de'],
    });
  });

  describe('POST /settings', () => {
    it('saves settings for the logged-in user', async () => {
      await request(server())
        .post('/settings')
        .send({ userLangs: ['de', 'fr'] })
        .expect(201);

      expect(service.create).toHaveBeenCalledWith(LOGGED_IN_USER, ['de', 'fr']);
    });

    it("ignores a userId in the body, so nobody can change someone else's settings", async () => {
      await request(server())
        .post('/settings')
        .send({ userId: 'victim-user', userLangs: ['de'] })
        .expect(201);

      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith(LOGGED_IN_USER, ['de']);
      expect(service.create).not.toHaveBeenCalledWith(
        'victim-user',
        expect.anything(),
      );
    });

    it('still accepts a client that sends its own userId (the mobile app does)', async () => {
      await request(server())
        .post('/settings')
        .send({ userId: LOGGED_IN_USER, userLangs: ['es'] })
        .expect(201);

      expect(service.create).toHaveBeenCalledWith(LOGGED_IN_USER, ['es']);
    });

    it.each([
      ['no userLangs', {}],
      ['userLangs that is not an array', { userLangs: 'de' }],
      ['userLangs containing a non-string', { userLangs: ['de', 5] }],
    ])('answers 400 for %s, without saving anything', async (_name, body) => {
      await request(server()).post('/settings').send(body).expect(400);

      expect(service.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /settings', () => {
    it("returns the logged-in user's settings", async () => {
      service.getByUserId.mockResolvedValue({
        id: 's1',
        userId: LOGGED_IN_USER,
        userLangs: ['de'],
      });

      await request(server()).get('/settings').expect(200);

      expect(service.getByUserId).toHaveBeenCalledWith(LOGGED_IN_USER);
    });
  });

  it('is protected by the JWT guard', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      SettingsController,
    ) as unknown[];
    expect(guards).toContain(PassportJwtAuthGuard);
  });
});
