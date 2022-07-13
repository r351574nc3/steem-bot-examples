import { Test, TestingModule } from '@nestjs/testing';
import { HiveService } from './hive.service';

describe('HiveService', () => {
  let service: HiveService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HiveService],
    }).compile();

    service = module.get<HiveService>(HiveService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
