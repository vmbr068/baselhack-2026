import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { assertAllowedSite } from './site-allowlist.js';

describe('assertAllowedSite', () => {
  afterEach(() => {
    delete process.env.ALLOWED_SITE_ORIGINS;
  });

  it.each([
    'https://hotel.bh2026.tekitup.net/rooms',
    'http://localhost:3000/mock-hotel',
  ])('allows %s by default', (url) => {
    expect(() => assertAllowedSite(url)).not.toThrow();
  });

  it.each([
    'https://hotel-basel.ch/',
    'file:///etc/passwd',
    'http://localhost:2019/config/',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.40.20.201/',
    'https://hotel.bh2026.tekitup.net.evil.example/',
    'https://hotel.bh2026.tekitup.net@evil.example/',
  ])('rejects %s by default', (url) => {
    expect(() => assertAllowedSite(url)).toThrow(ForbiddenException);
  });

  it('rejects an invalid URL', () => {
    expect(() => assertAllowedSite('not a url')).toThrow(BadRequestException);
  });

  it('uses ALLOWED_SITE_ORIGINS when it is set', () => {
    process.env.ALLOWED_SITE_ORIGINS = 'https://a.example, file:';
    expect(() => assertAllowedSite('https://a.example/x')).not.toThrow();
    expect(() => assertAllowedSite('file:///tmp/x')).not.toThrow();
    expect(() => assertAllowedSite('http://localhost:3000/')).toThrow(
      ForbiddenException,
    );
  });

  it('allows every site when ALLOWED_SITE_ORIGINS is *', () => {
    process.env.ALLOWED_SITE_ORIGINS = '*';
    expect(() => assertAllowedSite('https://a.example/x')).not.toThrow();
  });
});
