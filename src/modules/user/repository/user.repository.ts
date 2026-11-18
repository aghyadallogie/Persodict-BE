import { Injectable } from '@nestjs/common';
import { User as PrismaUser } from '@prisma/client';
import { User } from '../../../modules/user/domain/user.model';
import { PrismaService } from '../../../prisma/prisma.service';

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
        email: data.email,
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

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? this.toDomain(row) : null;
  }

  /**
   * Looks a user up by email, loading only id and email. Prisma validates every column it loads,
   * so a full-row read throws on old documents that lack required fields (e.g. a null createdAt);
   * sign-in only needs to know who the user is, so it reads just these two.
   */
  async findIdentityByEmail(
    email: string,
  ): Promise<{ id: string; email: string } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
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
