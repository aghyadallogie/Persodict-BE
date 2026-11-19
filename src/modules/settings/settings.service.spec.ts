import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SettingsRepository } from './repository/settings.repository';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  const repo = { create: jest.fn(), findByUserId: jest.fn() };
  let service: SettingsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new SettingsService(repo as unknown as SettingsRepository);
  });

  describe('create', () => {
    it('saves the languages for exactly the user it is given', async () => {
      repo.create.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        userLangs: ['de'],
      });

      await service.create('u1', ['de']);

      expect(repo.create).toHaveBeenCalledWith({
        userId: 'u1',
        userLangs: ['de'],
      });
    });

    it.each([[[]], [undefined as unknown as string[]]])(
      'requires at least one language (%p)',
      async (langs) => {
        await expect(service.create('u1', langs)).rejects.toThrow(
          BadRequestException,
        );
        expect(repo.create).not.toHaveBeenCalled();
      },
    );
  });

  describe('getByUserId', () => {
    it('returns the stored settings', async () => {
      const stored = { id: 's1', userId: 'u1', userLangs: ['de'] };
      repo.findByUserId.mockResolvedValue(stored);

      await expect(service.getByUserId('u1')).resolves.toEqual(stored);
    });

    it('throws NotFound when the user has no settings yet', async () => {
      repo.findByUserId.mockResolvedValue(null);

      await expect(service.getByUserId('u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
