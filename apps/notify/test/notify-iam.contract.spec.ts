import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { Test } from '@nestjs/testing';
import { ClientGrpc, ClientsModule } from '@nestjs/microservices';
import { ValidationError } from '@orbit/common';
import { IAM_PACKAGE, IAM_PROTO_PATH, IAM_SERVICE_NAME } from '@orbit/contracts-iam';
import { buildGrpcClientOptions } from '@orbit/transport-grpc';
import { IAM_CLIENT, IamClient } from '../src/clients/iam.client';

/**
 * Contract test: spins up a real gRPC server that loads `iam.proto`,
 * registers handler stubs, and points `IamClient` at it. This catches
 * proto / service-name / method-name drift between the contract and
 * the client without requiring the actual iam process.
 *
 * Why this matters: the existing e2e suite mocks `IamClient` directly,
 * which bypasses the wire format entirely. A change to iam.proto that
 * renames `GetUser` would silently pass that suite — this test would
 * fail.
 */
describe('notify → iam gRPC contract', () => {
  let server: grpc.Server;
  let port: number;
  let client: IamClient;

  beforeAll(async () => {
    const def = protoLoader.loadSync(IAM_PROTO_PATH, {
      keepCase: false,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const pkg = grpc.loadPackageDefinition(def) as unknown as {
      iam: { IamService: { service: grpc.ServiceDefinition } };
    };

    server = new grpc.Server();
    server.addService(pkg.iam.IamService.service, {
      getUser: (call: grpc.ServerUnaryCall<{ id: string }, unknown>, cb: grpc.sendUnaryData<unknown>) => {
        const { id } = call.request;
        if (!id) {
          cb({
            name: 'Error',
            message: 'id required',
            code: grpc.status.INVALID_ARGUMENT,
          } as grpc.ServiceError);
          return;
        }
        cb(null, {
          id,
          email: 'contract@iam.test',
          displayName: 'Contract User',
          createdAt: '2026-05-24T12:00:00.000Z',
        });
      },
      createUser: (_call: grpc.ServerUnaryCall<unknown, unknown>, cb: grpc.sendUnaryData<unknown>) => {
        cb({
          name: 'Error',
          message: 'not used in this test',
          code: grpc.status.UNIMPLEMENTED,
        } as grpc.ServiceError);
      },
    });

    port = await new Promise<number>((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (err, p) => {
        if (err) return reject(err);
        resolve(p);
      });
    });

    const mod = await Test.createTestingModule({
      imports: [
        ClientsModule.register([
          buildGrpcClientOptions({
            name: IAM_CLIENT,
            packageName: IAM_PACKAGE,
            protoPath: IAM_PROTO_PATH,
            url: `127.0.0.1:${port}`,
          }),
        ]),
      ],
      providers: [IamClient],
    }).compile();
    await mod.init();

    // IamClient.onModuleInit calls grpc.getService(); Test's compile()+init()
    // runs lifecycle hooks, but we re-assign explicitly to be deterministic
    // about which client instance is under test.
    const handle = mod.get<ClientGrpc>(IAM_CLIENT);
    (client as unknown) = mod.get(IamClient);
    client = mod.get(IamClient);
    (client as unknown as { service: unknown }).service = handle.getService(IAM_SERVICE_NAME);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.tryShutdown(() => resolve()));
  });

  it('GetUser request and response match the proto', async () => {
    const user = await client.getUser('user-42');
    expect(user).toEqual({
      id: 'user-42',
      email: 'contract@iam.test',
      displayName: 'Contract User',
      createdAt: '2026-05-24T12:00:00.000Z',
    });
  });

  it('INVALID_ARGUMENT from server translates to ValidationError', async () => {
    await expect(client.getUser('')).rejects.toBeInstanceOf(ValidationError);
  });
});
