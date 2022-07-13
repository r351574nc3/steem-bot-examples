import { Test, TestingModule } from '@nestjs/testing';
import { SteemService } from './steem.service';

describe('SteemService', () => {
  let service: SteemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SteemService],
    }).compile();

    service = module.get<SteemService>(SteemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
