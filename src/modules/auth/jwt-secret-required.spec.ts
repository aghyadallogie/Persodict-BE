import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from './auth.module';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Regression tests for a forgery hole: JwtStrategy used to verify tokens with the literal
 * 'defaultSecretKey' whenever JWT_SECRET was unset. That string is public (it was in the source),
 * so anyone could mint a valid token for any user in such an environment.
 */

const configWith = (value: string | undefined) =>
  ({
    get: (key: string) => (key === 'JWT_SECRET' ? value : undefined),
  }) as unknown as ConfigService;

const PAYLOAD = { sub: 'user-1', email: 'a@b.co' };

/** Runs a bearer token through the strategy the way passport does, and reports what happened. */
function authenticate(strategy: JwtStrategy, token: string) {
  return new Promise<{ user?: unknown; failed: boolean }>((resolve, reject) => {
    const attempt = Object.create(strategy) as JwtStrategy & {
      success: (user: unknown) => void;
      fail: () => void;
      error: (err: unknown) => void;
      authenticate: (req: unknown) => void;
    };
    attempt.success = (user) => resolve({ user, failed: false });
    attempt.fail = () => resolve({ failed: true });
    attempt.error = reject;
    attempt.authenticate({ headers: { authorization: `Bearer ${token}` } });
  });
}

describe('JwtStrategy secret handling', () => {
  it('refuses to be created without JWT_SECRET', () => {
    expect(() => new JwtStrategy(configWith(undefined))).toThrow(/JWT_SECRET/);
    expect(() => new JwtStrategy(configWith(''))).toThrow(/JWT_SECRET/);
  });

  it('maps a valid token to the user', async () => {
    const strategy = new JwtStrategy(configWith('the-real-secret'));
    const token = new JwtService({ secret: 'the-real-secret' }).sign(PAYLOAD);

    const result = await authenticate(strategy, token);

    expect(result.failed).toBe(false);
    expect(result.user).toEqual({ userId: 'user-1', email: 'a@b.co' });
  });

  it("rejects a token forged with the old public fallback 'defaultSecretKey'", async () => {
    const strategy = new JwtStrategy(configWith('the-real-secret'));
    const forged = new JwtService({ secret: 'defaultSecretKey' }).sign(PAYLOAD);

    const result = await authenticate(strategy, forged);

    expect(result.failed).toBe(true);
    expect(result.user).toBeUndefined();
  });

  it('rejects a token signed with some other secret', async () => {
    const strategy = new JwtStrategy(configWith('the-real-secret'));
    const other = new JwtService({ secret: 'attacker-guess' }).sign(PAYLOAD);

    expect((await authenticate(strategy, other)).failed).toBe(true);
  });
});

describe('AuthModule startup', () => {
  const original = process.env.JWT_SECRET;

  afterEach(() => {
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
  });

  const compile = () =>
    Test.createTestingModule({
      imports: [
        // Read only process.env: never the developer's local .env file.
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        AuthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({}) // never touch a real database
      .compile();

  it('refuses to start when JWT_SECRET is not set', async () => {
    delete process.env.JWT_SECRET;

    await expect(compile()).rejects.toThrow(/JWT_SECRET/);
  });

  it('starts normally, and signs tokens, when JWT_SECRET is set', async () => {
    process.env.JWT_SECRET = 'a-secret-for-this-test';

    const moduleRef = await compile();
    const jwt = moduleRef.get(JwtService);
    const token = jwt.sign(PAYLOAD);

    expect(
      new JwtService({ secret: 'a-secret-for-this-test' }).verify(token),
    ).toMatchObject(PAYLOAD);
    await moduleRef.close();
  });
});
