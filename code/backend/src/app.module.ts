import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { McpCreatorModule } from './mcp-creator/mcp-creator.module.js';
import { McpExchangeModule } from './mcp-exchange/mcp-exchange.module.js';

@Module({
  imports: [McpCreatorModule, McpExchangeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
