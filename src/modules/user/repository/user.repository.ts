import { Injectable } from '@nestjs/common';
import { User as PrismaUser } from '@prisma/client';
import { User } from '../../../modules/user/domain/user.model';
import { PrismaService } from '../../../prisma/prisma.service';
import { normalizeEmail } from '../email';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) { }

  /* ---------- creators ---------- */
  async create(data: {
    email: string;
    password: string | null;
    name: string;
  }): Promise<User> {
    const created = await this.prisma.user.create({
      data: {
        email: normalizeEmail(data.email),
        password: data.password,
        name: data.name ?? '',
      },
    });
    return this.toDomain(created);
  }

  /* ---------- readers ---------- */
  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  /**
   * Emails are stored lower-cased, so look up the normalized form. Accounts created before that
   * may still be stored with capitals; for those, fall back to the exact spelling that was typed
   * (an exact match, never a pattern), so they keep working without a data migration.
   */
  async findByEmail(email: string): Promise<User | null> {
    const normalized = normalizeEmail(email);
    let row = await this.prisma.user.findUnique({
      where: { email: normalized },
    });
    const typed = email.trim();
    if (!row && typed !== normalized) {
      row = await this.prisma.user.findUnique({ where: { email: typed } });
    }
    return row ? this.toDomain(row) : null;
  }

  /**
   * Looks a user up by email, loading only id and email. Prisma validates every column it loads,
   * so a full-row read throws on old documents that lack required fields (e.g. a null createdAt);
   * sign-in only needs to know who the user is, so it reads just these two. Same normalization
   * and legacy-spelling fallback as `findByEmail`.
   */
  async findIdentityByEmail(
    email: string,
  ): Promise<{ id: string; email: string } | null> {
    const select = { id: true, email: true } as const;
    const normalized = normalizeEmail(email);
    const found = await this.prisma.user.findUnique({
      where: { email: normalized },
      select,
    });
    const typed = email.trim();
    if (found || typed === normalized) return found;
    return this.prisma.user.findUnique({ where: { email: typed }, select });
  }

  /* ---------- helpers ---------- */
  private toDomain(row: PrismaUser): User {
    /* isolate Prisma shape from domain */
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      name: row.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
