import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import type { Response } from 'express';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { McpCreatorService } from './mcp-creator.service.js';
import { ProviderConnectionsService } from './provider-connections.service.js';
import {
  GenerateRequestDto,
  ScanRequestDto,
  ToolCallRequestDto,
  EnrichWordpressDto,
  EnrichGithubDto,
  SetEnabledDto,
  OAuthTicketDto,
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

  constructor(
    private readonly mcpCreatorService: McpCreatorService,
    private readonly providerConnections: ProviderConnectionsService,
  ) {}

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

  @ApiOperation({ summary: 'Scan a website and extract DOM forms, inputs, and buttons' })
  @Post('api/v1/scan')
  async scan(@Body() dto: ScanRequestDto): Promise<WebScanResult> {
    return this.mcpCreatorService.scanWebsite(dto.url);
  }

  @ApiOperation({ summary: 'Scan a hotel website and dynamically generate an initial MCP server' })
  @Post('api/v1/generate')
  async generate(@Body() dto: GenerateRequestDto): Promise<GenerateResponse> {
    return this.mcpCreatorService.generate(dto.url);
  }

  @ApiOperation({ summary: 'List all registered MCP servers' })
  @Get('api/v1/servers')
  listServers(): MCPServerConfig[] {
    return this.mcpCreatorService.listServers();
  }

  @ApiOperation({ summary: 'Get tool schemas and configuration for an MCP server' })
  @ApiParam({ name: 'id', example: 'latest', description: 'Server ID or "latest"' })
  @Get('api/v1/servers/:id')
  getServer(@Param('id') id: string): MCPServerConfig {
    return this.mcpCreatorService.getServer(id);
  }

  @ApiOperation({ summary: 'Enable or disable an MCP server' })
  @Patch('api/v1/servers/:id')
  setServerEnabled(
    @Param('id') id: string,
    @Body() dto: SetEnabledDto,
  ): Promise<MCPServerConfig> {
    if (typeof dto.enabled !== 'boolean') throw new BadRequestException('enabled must be a boolean');
    return this.mcpCreatorService.setServerEnabled(id, dto.enabled);
  }

  @ApiOperation({ summary: 'Enable or disable one MCP tool' })
  @Patch('api/v1/servers/:id/tools/:toolName')
  setToolEnabled(
    @Param('id') id: string,
    @Param('toolName') toolName: string,
    @Body() dto: SetEnabledDto,
  ): Promise<MCPServerConfig> {
    if (typeof dto.enabled !== 'boolean') throw new BadRequestException('enabled must be a boolean');
    return this.mcpCreatorService.setToolEnabled(id, toolName, dto.enabled);
  }

  @ApiOperation({ summary: 'Start GitHub OAuth for an MCP server' })
  @Get('api/v1/servers/:id/connect/github')
  async connectGithub(@Param('id') id: string, @Res() res: Response): Promise<void> {
    this.mcpCreatorService.getServer(id);
    res.redirect(this.providerConnections.beginGithub(id));
  }

  @ApiOperation({ summary: 'Start WordPress.com OAuth for an MCP server' })
  @Get('api/v1/servers/:id/connect/wordpress')
  async connectWordPress(
    @Param('id') id: string,
    @Query('site_url') siteUrl: string,
    @Res() res: Response,
  ): Promise<void> {
    this.mcpCreatorService.getServer(id);
    res.redirect(this.providerConnections.beginWordPress(id, siteUrl));
  }

  @ApiOperation({ summary: 'Complete GitHub OAuth connection' })
  @Get('api/v1/oauth/github/callback')
  async githubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') oauthError: string,
    @Res() res: Response,
  ): Promise<void> {
    if (oauthError) {
      const result = this.providerConnections.cancel('github', state);
      res.redirect(this.providerConnections.frontendResult(result.serverId, 'github', false));
      return;
    }
    const result = await this.providerConnections.complete('github', code, state);
    res.redirect(this.providerConnections.frontendResult(result.serverId, 'github', true, result.ticket));
  }

  @ApiOperation({ summary: 'Complete WordPress.com OAuth connection' })
  @Get('api/v1/oauth/wordpress/callback')
  async wordpressCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') oauthError: string,
    @Res() res: Response,
  ): Promise<void> {
    if (oauthError) {
      const result = this.providerConnections.cancel('wordpress', state);
      res.redirect(this.providerConnections.frontendResult(result.serverId, 'wordpress', false));
      return;
    }
    const result = await this.providerConnections.complete('wordpress', code, state);
    res.redirect(this.providerConnections.frontendResult(result.serverId, 'wordpress', true, result.ticket));
  }

  @ApiOperation({ summary: 'Consume a short-lived OAuth ticket once' })
  @Post('api/v1/oauth/:provider/consume')
  consumeOAuthTicket(
    @Param('provider') provider: string,
    @Body() dto: OAuthTicketDto,
  ) {
    this.mcpCreatorService.getServer(dto.serverId);
    if (provider !== 'github' && provider !== 'wordpress') {
      throw new NotFoundException(`Provider '${provider}' is not supported`);
    }
    return this.providerConnections.consumeTicket(dto.ticket, dto.serverId, provider);
  }

  @ApiOperation({ summary: 'Execute an MCP tool via direct API or Playwright on the live website' })
  @ApiParam({ name: 'id', example: 'latest', description: 'Server ID or "latest"' })
  @Post('api/v1/servers/:id/call')
  async callTool(
    @Param('id') id: string,
    @Body() req: ToolCallRequestDto,
  ): Promise<ToolCallResponse> {
    return this.mcpCreatorService.callTool(id, req.tool_name, req.arguments || {});
  }

  @ApiOperation({ summary: 'Enrich an MCP server using WordPress REST API (/wp-json)' })
  @ApiParam({ name: 'id', example: 'latest', description: 'Server ID or "latest"' })
  @Post('api/v1/servers/:id/enrich/wordpress')
  async enrichWordpress(
    @Param('id') id: string,
    @Body() dto: EnrichWordpressDto,
  ): Promise<EnrichResponse> {
    return this.mcpCreatorService.enrichWithWordpress(id, dto.wpUrl, dto.accessToken, dto.wpSiteId);
  }

  @ApiOperation({ summary: 'Enrich an MCP server using GitHub codebase analysis & OpenAPI specs' })
  @ApiParam({ name: 'id', example: 'latest', description: 'Server ID or "latest"' })
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
