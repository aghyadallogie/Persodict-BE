import { PrismaService } from '../../../prisma/prisma.service';
import { PhraseRepository } from './phrase.repository';

describe('PhraseRepository.findByAuthorId', () => {
  it('asks for one author only, oldest first', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([
        { id: 'a', authorId: 'u1', translations: { en: 'one' } },
      ]);
    const repository = new PhraseRepository({
      phrase: { findMany },
    } as unknown as PrismaService);

    const phrases = await repository.findByAuthorId('u1');

    expect(findMany).toHaveBeenCalledWith({
      where: { authorId: 'u1' },
      orderBy: { id: 'asc' },
    });
    expect(phrases).toEqual([
      { id: 'a', authorId: 'u1', translations: { en: 'one' } },
    ]);
  });
});
