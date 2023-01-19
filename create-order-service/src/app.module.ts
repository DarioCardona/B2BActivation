import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ActivationModule } from './activation/activation.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ParametersModule } from './parameters/parameters.module';


@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    ActivationModule,
    MongooseModule.forRoot('mongodb://localhost/activation', {
      connectionName: 'activation',
    }),
    MongooseModule.forRoot('mongodb://localhost/activationParameters', {
      connectionName: 'activationParameters',
    }),
    ParametersModule
  ],
})
export class AppModule {}
