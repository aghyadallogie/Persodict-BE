import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { PhraseModule } from './modules/phrase/phrase.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UserModule,
    AuthModule,
    SettingsModule,
    PhraseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
