import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AllExceptionsFilter } from '@orbit/common';
import { AppModule } from '../src/app.module';
import { IamClient } from '../src/clients/iam.client';

/**
 * Proves the cross-service flow: POST /notifications resolves the recipient
 * through IamClient.getUser (gRPC) and embeds the returned data.
 *
 * The IamClient is mocked so the test doesn't require a running iam service —
 * we assert on the call shape, which is what matters for the contract.
 */
describe('notify → iam gRPC interaction', () => {
  let app: INestApplication;
  const iamMock = {
    getUser: jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'mock@iam.test',
      displayName: 'Mock User',
      createdAt: '2026-05-24T12:00:00.000Z',
    }),
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(IamClient)
      .useValue(iamMock)
      .compile();
    app = mod.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => app.close());
  afterEach(() => iamMock.getUser.mockClear());

  it('calls iam.getUser via gRPC and embeds recipient info', async () => {
    const res = await request(app.getHttpServer())
      .post('/notifications')
      .send({
        userId: 'user-1',
        channel: 'email',
        subject: 'hi',
        body: 'hello',
      })
      .expect(201);

    expect(iamMock.getUser).toHaveBeenCalledTimes(1);
    expect(iamMock.getUser).toHaveBeenCalledWith('user-1');

    expect(res.body.userId).toBe('user-1');
    expect(res.body.recipient).toEqual({
      email: 'mock@iam.test',
      displayName: 'Mock User',
    });
    expect(res.body.status).toBe('pending');
  });
});
