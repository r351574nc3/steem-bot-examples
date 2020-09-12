import { Module } from '@nestjs/common';
import { HiveModule } from './hive.module';
import { HiveService } from './hive.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CurationService } from './curation.service';
import { PersistanceService } from './persistance.service';
import { SteemModule } from './steem.module';
import { SteemService } from './steem.service';

@Module({
  imports: [ HiveModule, SteemModule ],
  controllers: [AppController],
  providers: [
    AppService, 
    CurationService, 
    HiveService,
    PersistanceService,
    SteemService,
  ],
})
export class AppModule {}
