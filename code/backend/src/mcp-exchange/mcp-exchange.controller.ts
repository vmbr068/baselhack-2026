import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { McpExchangeService } from './mcp-exchange.service.js';
import { PublishRequestDto } from './mcp-exchange.dto.js';
import type { PublishResponse } from './mcp-exchange.types.js';

@ApiTags('MCP Exchange')
@Controller('api/v1/exchange')
export class McpExchangeController {
  constructor(private readonly mcpExchangeService: McpExchangeService) {}

  @ApiOperation({
    summary:
      'Publish a generated MCP server to the Exchange (append-only: republishing the same site adds a new version)',
  })
  @Post('mcps')
  async publish(@Body() dto: PublishRequestDto): Promise<PublishResponse> {
    return this.mcpExchangeService.publish(dto.server_id, dto.description);
  }
}
