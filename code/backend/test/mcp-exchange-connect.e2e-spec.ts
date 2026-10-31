import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { AppModule } from './../src/app.module.js';

describe('MCP Exchange agent connection (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;
  let entryId: string;
  const mockHotelFileUrl = pathToFileURL(
    path.resolve(process.cwd(), 'mock_hotel/index.html'),
  ).href;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;

    const generated = await request(app.getHttpServer())
      .post('/api/v1/generate')
      .send({ url: mockHotelFileUrl });
    const published = await request(app.getHttpServer())
      .post('/api/v1/exchange/mcps')
      .send({ server_id: generated.body.server_id });
    entryId = published.body.entry_id;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('…/versions/:n/connection (GET) should provide the connection details', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/v1/exchange/mcps/${entryId}/versions/1/connection`,
    );

    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
    expect(res.body.transports.sse_url).toContain('/mcp/sse');
    expect(res.body.transports.stdio.command).toBe('node');
    const servers = Object.values(res.body.claude_config.mcpServers) as any[];
    expect(servers[0].url).toBe(res.body.transports.sse_url);
  });

  it('an MCP client can connect through the published details and list the tools', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/v1/exchange/mcps/${entryId}/versions/1/connection`,
    );
    const sseUrl = res.body.transports.sse_url as string;
    expect(sseUrl.startsWith(baseUrl)).toBe(true);

    const client = new Client({ name: 'exchange-e2e', version: '1.0.0' });
    await client.connect(new SSEClientTransport(new URL(sseUrl)));
    try {
      const { tools } = await client.listTools();
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('check_availability');
      expect(toolNames).toContain('reserve_room');
    } finally {
      await client.close();
    }
  }, 30000);

  it('…/versions/:n/connection (GET) should 404 on an unknown version', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/v1/exchange/mcps/${entryId}/versions/42/connection`,
    );
    expect(res.status).toBe(404);
  });
});
