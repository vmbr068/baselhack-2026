import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { AppModule } from './../src/app.module.js';

describe('McpExchangeController (e2e)', () => {
  let app: INestApplication<App>;
  let serverId: string;
  const mockHotelFileUrl = pathToFileURL(
    path.resolve(process.cwd(), 'mock_hotel/index.html'),
  ).href;
  const exchangeDir = path.resolve(process.cwd(), 'exchange_store');

  beforeAll(async () => {
    // Start from an empty catalogue so version numbers are deterministic
    try {
      for (const file of await fs.readdir(exchangeDir)) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(exchangeDir, file));
        }
      }
    } catch {
      // Directory does not exist yet; the service creates it on init
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/api/v1/generate')
      .send({ url: mockHotelFileUrl });
    serverId = res.body.server_id;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/exchange/mcps (POST) should publish a generated MCP with its metadata', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/exchange/mcps')
      .send({ server_id: serverId, description: 'Grand Hotel Basel booking' });

    expect(res.status).toBe(201);
    expect(res.body.entry_id).toBeDefined();
    expect(res.body.source_url).toBe(mockHotelFileUrl);
    expect(res.body.site_title).toContain('Grand Hotel Basel');
    expect(res.body.latest_version).toBe(1);
    expect(res.body.versions.length).toBe(1);

    const v1 = res.body.versions[0];
    expect(v1.version).toBe(1);
    expect(v1.server_id).toBe(serverId);
    expect(v1.description).toBe('Grand Hotel Basel booking');
    const toolNames = v1.tools.map((t: any) => t.name);
    expect(toolNames).toContain('check_availability');
    expect(toolNames).toContain('reserve_room');
  });

  it('/api/v1/exchange/mcps (POST) republishing the same site should add a version without overwriting', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/exchange/mcps')
      .send({ server_id: serverId, description: 'Second publication' });

    expect(res.status).toBe(201);
    expect(res.body.latest_version).toBe(2);
    expect(res.body.versions.length).toBe(2);

    const versions = res.body.versions.map((v: any) => v.version);
    expect(versions).toContain(1);
    expect(versions).toContain(2);
    const v1 = res.body.versions.find((v: any) => v.version === 1);
    expect(v1.description).toBe('Grand Hotel Basel booking');
  });

  it('/api/v1/exchange/mcps (POST) should persist published entries to disk', async () => {
    const files = await fs.readdir(exchangeDir);
    const entryFiles = files.filter((f) => f.endsWith('.json'));
    expect(entryFiles.length).toBe(1);

    const raw = await fs.readFile(
      path.join(exchangeDir, entryFiles[0]),
      'utf-8',
    );
    const entry = JSON.parse(raw);
    expect(entry.sourceUrl).toBe(mockHotelFileUrl);
    expect(entry.versions.length).toBe(2);
  });

  it('/api/v1/exchange/mcps (POST) should reject an unknown server id', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/exchange/mcps')
      .send({ server_id: 'does-not-exist-12345' });

    expect(res.status).toBe(404);
  });
});
