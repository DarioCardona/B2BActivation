import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);


  const config = new DocumentBuilder()
  .setTitle('B2B Activation')
  .setDescription('The B2B Activation API description')
  .setVersion('1.0')
  .addTag('B2B','Parameter')
  .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('Documentation', app, document);

  await app.listen(3000);
}
bootstrap();
