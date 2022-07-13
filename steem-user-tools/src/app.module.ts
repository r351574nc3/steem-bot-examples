import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserService } from './user/user.service';
import { HiveService } from './hive/hive.service';
import { SteemService } from './steem/steem.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, UserService, HiveService, SteemService],
})
export class AppModule {}
