import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from '../domain/user.model';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------- creators ---------- */
  async create(data: {
    email: string;
    password: string;
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

  /* ---------- helpers ---------- */
  private toDomain(row: any): User {
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
