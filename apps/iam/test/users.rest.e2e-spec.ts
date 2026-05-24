import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AllExceptionsFilter } from '@orbit/common';
import { AppModule } from '../src/app.module';

describe('iam — REST POST /users', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => app.close());

  it('creates a user and returns the full v2 shape', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'rest@test.com', displayName: 'Rest User' })
      .expect(201);
    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.email).toBe('rest@test.com');
    expect(res.body.displayName).toBe('Rest User');
    expect(res.body.createdAt).toEqual(expect.any(String));
  });

  it('rejects an invalid email with 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'not-an-email', displayName: 'X' })
      .expect(400);
    expect(res.body.message).toMatch(/email/);
  });
});
