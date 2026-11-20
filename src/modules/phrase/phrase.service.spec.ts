import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../settings/settings.service';
import { PhraseService } from './phrase.service';
import { PhraseRepository } from './repository/phrase.repository';

/**
 * A phrase is saved only when every requested language was translated. Before, a language that
 * failed was just dropped: the phrase was saved without it (or with no translations at all when
 * DeepL was down) and the user still got a success response.
 */
describe('PhraseService.translateAndSavePhrase', () => {
  const repo = { create: jest.fn() };
  const settings = { getByUserId: jest.fn() };
  const config = { get: jest.fn() };
  let fetchMock: jest.SpyInstance;
  let service: PhraseService;

  /** DeepL answers for each target language, in the order the service asks. */
  function deepL(answers: Record<string, string | number>) {
    fetchMock.mockImplementation((_url: unknown, init: RequestInit) => {
      const { target_lang } = JSON.parse(init.body as string) as {
        target_lang: string;
      };
      const answer = answers[target_lang.toLowerCase()];
      if (typeof answer === 'number') {
        return Promise.resolve(new Response('{}', { status: answer }));
      }
      return Promise.resolve(
        Response.json({ translations: [{ text: answer }] }),
      );
    });
  }

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock = jest.spyOn(global, 'fetch');
    config.get.mockReturnValue('deepl-key');
    settings.getByUserId.mockResolvedValue({ userLangs: ['de', 'fr'] });
    repo.create.mockImplementation((data: object) =>
      Promise.resolve({ id: 'p1', ...data }),
    );
    service = new PhraseService(
      repo as unknown as PhraseRepository,
      settings as unknown as SettingsService,
      config as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('saves English plus every language of the user when all succeed', async () => {
    deepL({ en: 'Hello', de: 'Hallo', fr: 'Bonjour' });

    const phrase = await service.translateAndSavePhrase('u1', 'Hallo Welt');

    expect(repo.create).toHaveBeenCalledWith({
      authorId: 'u1',
      translations: { en: 'Hello', de: 'Hallo', fr: 'Bonjour' },
    });
    expect(phrase.translations).toEqual({
      en: 'Hello',
      de: 'Hallo',
      fr: 'Bonjour',
    });
  });

  it('saves nothing when one language fails, and says which one', async () => {
    deepL({ en: 'Hello', de: 'Hallo', fr: 500 });

    const result = service.translateAndSavePhrase('u1', 'Hallo Welt');

    await expect(result).rejects.toThrow(BadGatewayException);
    await expect(result).rejects.toThrow(/fr\b/);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('saves nothing when English fails but the other languages work', async () => {
    deepL({ en: 500, de: 'Hallo', fr: 'Bonjour' });

    await expect(
      service.translateAndSavePhrase('u1', 'Hallo Welt'),
    ).rejects.toThrow(BadGatewayException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('saves nothing, instead of an empty phrase, when every language fails', async () => {
    deepL({ en: 500, de: 500, fr: 500 });

    await expect(
      service.translateAndSavePhrase('u1', 'Hallo Welt'),
    ).rejects.toThrow(BadGatewayException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('saves nothing when DeepL rejects the API key', async () => {
    deepL({ en: 403, de: 403, fr: 403 });

    await expect(
      service.translateAndSavePhrase('u1', 'Hallo Welt'),
    ).rejects.toThrow(BadGatewayException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('does not leak DeepL details in the error shown to the user', async () => {
    deepL({ en: 'Hello', de: 'Hallo', fr: 500 });

    const error = await service
      .translateAndSavePhrase('u1', 'Hallo Welt')
      .catch((e: Error) => e);

    expect((error as Error).message).toMatch(/Nothing was saved/);
    expect((error as Error).message).not.toMatch(/deepl|key|500/i);
  });

  it('rejects empty text without calling DeepL', async () => {
    await expect(service.translateAndSavePhrase('u1', '   ')).rejects.toThrow(
      BadRequestException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects users without language settings without calling DeepL', async () => {
    settings.getByUserId.mockResolvedValue({ userLangs: [] });

    await expect(
      service.translateAndSavePhrase('u1', 'Hallo Welt'),
    ).rejects.toThrow(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });
});
