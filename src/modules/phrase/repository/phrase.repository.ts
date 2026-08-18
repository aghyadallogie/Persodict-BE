import { Injectable } from '@nestjs/common';
import { Phrase as PrismaPhrase } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { Phrase } from '@/modules/phrase/domain/phrase.model';

@Injectable()
export class PhraseRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------- creators ---------- */
  async create(data: Omit<Phrase, 'id'>): Promise<Phrase> {
    const result = await this.prisma.phrase.create({
      data: {
        authorId: data.authorId,
        translations: data.translations,
      },
    });
    return this.toDomain(result);
  }

  /* ---------- readers ---------- */
  async findByAuthorId(authorId: string): Promise<Phrase[]> {
    const rows = await this.prisma.phrase.findMany({ where: { authorId } });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(phraseId: string): Promise<Phrase | null> {
    const row = await this.prisma.phrase.findUnique({
      where: { id: phraseId },
    });
    return row ? this.toDomain(row) : null;
  }

  /* ---------- deleters ---------- */
  async delete(phraseId: string): Promise<Phrase> {
    const row = await this.prisma.phrase.delete({ where: { id: phraseId } });
    return this.toDomain(row);
  }

  /* ---------- mappers ---------- */
  private toDomain(row: PrismaPhrase): Phrase {
    return {
      id: row.id,
      authorId: row.authorId,
      translations: row.translations as Record<string, string>,
    };
  }
}
