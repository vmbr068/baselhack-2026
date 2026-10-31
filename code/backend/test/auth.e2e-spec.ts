import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

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

  it('/api/v1/auth/demo-accounts (GET) returns seeded demo accounts', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/demo-accounts')
      .expect(200);

    expect(Array.isArray(res.body.accounts)).toBe(true);
    expect(res.body.accounts.length).toBeGreaterThanOrEqual(2);
    expect(
      res.body.accounts.some(
        (u: { email: string }) => u.email === 'owner@hotelbasel.ch',
      ),
    ).toBe(true);
    expect(
      res.body.accounts.some(
        (u: { email: string }) => u.email === 'alex@atelier-studio.ch',
      ),
    ).toBe(true);
  });

  it('/api/v1/auth/login (POST) logs in with valid demo credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@hotelbasel.ch',
        password: 'basel2026',
      })
      .expect(200);

    expect(res.body.token).toBeDefined();
    expect(res.body.token.startsWith('bus_tok_')).toBe(true);
    expect(res.body.user.email).toBe('owner@hotelbasel.ch');
    expect(res.body.user.fullName).toBe('Beatrix Meier');
    expect(res.body.user.role).toBe('business_owner');
  });

  it('/api/v1/auth/login (POST) rejects invalid password', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@hotelbasel.ch',
        password: 'wrongpassword',
      })
      .expect(401);
  });

  it('/api/v1/auth/me (GET) rejects unauthenticated request', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('/api/v1/auth/me (GET) accepts valid Bearer token', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'alex@atelier-studio.ch',
        password: 'demo1234',
      })
      .expect(200);

    const token = loginRes.body.token;

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meRes.body.user.email).toBe('alex@atelier-studio.ch');
    expect(meRes.body.user.fullName).toBe('Alex Laurent');
  });

  it('/api/v1/auth/register (POST) registers a new business owner', async () => {
    const newEmail = `founder_${Date.now()}@rhine-suites.ch`;
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: newEmail,
        password: 'securePassword99',
        fullName: 'Claire Sommer',
        company: 'Rhine Suites Basel',
      })
      .expect(201);

    expect(regRes.body.token).toBeDefined();
    expect(regRes.body.user.email).toBe(newEmail);
    expect(regRes.body.user.company).toBe('Rhine Suites Basel');

    // Duplicate email registration should fail with 409 Conflict
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: newEmail,
        password: 'securePassword99',
      })
      .expect(409);
  });

  it('/api/v1/auth/logout (POST) revokes current session', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@hotelbasel.ch',
        password: 'basel2026',
      })
      .expect(200);

    const token = loginRes.body.token;

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Subsequent call to /me with same token must fail with 401
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
});
