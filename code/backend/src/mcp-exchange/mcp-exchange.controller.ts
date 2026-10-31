import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { McpExchangeService } from './mcp-exchange.service.js';
import { PublishRequestDto } from './mcp-exchange.dto.js';
import type {
  ExchangeEntrySummary,
  ExchangeVersionResponse,
  PublishResponse,
} from './mcp-exchange.types.js';

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

  @ApiOperation({
    summary:
      'List published MCPs, optionally filtered by site or capability (tool names and descriptions)',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search text matched against site title, source URL and tools',
    example: 'reserve',
  })
  @Get('mcps')
  listMcps(@Query('q') q?: string): ExchangeEntrySummary[] {
    return this.mcpExchangeService.listEntries(q);
  }

  @ApiOperation({
    summary: 'Get the detail of a published MCP: all its versions and their tools',
  })
  @ApiParam({ name: 'entryId', example: 'ex_localhost-3000-mock-hotel_89bc5b29' })
  @Get('mcps/:entryId')
  getMcp(@Param('entryId') entryId: string): PublishResponse {
    return this.mcpExchangeService.getEntry(entryId);
  }

  @ApiOperation({
    summary: 'Get one published version of an MCP, with its tools and call endpoint',
  })
  @ApiParam({ name: 'entryId', example: 'ex_localhost-3000-mock-hotel_89bc5b29' })
  @ApiParam({ name: 'version', example: 1 })
  @Get('mcps/:entryId/versions/:version')
  getMcpVersion(
    @Param('entryId') entryId: string,
    @Param('version', ParseIntPipe) version: number,
  ): ExchangeVersionResponse {
    return this.mcpExchangeService.getVersion(entryId, version);
  }
}
