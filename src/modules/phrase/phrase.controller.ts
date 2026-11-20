import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserThrottlerGuard } from '../../common/guards/user-throttler.guard';
import { PhraseService } from './phrase.service';
import { PassportJwtAuthGuard } from '../auth/guards/passport-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Phrase } from './domain/phrase.model';
import { TranslateTextDto } from './dto/translate-text.dto';

@ApiTags('phrases')
@ApiBearerAuth('JWT-auth')
@UseGuards(PassportJwtAuthGuard)
@Controller('phrases')
export class PhraseController {
  constructor(private readonly phraseService: PhraseService) {}

  @Get()
  @ApiResponse({ status: 200, description: 'Phrases found' })
  async getPhrases(@CurrentUser() authorId: string): Promise<Phrase[]> {
    return this.phraseService.getPhrases(authorId);
  }

  /** Every call costs one DeepL request per language, so it is limited per user (see PhraseModule). */
  @Post('translate')
  @UseGuards(UserThrottlerGuard)
  @ApiResponse({ status: 201, description: 'Phrase translated and saved' })
  @ApiResponse({ status: 429, description: 'Too many translations, slow down' })
  async translatePhrase(
    @CurrentUser() authorId: string,
    @Body() dto: TranslateTextDto,
  ): Promise<Phrase> {
    return this.phraseService.translateAndSavePhrase(authorId, dto.text);
  }

  @Delete(':phraseId')
  @ApiResponse({ status: 200, description: 'Phrase deleted' })
  async deletePhrase(
    @CurrentUser() authorId: string,
    @Param('phraseId') phraseId: string,
  ): Promise<Phrase> {
    return this.phraseService.deletePhrase(phraseId, authorId);
  }
}
