import { Module } from '@nestjs/common';
import { SteemService } from './steem.service';

@Module({
  imports: [],
  controllers: [],
  providers: [SteemService],
})
export class SteemModule {}
