import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CurationService } from './curation.service';
import * as Promise from 'bluebird';



async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const curationService = app.select(AppModule).get(CurationService);
  let i = 0
  while(i < 5) {
    await curationService.run()
    i++
  }
  Logger.log("Done streaming")
}
bootstrap();
