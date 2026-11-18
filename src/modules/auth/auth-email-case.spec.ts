import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRepository } from '../user/repository/user.repository';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';

const verifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken })),
}));

type Row = {
  id: string;
  email: string;
  password: string | null;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * A tiny in-memory stand-in for Prisma's `user` model that matches emails EXACTLY and
 * case-sensitively, like MongoDB's unique index does. It lets the real AuthService, UserService
 * and UserRepository run together, which is the only way to see the case-handling end to end.
 */
class FakePrisma {
  rows: Row[] = [];
  user = {
    create: ({
      data,
    }: {
      data: { email: string; password: string | null; name: string };
    }) => {
      if (this.rows.some((r) => r.email === data.email)) {
        return Promise.reject(new Error('unique constraint on email'));
      }
      const row: Row = {
        id: `id-${this.rows.length + 1}`,
        email: data.email,
        password: data.password,
        name: data.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.rows.push(row);
      return Promise.resolve(row);
    },
    findUnique: ({
      where,
      select,
    }: {
      where: { email?: string; id?: string };
      select?: Record<string, boolean>;
    }) => {
      const row = this.rows.find((r) =>
        where.email !== undefined ? r.email === where.email : r.id === where.id,
      );
      if (!row) return Promise.resolve(null);
      if (!select) return Promise.resolve(row);
      return Promise.resolve(
        Object.fromEntries(
          Object.keys(select).map((k) => [k, row[k as keyof Row]]),
        ),
      );
    },
  };
}

const google = (email: string) => ({
  getPayload: () => ({ email, email_verified: true, name: 'Ada Lovelace' }),
});

describe('email case handling across register, login and Google sign-in', () => {
  let auth: AuthService;
  let db: FakePrisma;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = new FakePrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        UserService,
        UserRepository,
        { provide: PrismaService, useValue: db },
        { provide: JwtService, useValue: { sign: () => 'app-jwt' } },
        {
          provide: ConfigService,
          useValue: { get: () => 'web-client-id.apps.googleusercontent.com' },
        },
      ],
    }).compile();
    auth = moduleRef.get(AuthService);
  });

  it('stores a registered email lower-cased and trimmed', async () => {
    const result = await auth.register({
      email: ' Ada@Example.COM ',
      password: 'secret1',
    });

    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].email).toBe('ada@example.com');
    expect(result.email).toBe('ada@example.com');
  });

  it('logs in with the email in any capitalisation', async () => {
    await auth.register({ email: 'Ada@Example.com', password: 'secret1' });

    for (const typed of [
      'ada@example.com',
      'ADA@EXAMPLE.COM',
      'Ada@Example.com',
    ]) {
      const result = await auth.authenticate({
        email: typed,
        password: 'secret1',
      });
      expect(result.id).toBe(db.rows[0].id);
    }
  });

  it('still rejects a wrong password', async () => {
    await auth.register({ email: 'ada@example.com', password: 'secret1' });

    await expect(
      auth.authenticate({ email: 'ADA@example.com', password: 'nope' }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('refuses to register the same address again in a different case', async () => {
    await auth.register({ email: 'ada@example.com', password: 'secret1' });

    await expect(
      auth.register({ email: 'Ada@EXAMPLE.com', password: 'secret2' }),
    ).rejects.toThrow(BadRequestException);
    expect(db.rows).toHaveLength(1);
  });

  it('signs a Google user into the existing account instead of creating a duplicate', async () => {
    await auth.register({ email: 'Ada@Example.com', password: 'secret1' });
    verifyIdToken.mockResolvedValue(google('ada@example.com'));

    const result = await auth.authenticateWithGoogle('google-id-token');

    expect(result.id).toBe(db.rows[0].id);
    expect(db.rows).toHaveLength(1);
  });

  it('creates a lower-cased, password-less account for a new Google user', async () => {
    verifyIdToken.mockResolvedValue(google('New.User@Example.com'));

    const result = await auth.authenticateWithGoogle('google-id-token');

    expect(db.rows).toHaveLength(1);
    expect(db.rows[0]).toMatchObject({
      email: 'new.user@example.com',
      password: null,
    });
    expect(result.email).toBe('new.user@example.com');
  });

  it('a Google-only account cannot be logged into with a password, in any case', async () => {
    verifyIdToken.mockResolvedValue(google('ada@example.com'));
    await auth.authenticateWithGoogle('google-id-token');

    await expect(
      auth.authenticate({ email: 'ADA@example.com', password: '' }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('does not treat dots in an email as wildcards', async () => {
    await auth.register({ email: 'abc@example.com', password: 'secret1' });
    verifyIdToken.mockResolvedValue(google('a.c@example.com'));

    const result = await auth.authenticateWithGoogle('google-id-token');

    // "a.c" must be its own account, not match "abc".
    expect(db.rows).toHaveLength(2);
    expect(result.id).not.toBe(db.rows[0].id);
  });

  describe('accounts created before emails were normalized (stored with capitals)', () => {
    beforeEach(() => {
      db.rows.push({
        id: 'legacy-1',
        email: 'Legacy@Example.com',
        password: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('is still found by Google sign-in when typed exactly as stored', async () => {
      verifyIdToken.mockResolvedValue(google('Legacy@Example.com'));

      const result = await auth.authenticateWithGoogle('google-id-token');

      expect(result.id).toBe('legacy-1');
      expect(db.rows).toHaveLength(1);
    });
  });
});
