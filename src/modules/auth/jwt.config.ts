import { ConfigService } from '@nestjs/config';
import type { JwtModuleOptions } from '@nestjs/jwt';

/** How long a login token stays valid. */
export const JWT_EXPIRES_IN = '90d';

/**
 * The secret that signs and verifies login tokens. There is deliberately no fallback value: a
 * default would be public (it's in the source), so anyone could forge a token for any user in any
 * environment that forgot to set `JWT_SECRET`. Throwing here makes the app refuse to start instead.
 */
export function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret?.trim()) {
    throw new Error(
      'JWT_SECRET is not set. Refusing to start without a secret to sign and verify login tokens.',
    );
  }
  return secret;
}

/** Options for `JwtModule`, built from the environment. */
export function jwtOptions(config: ConfigService): JwtModuleOptions {
  return {
    secret: getJwtSecret(config),
    signOptions: { expiresIn: JWT_EXPIRES_IN },
  };
}
