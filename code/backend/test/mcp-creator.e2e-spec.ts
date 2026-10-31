import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { AppModule } from './../src/app.module.js';

describe('McpCreatorController (e2e)', () => {
  let app: INestApplication<App>;
  const mockHotelFileUrl = pathToFileURL(
    path.resolve(process.cwd(), 'mock_hotel/index.html'),
  ).href;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
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
    expect(res.body.data.rooms_count).toBe(3);
    expect(res.body.data.available_rooms.length).toBe(3);
  }, 30000);

  it('/api/v1/servers/:id/call (POST) should execute reserve_room via Playwright', async () => {
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
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('confirmed');
    expect(res.body.data.confirmation_summary).toContain(
      'Reservation Confirmed',
    );
  }, 30000);

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
});
