import { Test, TestingModule } from '@nestjs/testing';
import { BlurtService } from './blurt.service';

describe('BlurtService', () => {
  let service: BlurtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlurtService],
    }).compile();

    service = module.get<BlurtService>(BlurtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
