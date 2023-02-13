import { Module } from '@nestjs/common';
import { ParametersService } from './parameters.service';
import { ParametersController } from './parameters.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Parameters, ParametersSchema } from './schema/parameters.schema';
import { Sequence, SequenceSchema } from './schema/sequence.schema';

@Module({
  imports:[
    MongooseModule.forFeature([
      {
        name: Parameters.name,
        schema: ParametersSchema

      },
      {
        name: Sequence.name,
        schema: SequenceSchema

      }
    ],'activationParameters'),
  ],
  controllers: [ParametersController],
  providers: [ParametersService], 
  exports: [ParametersService]
})
export class ParametersModule {}
