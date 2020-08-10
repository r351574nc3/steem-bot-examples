import { Module } from '@nestjs/common';
import { HiveModule } from './hive.module';
import { HiveService } from './hive.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CurationService } from './curation.service';
import { PersistanceService } from './persistance.service';

@Module({
  imports: [ HiveModule ],
  controllers: [AppController],
  providers: [
    AppService, 
    CurationService, 
    HiveService,
    PersistanceService
  ],
})
export class AppModule {}
