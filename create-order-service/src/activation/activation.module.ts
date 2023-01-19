import { Module } from '@nestjs/common';
import { ActivationService } from './activation.service';
import { ActivationController } from './activation.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Activation, ActivationSchema } from './schema/activation.schema';
import { ParametersModule } from 'src/parameters/parameters.module';


@Module({
  imports:[ 
    ParametersModule,
    MongooseModule.forFeature([
      {
        name: Activation.name,
        schema: ActivationSchema

      }
    ],'activation')
  ],
  controllers: [ActivationController],
  providers: [ActivationService]

})
export class ActivationModule {}
