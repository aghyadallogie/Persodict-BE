import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { PhraseRepository } from '../modules/phrase/repository/phrase.repository';
import { SettingsRepository } from '../modules/settings/repository/settings.repository';
import { UserRepository } from '../modules/user/repository/user.repository';
import { PrismaService } from './prisma.service';

/**
 * PrismaService used to be listed in the `providers` of three feature modules, and Nest creates
 * one instance per module that provides a class, so the app opened three Prisma clients, each
 * with its own connection pool. They must all share the single instance from PrismaModule.
 */
describe('Prisma client sharing', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    // AppModule refuses to start without a JWT secret.
    process.env.JWT_SECRET ??= 'secret-for-this-test';
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function bootApp() {
    // Real PrismaService objects, but never open a real database connection.
    const connect = jest
      .spyOn(PrismaService.prototype, '$connect')
      .mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    await moduleRef.init();

    return { moduleRef, connect };
  }

  it('creates exactly one Prisma client for the whole app', async () => {
    const { moduleRef, connect } = await bootApp();

    // onModuleInit runs once per PrismaService instance.
    expect(connect).toHaveBeenCalledTimes(1);

    await moduleRef.close();
  });

  it('hands that same client to every repository', async () => {
    const { moduleRef } = await bootApp();

    // `prisma` is a private field of each repository; read it to see which client it was given.
    const prismaOf = (
      repository:
        | typeof UserRepository
        | typeof SettingsRepository
        | typeof PhraseRepository,
    ) => moduleRef.get(repository, { strict: false })['prisma'];
    const shared = moduleRef.get(PrismaService, { strict: false });

    expect(prismaOf(UserRepository)).toBe(shared);
    expect(prismaOf(SettingsRepository)).toBe(shared);
    expect(prismaOf(PhraseRepository)).toBe(shared);

    await moduleRef.close();
  });
});
