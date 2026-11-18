import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from './user.repository';

const row = (email: string) => ({
  id: 'u1',
  email,
  password: null,
  name: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('UserRepository email handling', () => {
  const findUnique = jest.fn();
  const create = jest.fn();
  let repo: UserRepository;

  beforeEach(() => {
    jest.resetAllMocks();
    repo = new UserRepository({
      user: { findUnique, create },
    } as unknown as PrismaService);
  });

  describe('create', () => {
    it('stores the email trimmed and lower-cased', async () => {
      create.mockImplementation(({ data }: { data: { email: string } }) =>
        Promise.resolve(row(data.email)),
      );

      await repo.create({
        email: '  Ada@Example.COM ',
        password: 'hash',
        name: 'Ada',
      });

      expect(create).toHaveBeenCalledWith({
        data: { email: 'ada@example.com', password: 'hash', name: 'Ada' },
      });
    });
  });

  describe('findByEmail', () => {
    it('looks up the normalized email, whatever case was typed', async () => {
      findUnique.mockResolvedValue(row('ada@example.com'));

      const user = await repo.findByEmail('ADA@Example.com');

      expect(user?.email).toBe('ada@example.com');
      expect(findUnique).toHaveBeenCalledTimes(1);
      expect(findUnique).toHaveBeenCalledWith({
        where: { email: 'ada@example.com' },
      });
    });

    it('falls back to the exact spelling for accounts stored with capitals', async () => {
      findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(row('Legacy@Example.com'));

      const user = await repo.findByEmail('Legacy@Example.com');

      expect(user?.email).toBe('Legacy@Example.com');
      expect(findUnique).toHaveBeenNthCalledWith(1, {
        where: { email: 'legacy@example.com' },
      });
      expect(findUnique).toHaveBeenNthCalledWith(2, {
        where: { email: 'Legacy@Example.com' },
      });
    });

    it('does not repeat the query when the typed email is already normalized', async () => {
      findUnique.mockResolvedValue(null);

      await expect(repo.findByEmail('nobody@example.com')).resolves.toBeNull();

      expect(findUnique).toHaveBeenCalledTimes(1);
    });

    it('only ever does exact matches, never a pattern match', async () => {
      findUnique.mockResolvedValue(null);

      await repo.findByEmail('a.c@x.com');

      for (const [args] of findUnique.mock.calls as [
        { where: { email: unknown } },
      ][]) {
        // A plain string value (exact match), not { equals, mode: 'insensitive' } or similar.
        expect(typeof args.where.email).toBe('string');
      }
    });
  });

  describe('findIdentityByEmail', () => {
    it('selects only id and email, using the normalized email', async () => {
      findUnique.mockResolvedValue({ id: 'u1', email: 'ada@example.com' });

      await repo.findIdentityByEmail('Ada@Example.com');

      expect(findUnique).toHaveBeenCalledWith({
        where: { email: 'ada@example.com' },
        select: { id: true, email: true },
      });
    });

    it('falls back to the exact spelling for accounts stored with capitals', async () => {
      findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'u2', email: 'Legacy@Example.com' });

      const found = await repo.findIdentityByEmail('Legacy@Example.com');

      expect(found).toEqual({ id: 'u2', email: 'Legacy@Example.com' });
      expect(findUnique).toHaveBeenLastCalledWith({
        where: { email: 'Legacy@Example.com' },
        select: { id: true, email: true },
      });
    });
  });
});
