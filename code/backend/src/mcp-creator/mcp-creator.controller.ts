import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import type { Response } from 'express';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { McpCreatorService } from './mcp-creator.service.js';
import {
  GenerateRequestDto,
  ScanRequestDto,
  ToolCallRequestDto,
  EnrichWordpressDto,
  EnrichGithubDto,
} from './mcp-creator.dto.js';
import type {
  ToolCallResponse,
  GenerateResponse,
  WebScanResult,
  MCPServerConfig,
  EnrichResponse,
} from './mcp-creator.types.js';

@ApiTags('MCP Creator')
@Controller()
export class McpCreatorController {
  private readonly mockHotelPath = path.resolve(
    process.cwd(),
    'mock_hotel/index.html',
  );
  private readonly screenshotsDir = path.resolve(
    process.cwd(),
    'static/screenshots',
  );

  constructor(private readonly mcpCreatorService: McpCreatorService) {}

  @ApiOperation({ summary: 'Serve the local demo hotel website' })
  @Get('mock-hotel')
  async serveMockHotel(@Res() res: Response): Promise<void> {
    try {
      const html = await fs.readFile(this.mockHotelPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch {
      throw new NotFoundException('Mock hotel page not found');
    }
  }

  @ApiOperation({
    summary: 'Mock WordPress REST API index for local enrichment testing',
  })
  @Get('mock-wp/wp-json')
  serveMockWordpress(): Record<string, any> {
    return {
      name: 'Grand Hotel Basel (WordPress Demo)',
      namespaces: ['wp/v2', 'hotel/v1', 'mphb/v1'],
      routes: {
        '/hotel/v1/availability': {
          endpoints: [
            {
              methods: ['GET'],
              args: {
                check_in: {
                  type: 'string',
                  required: true,
                  description: 'Arrival date (YYYY-MM-DD)',
                },
                check_out: {
                  type: 'string',
                  required: true,
                  description: 'Departure date (YYYY-MM-DD)',
                },
                adults: {
                  type: 'integer',
                  default: 2,
                  description: 'Number of adults',
                },
              },
            },
          ],
        },
        '/hotel/v1/reserve': {
          endpoints: [
            {
              methods: ['POST'],
              args: {
                room_id: {
                  type: 'string',
                  required: true,
                  description: 'Unique room identifier',
                },
                guest_name: {
                  type: 'string',
                  required: true,
                  description: 'Full name',
                },
                guest_email: {
                  type: 'string',
                  required: true,
                  description: 'Email address',
                },
                special_requests: {
                  type: 'string',
                  required: false,
                  description: 'Preferences',
                },
              },
            },
          ],
        },
      },
    };
  }

  @ApiOperation({ summary: 'Retrieve an action or confirmation screenshot' })
  @ApiParam({ name: 'filename', example: 'confirm_123456789.png' })
  @Get('static/screenshots/:filename')
  async serveScreenshot(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const filePath = path.join(this.screenshotsDir, path.basename(filename));
    try {
      await fs.access(filePath);
      res.sendFile(filePath);
    } catch {
      throw new NotFoundException('Screenshot not found');
    }
  }

  @ApiOperation({
    summary: 'Scan a website and extract DOM forms, inputs, and buttons',
  })
  @Post('api/v1/scan')
  async scan(@Body() dto: ScanRequestDto): Promise<WebScanResult> {
    return this.mcpCreatorService.scanWebsite(dto.url);
  }

  @ApiOperation({
    summary:
      'Scan a hotel website and dynamically generate an initial MCP server',
  })
  @Post('api/v1/generate')
  async generate(@Body() dto: GenerateRequestDto): Promise<GenerateResponse> {
    return this.mcpCreatorService.generate(dto.url);
  }

  @ApiOperation({ summary: 'List all registered MCP servers' })
  @Get('api/v1/servers')
  listServers(): MCPServerConfig[] {
    return this.mcpCreatorService.listServers();
  }

  @ApiOperation({
    summary: 'Get tool schemas and configuration for an MCP server',
  })
  @ApiParam({
    name: 'id',
    example: 'latest',
    description: 'Server ID or "latest"',
  })
  @Get('api/v1/servers/:id')
  getServer(@Param('id') id: string): MCPServerConfig {
    return this.mcpCreatorService.getServer(id);
  }

  @ApiOperation({
    summary:
      'Execute an MCP tool via direct API or Playwright on the live website (with human confirmation guardrail)',
  })
  @ApiParam({
    name: 'id',
    example: 'latest',
    description: 'Server ID or "latest"',
  })
  @Post('api/v1/servers/:id/call')
  async callTool(
    @Param('id') id: string,
    @Body() req: ToolCallRequestDto,
  ): Promise<ToolCallResponse> {
    return this.mcpCreatorService.callTool(
      id,
      req.tool_name,
      req.arguments || {},
      req.confirmed_by_human,
      req.confirmation_token,
    );
  }

  @ApiOperation({
    summary: 'Enrich an MCP server using WordPress REST API (/wp-json)',
  })
  @ApiParam({
    name: 'id',
    example: 'latest',
    description: 'Server ID or "latest"',
  })
  @Post('api/v1/servers/:id/enrich/wordpress')
  async enrichWordpress(
    @Param('id') id: string,
    @Body() dto: EnrichWordpressDto,
  ): Promise<EnrichResponse> {
    return this.mcpCreatorService.enrichWithWordpress(id, dto.wpUrl);
  }

  @ApiOperation({
    summary:
      'Enrich an MCP server using GitHub codebase analysis & OpenAPI specs',
  })
  @ApiParam({
    name: 'id',
    example: 'latest',
    description: 'Server ID or "latest"',
  })
  @Post('api/v1/servers/:id/enrich/github')
  async enrichGithub(
    @Param('id') id: string,
    @Body() dto: EnrichGithubDto,
  ): Promise<EnrichResponse> {
    return this.mcpCreatorService.enrichWithGithub(
      id,
      dto.repoUrl,
      dto.branch || 'main',
      dto.githubToken,
    );
  }
}
