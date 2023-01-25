import { Module } from '@nestjs/common';
import { ActivationService } from './activation.service';
import { ActivationController } from './activation.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Activation, ActivationSchema } from './schema/activation.schema';
import { ParametersModule } from 'src/parameters/parameters.module';
import { HttpModule } from '@nestjs/axios';


@Module({
  imports:[ 
    ParametersModule,
    MongooseModule.forFeature([
      {
        name: Activation.name,
        schema: ActivationSchema

      }
    ],'activation'),
    HttpModule
  ],
  controllers: [ActivationController],
  providers: [ActivationService]

})
export class ActivationModule {}
