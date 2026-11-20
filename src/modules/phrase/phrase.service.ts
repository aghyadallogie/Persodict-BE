import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../../modules/settings/settings.service';
import { Phrase } from './domain/phrase.model';
import { CreatePhraseDto } from './dto/create-phrase.dto';
import { PhraseRepository } from './repository/phrase.repository';

interface DeepLResult {
  lang: string;
  lingo: string;
}

@Injectable()
export class PhraseService {
  constructor(
    private readonly repo: PhraseRepository,
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
  ) { }

  /* ---------- reads ---------- */
  async getPhrases(authorId: string): Promise<Phrase[]> {
    return this.repo.findByAuthorId(authorId);
  }

  /* ---------- writes ---------- */
  async addPhrase(dto: CreatePhraseDto): Promise<Phrase> {
    return this.repo.create(dto);
  }

  async translateAndSavePhrase(
    authorId: string,
    text: string,
  ): Promise<Phrase> {
    const results = await this.translatePhrase(authorId, text);
    const translations = results.reduce<Record<string, string>>(
      (acc, { lang, lingo }) => {
        acc[lang] = lingo;
        return acc;
      },
      {},
    );
    return this.repo.create({ authorId, translations });
  }

  /* ---------- deletes ---------- */
  async deletePhrase(phraseId: string, authorId: string): Promise<Phrase> {
    const phrase = await this.repo.findById(phraseId);
    if (!phrase) {
      throw new NotFoundException(`Phrase with ID ${phraseId} not found`);
    }
    if (phrase.authorId !== authorId) {
      throw new ForbiddenException('You do not own this phrase');
    }
    return this.repo.delete(phraseId);
  }

  /* ---------- translation ---------- */
  private async translatePhrase(
    authorId: string,
    text: string,
  ): Promise<DeepLResult[]> {
    if (!text.trim()) {
      throw new BadRequestException('Text cannot be empty');
    }

    const settings = await this.settingsService.getByUserId(authorId);
    if (!settings.userLangs?.length) {
      throw new BadRequestException('No language settings found for user');
    }

    try {
      return await this.translatePhraseToLangs(text, settings.userLangs);
    } catch (error) {
      // Errors we raised on purpose already carry the right status and message.
      if (error instanceof HttpException) throw error;
      console.error('Translation failed:', error);
      throw new InternalServerErrorException('Failed to translate phrase');
    }
  }

  /**
   * Translates into English plus every language of the user, all or nothing: if any language
   * fails, nothing is returned, so the caller never saves a phrase with missing translations
   * that the user could not repair (and that would otherwise look like a success).
   */
  private async translatePhraseToLangs(
    text: string,
    langs: string[],
  ): Promise<DeepLResult[]> {
    const targetLangs = ['en', ...langs];
    const results = await Promise.allSettled(
      targetLangs.map((lang) => this.translateWithDeepL(text, lang)),
    );

    const translations: DeepLResult[] = [];
    const failedLangs: string[] = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        translations.push(result.value);
      } else {
        failedLangs.push(targetLangs[i]);
        console.error(
          `Translation failed for lang "${targetLangs[i]}":`,
          result.reason,
        );
      }
    });

    if (failedLangs.length > 0) {
      throw new BadGatewayException(
        `Could not translate to: ${failedLangs.join(', ')}. Nothing was saved, please try again.`,
      );
    }
    return translations;
  }

  private async translateWithDeepL(
    text: string,
    lang: string,
    retryCount = 0,
  ): Promise<DeepLResult> {
    const MAX_RETRIES = 3;
    const apiKey = this.configService.get<string>('DEEPL_AUTH_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException('DeepL API key is not configured');
    }

    const url = 'https://api-free.deepl.com/v2/translate';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: [text], target_lang: lang.toUpperCase() }),
    });

    if (response.status === 403) {
      throw new InternalServerErrorException(
        'DeepL API authentication failed. Please check your API key.',
      );
    }

    if (response.status === 429) {
      if (retryCount >= MAX_RETRIES) {
        throw new InternalServerErrorException(
          'Max retries reached for DeepL API',
        );
      }
      const waitTime = Math.pow(2, retryCount) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.translateWithDeepL(text, lang, retryCount + 1);
    }

    if (!response.ok) {
      throw new InternalServerErrorException(
        `DeepL API error: ${response.status}`,
      );
    }

    const data = (await response.json()) as {
      translations: { text: string }[];
    };
    if (!data.translations?.[0]?.text) {
      throw new InternalServerErrorException(
        'Invalid response format from DeepL API',
      );
    }

    return { lang, lingo: data.translations[0].text };
  }
}
