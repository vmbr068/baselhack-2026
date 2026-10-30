import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { McpCreatorModule } from './mcp-creator/mcp-creator.module.js';

@Module({
  imports: [McpCreatorModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
