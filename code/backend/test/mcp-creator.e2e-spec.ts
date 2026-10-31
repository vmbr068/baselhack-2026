import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { AppModule } from './../src/app.module.js';

describe('McpCreatorController (e2e)', () => {
  let app: INestApplication<App>;
  const mockHotelFileUrl = pathToFileURL(
    path.resolve(process.cwd(), 'mock_hotel/index.html'),
  ).href;

  let baseUrl: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    baseUrl = `http://localhost:${port}`;
    process.env.ALLOWED_SITE_ORIGINS = [
      process.env.ALLOWED_SITE_ORIGINS || '',
      baseUrl,
    ]
      .filter(Boolean)
      .join(',');
  });

  afterAll(async () => {
    await app.close();
  });

  it('/mock-hotel (GET) should serve the hotel HTML page', async () => {
    const res = await request(app.getHttpServer()).get('/mock-hotel');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Grand Hotel Basel');
    expect(res.text).toContain('check-in');
  });

  it('/mock-hotel/vip (GET) should enforce authentication via cookie', async () => {
    // Unauthenticated
    const unauthRes = await request(app.getHttpServer()).get('/mock-hotel/vip');
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.text).toContain('VIP Lounge - Authentication Required');

    // Authenticated
    const authRes = await request(app.getHttpServer())
      .get('/mock-hotel/vip')
      .set('Cookie', 'session_id=vip_session_token_123');
    expect(authRes.status).toBe(200);
    expect(authRes.text).toContain('Executive VIP Penthouse Suite');
  });

  it('/api/v1/generate (POST) should scan and generate an initial MCP server', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/generate')
      .send({ url: mockHotelFileUrl });

    expect(res.status).toBe(201);
    expect(res.body.server_id).toBeDefined();
    expect(res.body.hotel_name).toContain('Grand Hotel Basel');
    expect(res.body.tools.length).toBe(3);

    const toolNames = res.body.tools.map((t: any) => t.name);
    expect(toolNames).toContain('check_availability');
    expect(toolNames).toContain('reserve_room');
    expect(toolNames).toContain('get_current_status');

    const reserveTool = res.body.tools.find(
      (t: any) => t.name === 'reserve_room',
    );
    expect(reserveTool.requires_confirmation).toBe(true);
    expect(reserveTool.is_irreversible).toBe(true);

    const searchTool = res.body.tools.find(
      (t: any) => t.name === 'check_availability',
    );
    expect(searchTool.requires_confirmation).toBe(false);
    expect(searchTool.is_irreversible).toBe(false);
  }, 30000);

  it('/api/v1/generate (POST) should return 422 when the site is unreachable', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/generate')
      .send({ url: 'http://localhost:5173/' });

    expect(res.status).toBe(422);
    expect(res.body.message).toContain('Cannot reach http://localhost:5173/');
  }, 30000);

  it('/api/v1/generate (POST) should return 403 for an unauthorised site', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/generate')
      .send({ url: 'https://example.com/' });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('not an authorised site');
  });

  it('/api/v1/servers/:id/call (POST) should execute check_availability via Playwright', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/servers/latest/call')
      .send({
        tool_name: 'check_availability',
        arguments: {
          check_in: '2026-11-05',
          check_out: '2026-11-08',
          guests: 2,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('executed');
    expect(res.body.data.rooms_count).toBe(3);
    expect(res.body.data.available_rooms.length).toBe(3);
  }, 30000);

  let pendingToken: string;

  it('/api/v1/servers/:id/call (POST) should BLOCK reserve_room when human confirmation is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/servers/latest/call')
      .send({
        tool_name: 'reserve_room',
        arguments: {
          room_title: 'Deluxe Rhine View Suite',
          guest_name: 'Sacha Ramstein',
          guest_email: 'sacha@baselhack.ch',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(false);
    expect(res.body.status).toBe('pending_confirmation');
    expect(res.body.confirmation_required).toBe(true);
    expect(res.body.confirmation_details).toBeDefined();
    expect(res.body.confirmation_details.token).toMatch(/^conf_tok_/);
    expect(res.body.confirmation_details.summary).toContain(
      'Human approval required',
    );
    expect(res.body.confirmation_details.hotel).toContain('Grand Hotel Basel');
    expect(res.body.data.blocked).toBe(true);

    pendingToken = res.body.confirmation_details.token;
  });

  it('/api/v1/servers/:id/call (POST) should PROCEED with reserve_room when explicitly confirmed by human', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/servers/latest/call')
      .send({
        tool_name: 'reserve_room',
        confirmed_by_human: true,
        confirmation_token: pendingToken,
        arguments: {
          room_title: 'Deluxe Rhine View Suite',
          guest_name: 'Sacha Ramstein',
          guest_email: 'sacha@baselhack.ch',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('executed');
    expect(res.body.data.status).toBe('confirmed');
    expect(res.body.data.confirmation_summary).toContain(
      'Reservation Confirmed',
    );
  }, 30000);

  it('/api/v1/servers/:id/call (POST) should accept confirmed_by_human flag passed directly inside tool arguments', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/servers/latest/call')
      .send({
        tool_name: 'reserve_room',
        arguments: {
          room_title: 'Deluxe Rhine View Suite',
          guest_name: 'Sacha Ramstein',
          guest_email: 'sacha@baselhack.ch',
          confirmed_by_human: true,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('executed');
    expect(res.body.data.status).toBe('confirmed');
  }, 30000);

  it('should keep a redacted audit trail of tool calls and confirmations', async () => {
    const lines = (
      await fs.readFile(
        path.resolve(process.cwd(), 'audit_logs/tool-calls.jsonl'),
        'utf-8',
      )
    )
      .trim()
      .split('\n');
    const entries = lines.map((l) => JSON.parse(l));
    const reserves = entries.filter((e) => e.tool === 'reserve_room');

    expect(reserves.at(-3).status).toBe('pending_confirmation');
    expect(reserves.at(-2).confirmed_by_human).toBe(true);
    expect(reserves.at(-2).status).toBe('executed');
    expect(reserves.at(-2).time).toBeDefined();
    expect(lines.join('\n')).not.toContain(pendingToken);
  });

  it('/mock-wp/wp-json (GET) should serve mock WordPress REST API schema', async () => {
    const res = await request(app.getHttpServer()).get('/mock-wp/wp-json');
    expect(res.status).toBe(200);
    expect(res.body.namespaces).toContain('hotel/v1');
    expect(res.body.routes['/hotel/v1/availability']).toBeDefined();
    expect(res.body.routes['/hotel/v1/reserve']).toBeDefined();
  });

  it('/api/v1/servers/:id/enrich/wordpress (POST) should return 403 for an unauthorised site', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/servers/latest/enrich/wordpress')
      .send({ wpUrl: 'https://example.com/wp-json' });

    expect(res.status).toBe(403);
  });

  it('/api/v1/servers/:id/enrich/wordpress (POST) should handle invalid WP endpoint gracefully', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/servers/latest/enrich/wordpress')
      .send({ wpUrl: 'http://127.0.0.1:9999/wp-json' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Unable to reach WordPress REST API');
  });

  it('/api/v1/servers/:id/enrich/github (POST) should handle invalid repo URL gracefully', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/servers/latest/enrich/github')
      .send({ repoUrl: 'not-a-valid-url' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid GitHub repository URL');
  });

  let vipServerId: string;

  it('/api/v1/generate (POST) should scan and generate an MCP for an authenticated portal using delegated auth session', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/generate')
      .send({
        url: `${baseUrl}/mock-hotel/vip`,
        auth_session: {
          cookies: [
            {
              name: 'session_id',
              value: 'vip_session_token_123',
              domain: 'localhost',
            },
          ],
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.server_id).toBeDefined();
    expect(res.body.has_auth_session).toBe(true);
    expect(res.body.hotel_name).toContain('VIP');
    vipServerId = res.body.server_id;
  }, 30000);

  it('/api/v1/servers/:id/call (POST) should execute reserve_room on authenticated portal using stored delegated session', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/servers/${vipServerId}/call`)
      .send({
        tool_name: 'reserve_room',
        confirmed_by_human: true,
        arguments: {
          room_title: 'Executive VIP Penthouse Suite',
          guest_name: 'Executive Member',
          guest_email: 'vip@baselhack.ch',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('executed');
    expect(res.body.data.status).toBe('confirmed');
    expect(res.body.data.confirmation_summary).toContain(
      'Reservation Confirmed',
    );
  }, 30000);

  describe('MCP SSE Transport & Agent Connectivity (Issue #43)', () => {
    let mcpClient: Client | null = null;
    let sseTransport: SSEClientTransport | null = null;

    afterEach(async () => {
      if (mcpClient) {
        try {
          await mcpClient.close();
        } catch {
          // ignore
        }
        mcpClient = null;
      }
    });

    it('should connect an official MCP Client via SSE and list generated tools', async () => {
      mcpClient = new Client(
        {
          name: 'agent-test-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      );

      const sseUrl = new URL(`${baseUrl}/api/v1/servers/latest/mcp/sse`);
      sseTransport = new SSEClientTransport(sseUrl);

      await mcpClient.connect(sseTransport);

      const toolsResult = await mcpClient.listTools();
      expect(toolsResult.tools).toBeDefined();
      expect(toolsResult.tools.length).toBeGreaterThanOrEqual(3);

      const names = toolsResult.tools.map((t) => t.name);
      expect(names).toContain('check_availability');
      expect(names).toContain('reserve_room');
      expect(names).toContain('get_current_status');
    });

    it('should execute check_availability via MCP Client callTool', async () => {
      mcpClient = new Client(
        {
          name: 'agent-test-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      );

      sseTransport = new SSEClientTransport(
        new URL(`${baseUrl}/api/v1/servers/latest/mcp/sse`),
      );
      await mcpClient.connect(sseTransport);

      const result = await mcpClient.callTool({
        name: 'check_availability',
        arguments: {
          check_in: '2026-11-05',
          check_out: '2026-11-08',
          guests: 2,
        },
      });

      expect(result.content).toBeDefined();
      const textContent = (
        result.content as Array<{ type: string; text?: string }>
      )[0]?.text;
      expect(textContent).toBeDefined();
      const parsed = JSON.parse(textContent as string);
      expect(parsed.success).toBe(true);
      expect(parsed.data.rooms_count).toBeGreaterThanOrEqual(1);
    }, 30000);

    it('should enforce human confirmation via MCP Client callTool when booking', async () => {
      mcpClient = new Client(
        {
          name: 'agent-test-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      );

      sseTransport = new SSEClientTransport(
        new URL(`${baseUrl}/api/v1/servers/latest/mcp/sse`),
      );
      await mcpClient.connect(sseTransport);

      // Attempt without human confirmation
      const blockedResult = await mcpClient.callTool({
        name: 'reserve_room',
        arguments: {
          room_title: 'Deluxe Rhine View Suite',
          guest_name: 'Agent User',
          guest_email: 'agent@baselhack.ch',
          confirmed_by_human: false,
        },
      });

      const blockedText = (
        blockedResult.content as Array<{ type: string; text?: string }>
      )[0]?.text;
      expect(blockedText).toBeDefined();
      const blockedParsed = JSON.parse(blockedText as string);
      expect(blockedParsed.status).toBe('pending_confirmation');
      expect(blockedParsed.confirmation_required).toBe(true);
      expect(blockedParsed.confirmation_details.token).toBeDefined();

      const token = blockedParsed.confirmation_details.token;

      // Now call with human confirmation and token
      const confirmedResult = await mcpClient.callTool({
        name: 'reserve_room',
        arguments: {
          room_title: 'Deluxe Rhine View Suite',
          guest_name: 'Agent User',
          guest_email: 'agent@baselhack.ch',
          confirmed_by_human: true,
          confirmation_token: token,
        },
      });

      const confirmedText = (
        confirmedResult.content as Array<{ type: string; text?: string }>
      )[0]?.text;
      expect(confirmedText).toBeDefined();
      const confirmedParsed = JSON.parse(confirmedText as string);
      expect(confirmedParsed.success).toBe(true);
      expect(confirmedParsed.status).toBe('executed');
      expect(confirmedParsed.data.status).toBe('confirmed');
    }, 30000);
  });
});
