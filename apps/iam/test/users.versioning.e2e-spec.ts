import { VersioningType, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  AllExceptionsFilter,
  API_VERSION_HEADER,
  DEFAULT_API_VERSION,
  headerVersionExtractor,
} from '@orbit/common';
import { AppModule } from '../src/app.module';

describe('iam — X-Orbit-Api-Version', () => {
  let app: INestApplication;
  let userId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.enableVersioning({
      type: VersioningType.CUSTOM,
      extractor: headerVersionExtractor,
      defaultVersion: DEFAULT_API_VERSION,
    });
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'v@test.com', displayName: 'Ver' });
    userId = res.body.id;
  });

  afterAll(async () => app.close());

  it('returns v1 shape when header is absent (default)', async () => {
    const res = await request(app.getHttpServer()).get(`/users/${userId}`).expect(200);
    expect(res.body).toEqual({ id: userId, email: 'v@test.com' });
    expect(res.body.displayName).toBeUndefined();
    expect(res.body.createdAt).toBeUndefined();
  });

  it('returns v1 shape when header is "1"', async () => {
    const res = await request(app.getHttpServer())
      .get(`/users/${userId}`)
      .set(API_VERSION_HEADER, '1')
      .expect(200);
    expect(res.body).toEqual({ id: userId, email: 'v@test.com' });
  });

  it('returns v2 shape when header is "2"', async () => {
    const res = await request(app.getHttpServer())
      .get(`/users/${userId}`)
      .set(API_VERSION_HEADER, '2')
      .expect(200);
    expect(res.body.id).toBe(userId);
    expect(res.body.email).toBe('v@test.com');
    expect(res.body.displayName).toBe('Ver');
    expect(typeof res.body.createdAt).toBe('string');
  });

  it('falls back to v1 shape for an unknown header value', async () => {
    const res = await request(app.getHttpServer())
      .get(`/users/${userId}`)
      .set(API_VERSION_HEADER, '99')
      .expect(200);
    expect(res.body).toEqual({ id: userId, email: 'v@test.com' });
  });
});
