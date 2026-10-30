import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('MCP Exchange Backend & Dynamic MCP Factory')
    .setDescription(
      'Autonomous Model Context Protocol (MCP) Creator for hotel booking sites. Scans websites with Playwright and generates actionable MCP servers.',
    )
    .setVersion('1.0')
    .addTag('MCP Creator')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
