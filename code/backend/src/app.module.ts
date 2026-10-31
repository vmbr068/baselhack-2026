import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { McpCreatorModule } from './mcp-creator/mcp-creator.module.js';
import { McpExchangeModule } from './mcp-exchange/mcp-exchange.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [McpCreatorModule, McpExchangeModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
