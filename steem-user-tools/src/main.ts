import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UserService } from './user.service';
import * as Promise from 'bluebird';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const userService = app.select(AppModule).get(UserService);
}
bootstrap();