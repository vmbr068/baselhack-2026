import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { McpCreatorService } from './mcp-creator.service.js';
import {
  GenerateRequestDto,
  ScanRequestDto,
  ToolCallRequestDto,
} from './mcp-creator.dto.js';
import type {
  ToolCallResponse,
  GenerateResponse,
  WebScanResult,
  MCPServerConfig,
} from './mcp-creator.types.js';

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

  @Post('api/v1/scan')
  async scan(@Body() dto: ScanRequestDto): Promise<WebScanResult> {
    return this.mcpCreatorService.scanWebsite(dto.url);
  }

  @Post('api/v1/generate')
  async generate(@Body() dto: GenerateRequestDto): Promise<GenerateResponse> {
    return this.mcpCreatorService.generate(dto.url);
  }

  @Get('api/v1/servers')
  listServers(): MCPServerConfig[] {
    return this.mcpCreatorService.listServers();
  }

  @Get('api/v1/servers/:id')
  getServer(@Param('id') id: string): MCPServerConfig {
    return this.mcpCreatorService.getServer(id);
  }

  @Post('api/v1/servers/:id/call')
  async callTool(
    @Param('id') id: string,
    @Body() req: ToolCallRequestDto,
  ): Promise<ToolCallResponse> {
    return this.mcpCreatorService.callTool(
      id,
      req.tool_name,
      req.arguments || {},
    );
  }
}
