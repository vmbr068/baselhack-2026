import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import {
  renderApprovalPage,
  renderApprovalResult,
  renderApproverLogin,
} from './approval-page.js';
import {
  APPROVER_COOKIE,
  APPROVER_SESSION_TTL_MS,
  isApprover,
  loginApprover,
} from './approver-auth.js';
import { McpCreatorService } from './mcp-creator.service.js';
import { McpAgentTransportService } from './mcp-agent-transport.service.js';
import {
  GenerateRequestDto,
  ScanRequestDto,
  ToolCallRequestDto,
  EnrichWordpressDto,
  EnrichGithubDto,
  InteractiveLoginDto,
} from './mcp-creator.dto.js';
import type {
  ToolCallResponse,
  GenerateResponse,
  WebScanResult,
  MCPServerConfig,
  EnrichResponse,
} from './mcp-creator.types.js';

const EXPIRED_APPROVAL_PAGE = renderApprovalResult(
  'Link expired',
  'This approval link is invalid, expired or already used. Nothing was done.',
);
const NOT_APPROVER_PAGE = renderApprovalResult(
  'Not logged in',
  'Only the logged-in human approver can do this. Nothing was done.',
);

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
    private readonly mcpAgentTransport: McpAgentTransportService,
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

  @ApiOperation({
    summary:
      'Serve authenticated VIP members hotel portal requiring session cookie',
  })
  @Get('mock-hotel/vip')
  async serveMockHotelVip(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const cookieHeader = req.headers.cookie || '';
    const authHeader = req.headers.authorization || '';

    const isAuthenticated =
      cookieHeader.includes('session_id=vip_session_token_123') ||
      authHeader.includes('vip_token_123');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    if (!isAuthenticated) {
      res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head><title>VIP Lounge - Authentication Required</title></head>
        <body style="font-family: sans-serif; padding: 2rem; text-align: center;">
          <h1>VIP Club Lounge - Private Access Only</h1>
          <p>Please authenticate to access exclusive executive suites.</p>
          <form id="vip-login" action="/mock-hotel/vip" method="POST" style="margin-top: 1rem;">
            <input id="vip-member-token" type="password" placeholder="Enter VIP Member Token" style="padding: 0.5rem;" />
            <button id="btn-vip-login" type="submit" style="padding: 0.5rem 1rem;">Unlock VIP Suites</button>
          </form>
        </body>
        </html>
      `);
      return;
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Grand Hotel Basel - VIP Executive Club</title></head>
      <body style="font-family: sans-serif; padding: 2rem;">
        <header>
          <h1>Grand Hotel Basel - VIP Member Suites</h1>
          <p>Exclusive authenticated portal for executive club members</p>
        </header>
        <div class="search-card" style="margin: 2rem 0;">
          <input id="check-in" type="date" value="2026-11-10" />
          <input id="check-out" type="date" value="2026-11-15" />
          <input id="guests" type="number" value="2" />
          <button id="btn-search-rooms">Search VIP Rates</button>
        </div>
        <div class="results-section active">
          <div class="room-card" style="border: 1px solid #ccc; padding: 1.5rem; border-radius: 8px;">
            <h3 class="room-title">Executive VIP Penthouse Suite</h3>
            <p class="room-desc">Private rooftop terrace with panoramic Rhine views and butler service.</p>
            <div class="room-price">CHF 950 / night</div>
            <button class="btn-book" id="btn-book-penthouse">Reserve VIP Suite</button>
          </div>
        </div>
        <div id="booking-modal" style="margin-top: 2rem;">
          <form id="reservation-form">
            <input id="guest-name" type="text" placeholder="Full Name" />
            <input id="guest-email" type="email" placeholder="Email" />
            <input id="guest-phone" type="tel" placeholder="Phone" />
            <button id="btn-confirm-reservation" type="submit">Confirm VIP Reservation</button>
          </form>
        </div>
        <div id="confirmation-view" style="display:none; margin-top: 1rem; color: green;">
          Reservation Confirmed: Executive VIP Penthouse Suite
        </div>
        <script>
          document.getElementById('reservation-form').addEventListener('submit', function(e) {
            e.preventDefault();
            document.getElementById('confirmation-view').style.display = 'block';
          });
        </script>
      </body>
      </html>
    `);
  }

  @ApiOperation({ summary: 'Submit login on demo VIP hotel' })
  @Post('mock-hotel/vip')
  loginMockHotelVip(@Res() res: Response): void {
    res.setHeader(
      'Set-Cookie',
      'session_id=vip_session_token_123; Path=/; HttpOnly',
    );
    res.redirect('/mock-hotel/vip');
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
    return this.mcpCreatorService.scanWebsite(dto.url, dto.auth_session);
  }

  @ApiOperation({
    summary:
      'Scan a hotel website and dynamically generate an initial MCP server (supports authenticated portals via delegated session)',
  })
  @Post('api/v1/generate')
  async generate(@Body() dto: GenerateRequestDto): Promise<GenerateResponse> {
    return this.mcpCreatorService.generate(dto.url, dto.auth_session);
  }

  @ApiOperation({
    summary:
      'Open website in an interactive browser window for the user to log in directly, automatically capturing session cookies upon login',
  })
  @Post('api/v1/auth/interactive-login')
  async interactiveLogin(
    @Body() dto: InteractiveLoginDto,
  ): Promise<{ auth_session: any; message: string }> {
    return this.mcpCreatorService.interactiveLogin(dto.url, dto.timeoutMs);
  }

  @ApiOperation({
    summary:
      'Open interactive login window, automatically capture authentication upon user login, and generate the MCP server in one step',
  })
  @Post('api/v1/generate/interactive')
  async generateInteractive(
    @Body() dto: InteractiveLoginDto,
  ): Promise<GenerateResponse> {
    return this.mcpCreatorService.generateInteractive(dto.url, dto.timeoutMs);
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
      'Execute an MCP tool via direct API or Playwright on the live website (with human confirmation guardrail and session auth support)',
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
      req.confirmation_token,
      req.auth_session,
    );
  }

  @ApiOperation({ summary: 'Log the human approver in' })
  @Get('approver/login')
  showApproverLogin(@Res() res: Response): void {
    res.type('html').send(renderApproverLogin(''));
  }

  @ApiOperation({ summary: 'Log the human approver in with APPROVER_PASSWORD' })
  @Post('approver/login')
  approverLogin(
    @Body() body: { password?: unknown; next?: unknown },
    @Res() res: Response,
  ): void {
    // Only redirect back to an approval page, never to an arbitrary URL.
    const next =
      typeof body?.next === 'string' && /^\/confirm\/[\w-]+$/.test(body.next)
        ? body.next
        : '';
    const sessionId = loginApprover(body?.password);
    if (!sessionId) {
      res
        .status(401)
        .type('html')
        .send(renderApproverLogin(next, 'Wrong password, or too many tries.'));
      return;
    }
    res.cookie(APPROVER_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.PUBLIC_BASE_URL?.startsWith('https:') ?? false,
      maxAge: APPROVER_SESSION_TTL_MS,
    });
    if (next) {
      res.redirect(303, next);
      return;
    }
    res
      .status(200)
      .type('html')
      .send(
        renderApprovalResult('Logged in', 'You can now approve agent actions.'),
      );
  }

  @ApiOperation({ summary: 'Show a human the action an agent asks to approve' })
  @Get('confirm/:token')
  showApproval(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    const request = this.mcpCreatorService.getApprovalRequest(token);
    if (!request) {
      res.status(404).type('html').send(EXPIRED_APPROVAL_PAGE);
      return;
    }
    if (!isApprover(req.headers.cookie)) {
      res
        .type('html')
        .send(renderApproverLogin(`/confirm/${encodeURIComponent(token)}`));
      return;
    }
    res.type('html').send(renderApprovalPage(token, request));
  }

  @ApiOperation({ summary: 'Approve an action requested by an agent' })
  @Post('confirm/:token')
  approve(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    if (!isApprover(req.headers.cookie)) {
      res.status(401).type('html').send(NOT_APPROVER_PAGE);
      return;
    }
    if (!this.mcpCreatorService.approveConfirmation(token)) {
      res.status(404).type('html').send(EXPIRED_APPROVAL_PAGE);
      return;
    }
    res
      .status(200)
      .type('html')
      .send(
        renderApprovalResult(
          'Approved',
          'You can go back to your chat and tell the agent you approved.',
        ),
      );
  }

  @ApiOperation({ summary: 'Reject an action requested by an agent' })
  @Post('confirm/:token/reject')
  reject(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    if (!isApprover(req.headers.cookie)) {
      res.status(401).type('html').send(NOT_APPROVER_PAGE);
      return;
    }
    this.mcpCreatorService.rejectConfirmation(token);
    res
      .status(200)
      .type('html')
      .send(renderApprovalResult('Rejected', 'Nothing will happen.'));
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

  @ApiOperation({
    summary:
      'Connect an AI agent (Claude, Cursor, Codex, Luna) via standard MCP Server-Sent Events (SSE)',
  })
  @ApiParam({
    name: 'id',
    example: 'latest',
    description: 'Server ID or "latest"',
  })
  @Get('api/v1/servers/:id/mcp/sse')
  async handleMcpSse(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.mcpAgentTransport.handleSseConnection(id, req, res);
  }

  @ApiOperation({
    summary:
      'MCP message endpoint for client-to-server JSON-RPC requests (SSE transport)',
  })
  @ApiParam({
    name: 'id',
    example: 'latest',
    description: 'Server ID or "latest"',
  })
  @Post('api/v1/servers/:id/mcp/messages')
  async handleMcpMessages(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.mcpAgentTransport.handlePostMessage(id, req, res);
  }
}
