import { Test, TestingModule } from '@nestjs/testing';
import { ActivationController } from './activation.controller';
import { ActivationService } from './activation.service';

describe('ActivationController', () => {
  let controller: ActivationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivationController],
      providers: [ActivationService],
    }).compile();

    controller = module.get<ActivationController>(ActivationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
