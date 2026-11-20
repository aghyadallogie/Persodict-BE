import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import request from 'supertest';
import { UserThrottlerGuard } from '../../common/guards/user-throttler.guard';
import { PassportJwtAuthGuard } from '../auth/guards/passport-jwt.guard';
import { CreateSettingsDto } from '../settings/dto/create-settings.dto';
import { PhraseController } from './phrase.controller';
import { PhraseService } from './phrase.service';
import { MAX_TEXT_LENGTH, TranslateTextDto } from './dto/translate-text.dto';
import { PhraseRepository } from './repository/phrase.repository';
import { PrismaService } from '../../prisma/prisma.service';

/** Limits that stop one user from turning the app into a free DeepL proxy. */
describe('translate text limit', () => {
  const errorsFor = (text: unknown) =>
    validate(plainToInstance(TranslateTextDto, { text }));

  it('accepts text up to the limit', async () => {
    expect(await errorsFor('a'.repeat(MAX_TEXT_LENGTH))).toHaveLength(0);
  });

  it('rejects text over the limit', async () => {
    expect(await errorsFor('a'.repeat(MAX_TEXT_LENGTH + 1))).toHaveLength(1);
  });

  it.each([[''], [42], [undefined]])('still rejects %p', async (text) => {
    expect(await errorsFor(text)).toHaveLength(1);
  });
});

describe('settings languages limit', () => {
  const errorsFor = (userLangs: unknown) =>
    validate(plainToInstance(CreateSettingsDto, { userLangs }));

  it('accepts the languages the app offers', async () => {
    expect(await errorsFor(['de', 'fr', 'ja'])).toHaveLength(0);
  });

  it('rejects a language DeepL would be asked for but the app never offers', async () => {
    expect(await errorsFor(['de', 'klingon'])).toHaveLength(1);
  });

  it('rejects duplicates', async () => {
    expect(await errorsFor(['de', 'de'])).toHaveLength(1);
  });

  it('rejects a list longer than the number of supported languages', async () => {
    const many = Array.from({ length: 200 }, (_, i) => `l${i}`);
    expect(await errorsFor(many)).not.toHaveLength(0);
  });

  it('rejects something that is not a list', async () => {
    expect(await errorsFor('de')).not.toHaveLength(0);
  });
});

describe('POST /phrases/translate rate limit', () => {
  const service = { translateAndSavePhrase: jest.fn() };
  let app: INestApplication;
  const server = () => app.getHttpServer() as Parameters<typeof request>[0];

  /** Stands in for the JWT guard: the caller is whoever the `x-user` header says. */
  const fakeJwtGuard: CanActivate = {
    canActivate(context: ExecutionContext) {
      const req = context
        .switchToHttp()
        .getRequest<{ headers: Record<string, string>; user?: unknown }>();
      req.user = { userId: req.headers['x-user'], email: 'a@b.c' };
      return true;
    },
  };

  const translate = (user: string) =>
    request(server())
      .post('/phrases/translate')
      .set('x-user', user)
      .send({ text: 'hello' });

  beforeEach(async () => {
    jest.resetAllMocks();
    service.translateAndSavePhrase.mockResolvedValue({
      id: 'p1',
      authorId: 'u',
      translations: {},
    });

    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }])],
      controllers: [PhraseController],
      providers: [
        UserThrottlerGuard,
        { provide: PhraseService, useValue: service },
        // Only here so the real module graph is not needed.
        { provide: PhraseRepository, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    })
      .overrideGuard(PassportJwtAuthGuard)
      .useValue(fakeJwtGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('lets a user translate 10 times a minute, then answers 429', async () => {
    for (let i = 0; i < 10; i++) {
      await translate('u1').expect(201);
    }
    await translate('u1').expect(429);
    expect(service.translateAndSavePhrase).toHaveBeenCalledTimes(10);
  });

  it('counts each user separately', async () => {
    for (let i = 0; i < 10; i++) {
      await translate('u1').expect(201);
    }
    await translate('u1').expect(429);

    await translate('u2').expect(201);
  });

  it('rejects over-long text before it reaches DeepL', async () => {
    await request(server())
      .post('/phrases/translate')
      .set('x-user', 'u1')
      .send({ text: 'a'.repeat(MAX_TEXT_LENGTH + 1) })
      .expect(400);
    expect(service.translateAndSavePhrase).not.toHaveBeenCalled();
  });
});
