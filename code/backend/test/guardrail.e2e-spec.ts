import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { AppModule } from './../src/app.module.js';

// Red team of the human confirmation guardrail: an agent tries every way we
// could think of to book without a human approving. Every booking goes through
// the browser, so "Playwright never launched" proves nothing reached the hotel.
describe('Confirmation guardrail bypass attempts (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;
  let serverA: string;
  let serverB: string;
  let launchSpy: ReturnType<typeof vi.spyOn>;

  const stay = {
    room_title: 'Deluxe Rhine View Suite',
    check_in: '2026-12-05',
    check_out: '2026-12-07',
    guest_name: 'Sacha Ramstein',
    guest_email: 'sacha@baselhack.ch',
  };

  const call = (serverId: string, body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post(`/api/v1/servers/${serverId}/call`)
      .send({ tool_name: 'reserve_room', arguments: stay, ...body });

  /** Asks for a booking and returns its pending token and approval path. */
  const requestApproval = async (serverId: string) => {
    const res = await call(serverId, {});
    expect(res.body.status).toBe('pending_confirmation');
    const { token, approval_url } = res.body.confirmation_details;
    return { token, approvalPath: new URL(approval_url).pathname };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.listen(0);
    baseUrl = await app.getUrl();

    const hotelUrl = pathToFileURL(
      path.resolve(process.cwd(), 'mock_hotel/index.html'),
    ).href;
    const generate = () =>
      request(app.getHttpServer())
        .post('/api/v1/generate')
        .send({ url: hotelUrl })
        .expect(201);
    serverA = (await generate()).body.server_id;
    serverB = (await generate()).body.server_id;

    // Scanning above needs the browser; from here on, nothing may launch it.
    launchSpy = vi.spyOn(chromium, 'launch');
  }, 60000);

  afterEach(() => {
    vi.useRealTimers();
    expect(launchSpy).not.toHaveBeenCalled();
  });

  afterAll(async () => {
    launchSpy.mockRestore();
    await app.close();
  });

  it('blocks a booking sent without any confirmation', async () => {
    const res = await call(serverA, {});

    expect(res.body.success).toBe(false);
    expect(res.body.status).toBe('pending_confirmation');
    expect(res.body.data.blocked).toBe(true);
  });

  it.each([
    ['confirmed_by_human in the body', { confirmed_by_human: true }],
    [
      'confirmed_by_human as a string',
      { arguments: { ...stay, confirmed_by_human: 'true' } },
    ],
    [
      'made-up approval flags',
      { arguments: { ...stay, approved: true, human_approved: true } },
    ],
  ])('ignores self-approval via %s', async (_, body) => {
    const res = await call(serverA, body);

    expect(res.body.status).toBe('pending_confirmation');
  });

  it('refuses an invented token', async () => {
    const res = await call(serverA, {
      confirmation_token: `conf_tok_${'A'.repeat(32)}`,
    });

    expect(res.body.status).toBe('rejected');
  });

  it('does not approve when the link is only opened (GET, link previews)', async () => {
    const { token, approvalPath } = await requestApproval(serverA);
    await request(app.getHttpServer()).get(approvalPath).expect(200);

    const res = await call(serverA, { confirmation_token: token });

    expect(res.body.status).toBe('pending_confirmation');
  });

  it('refuses a token the human rejected', async () => {
    const { token, approvalPath } = await requestApproval(serverA);
    await request(app.getHttpServer())
      .post(`${approvalPath}/reject`)
      .expect(200);
    await request(app.getHttpServer()).post(approvalPath).expect(404);

    const res = await call(serverA, { confirmation_token: token });

    expect(res.body.status).toBe('rejected');
  });

  it('refuses an approved token on another MCP server', async () => {
    const { token, approvalPath } = await requestApproval(serverA);
    await request(app.getHttpServer()).post(approvalPath).expect(200);

    const res = await call(serverB, { confirmation_token: token });

    expect(res.body.status).toBe('rejected');
  });

  it('refuses an approved token once it has expired', async () => {
    const { token, approvalPath } = await requestApproval(serverA);
    await request(app.getHttpServer()).post(approvalPath).expect(200);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 16 * 60 * 1000);

    const res = await call(serverA, { confirmation_token: token });

    expect(res.body.status).toBe('rejected');
  });

  it.each(['Reserve_Room', 'reserve_room ', 'reserve-room'])(
    'refuses the look-alike tool name %j',
    async (toolName) => {
      const res = await call(serverA, { tool_name: toolName });

      expect(res.body.success).toBe(false);
      expect(res.body.status).toBe('rejected');
    },
  );

  it('ignores self-approval through a real MCP client', async () => {
    const client = new Client({ name: 'red-team-agent', version: '1.0.0' });
    await client.connect(
      new SSEClientTransport(
        new URL(`${baseUrl}/api/v1/servers/${serverA}/mcp/sse`),
      ),
    );
    try {
      const result = await client.callTool({
        name: 'reserve_room',
        arguments: { ...stay, confirmed_by_human: true },
      });
      const text = (result.content as Array<{ text: string }>)[0].text;

      expect(JSON.parse(text).status).toBe('pending_confirmation');
    } finally {
      await client.close();
    }
  });
});
