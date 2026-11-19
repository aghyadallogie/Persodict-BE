import { ConfigService } from '@nestjs/config';
import { getJwtSecret, JWT_EXPIRES_IN, jwtOptions } from './jwt.config';

const configWith = (value: string | undefined) =>
  ({
    get: (key: string) => (key === 'JWT_SECRET' ? value : undefined),
  }) as unknown as ConfigService;

describe('getJwtSecret', () => {
  it('returns the configured secret', () => {
    expect(getJwtSecret(configWith('a-long-random-secret'))).toBe(
      'a-long-random-secret',
    );
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['only whitespace', '   '],
  ])(
    'throws when JWT_SECRET is %s, instead of falling back',
    (_name, value) => {
      expect(() => getJwtSecret(configWith(value))).toThrow(/JWT_SECRET/);
    },
  );

  it('never invents a default secret', () => {
    let result: unknown;
    try {
      result = getJwtSecret(configWith(undefined));
    } catch {
      result = 'threw';
    }
    expect(result).toBe('threw');
    expect(result).not.toBe('defaultSecretKey');
  });
});

describe('jwtOptions', () => {
  it('signs with the configured secret and the 90 day lifetime', () => {
    expect(jwtOptions(configWith('s3cret'))).toEqual({
      secret: 's3cret',
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    });
    expect(JWT_EXPIRES_IN).toBe('90d');
  });

  it('throws when there is no secret to sign with', () => {
    expect(() => jwtOptions(configWith(undefined))).toThrow(/JWT_SECRET/);
  });
});
