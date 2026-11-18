import {
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';

const verifyIdToken = jest.fn();

// Replace Google's verifier: these tests are about what we do with a verified (or rejected) token,
// not about Google's cryptography.
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken })),
}));

const WEB_CLIENT_ID = 'web-client-id.apps.googleusercontent.com';

const existingUser = {
  id: 'user-1',
  email: 'ada@example.com',
  password: 'bcrypt-hash',
  name: 'Ada',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const verified = (overrides: Record<string, unknown> = {}) => ({
  getPayload: () => ({
    email: 'ada@example.com',
    email_verified: true,
    name: 'Ada Lovelace',
    ...overrides,
  }),
});

describe('AuthService.authenticateWithGoogle', () => {
  let service: AuthService;
  const userService = { findIdentityByEmail: jest.fn(), register: jest.fn() };
  const jwtService = { sign: jest.fn() };
  const config = { get: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string) =>
      key === 'GOOGLE_WEB_CLIENT_ID' ? WEB_CLIENT_ID : undefined,
    );
    jwtService.sign.mockReturnValue('app-jwt');

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('verifies the token against our Web client ID', async () => {
    verifyIdToken.mockResolvedValue(verified());
    userService.findIdentityByEmail.mockResolvedValue(existingUser);

    await service.authenticateWithGoogle('google-id-token');

    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'google-id-token',
      audience: WEB_CLIENT_ID,
    });
  });

  it('signs in an existing account with the same email, without creating a new one', async () => {
    verifyIdToken.mockResolvedValue(verified());
    userService.findIdentityByEmail.mockResolvedValue(existingUser);

    const result = await service.authenticateWithGoogle('google-id-token');

    expect(userService.findIdentityByEmail).toHaveBeenCalledWith(
      'ada@example.com',
    );
    expect(userService.register).not.toHaveBeenCalled();
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'ada@example.com',
    });
    expect(result).toEqual({
      id: 'user-1',
      email: 'ada@example.com',
      token: 'app-jwt',
    });
  });

  it('signs in an old account from just its id and email, whatever else its record is missing', async () => {
    // Accounts created by an older app version can lack password, createdAt, etc. Sign-in must
    // only need the identity, so it loads nothing else.
    verifyIdToken.mockResolvedValue(verified());
    userService.findIdentityByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
    });

    const result = await service.authenticateWithGoogle('google-id-token');

    expect(userService.register).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 'user-1',
      email: 'ada@example.com',
      token: 'app-jwt',
    });
  });

  it('creates a Google-only account on first sign-in, with no password', async () => {
    verifyIdToken.mockResolvedValue(verified());
    userService.findIdentityByEmail.mockResolvedValue(null);
    userService.register.mockResolvedValue({
      ...existingUser,
      id: 'user-2',
      password: null,
    });

    const result = await service.authenticateWithGoogle('google-id-token');

    expect(userService.register).toHaveBeenCalledWith({
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      password: null,
    });
    expect(result).toEqual({
      id: 'user-2',
      email: 'ada@example.com',
      token: 'app-jwt',
    });
  });

  it('rejects an invalid, expired or wrong-audience token', async () => {
    verifyIdToken.mockRejectedValue(new Error('Wrong recipient'));

    await expect(service.authenticateWithGoogle('bad-token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(userService.findIdentityByEmail).not.toHaveBeenCalled();
    expect(userService.register).not.toHaveBeenCalled();
  });

  it('rejects a Google account whose email is not verified', async () => {
    verifyIdToken.mockResolvedValue(verified({ email_verified: false }));

    await expect(
      service.authenticateWithGoogle('google-id-token'),
    ).rejects.toThrow(BadRequestException);
    expect(userService.findIdentityByEmail).not.toHaveBeenCalled();
    expect(userService.register).not.toHaveBeenCalled();
  });

  it('rejects a token without an email', async () => {
    verifyIdToken.mockResolvedValue(verified({ email: undefined }));

    await expect(
      service.authenticateWithGoogle('google-id-token'),
    ).rejects.toThrow(BadRequestException);
  });

  it('fails clearly, without calling Google, when GOOGLE_WEB_CLIENT_ID is not set', async () => {
    config.get.mockReturnValue(undefined);

    await expect(
      service.authenticateWithGoogle('google-id-token'),
    ).rejects.toThrow(InternalServerErrorException);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});

describe('Accounts without a password and password login', () => {
  // null is how authenticateWithGoogle stores a Google-only account; '' covers any account saved
  // earlier with an empty string.
  it.each([null, ''])(
    'an account with password %p can never be logged into with email + password',
    async (storedPassword) => {
      const userService = {
        findByEmail: jest.fn().mockResolvedValue({
          id: 'user-2',
          email: 'ada@example.com',
          password: storedPassword,
        }),
      };
      const service = new AuthService(
        userService as unknown as UserService,
        { sign: jest.fn() } as unknown as JwtService,
        { get: jest.fn() } as unknown as ConfigService,
      );

      await expect(
        service.validateUser({ email: 'ada@example.com', password: '' }),
      ).resolves.toBeNull();
      await expect(
        service.validateUser({
          email: 'ada@example.com',
          password: 'anything',
        }),
      ).resolves.toBeNull();
    },
  );
});
