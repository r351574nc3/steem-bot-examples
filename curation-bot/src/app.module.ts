import { Module } from '@nestjs/common';
import { HiveModule } from './hive.module';
import { HiveService } from './hive.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CurationService } from './curation.service';
import { PersistanceService } from './persistance.service';
import { SteemModule } from './steem.module';
import { SteemService } from './steem.service';
import { BlurtService } from './blurt/blurt.service';

@Module({
  imports: [ HiveModule, SteemModule ],
  controllers: [AppController],
  providers: [
    AppService, 
    CurationService, 
    HiveService,
    PersistanceService,
    SteemService,
    BlurtService,
  ],
})
export class AppModule {}
