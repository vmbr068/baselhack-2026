import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { McpCreatorModule } from '../mcp-creator/mcp-creator.module.js';
import { McpExchangeController } from './mcp-exchange.controller.js';
import { McpExchangeService } from './mcp-exchange.service.js';

@Module({
  imports: [AuthModule, McpCreatorModule],
  controllers: [McpExchangeController],
  providers: [McpExchangeService],
  exports: [McpExchangeService],
})
export class McpExchangeModule {}
