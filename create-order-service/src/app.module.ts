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
    MongooseModule.forRoot('mongodb://localhost/activation', {  //local 'mongodb://localhost/activation' 'mongodb+srv://admin:admin@b2bactivation.lzod6wf.mongodb.net/?retryWrites=true&w=majority'
      connectionName: 'activation',
    }),
    MongooseModule.forRoot( 'mongodb://localhost/activationParameters', { //local  'mongodb+srv://admin:admin@b2bactivation.lzod6wf.mongodb.net/?retryWrites=true&w=majority'
      connectionName: 'activationParameters',
    }),
    ParametersModule
  ],
})
export class AppModule {}
