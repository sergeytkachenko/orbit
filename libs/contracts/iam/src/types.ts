/*
 * Re-exports of generated iam.proto types under the names the rest of the
 * codebase consumes. The single source of truth is `protos/iam.proto`
 * → regenerate via `pnpm proto:gen`.
 *
 * `IamServiceClient` is declared here (and not in generated/) because
 * ts-proto with `nestJs=true` emits a client interface without the
 * optional `Metadata` argument that `IamClient` uses to forward
 * correlation IDs.
 */
import { Metadata } from '@grpc/grpc-js';
import { Observable } from 'rxjs';
import {
  CreateUserRequest as GeneratedCreateUserRequest,
  GetUserRequest as GeneratedGetUserRequest,
  User as GeneratedUser,
} from './generated/iam';

export type IamUser = GeneratedUser;
export type GetUserRequest = GeneratedGetUserRequest;
export type CreateUserRequest = GeneratedCreateUserRequest;

export interface IamServiceClient {
  getUser(request: GetUserRequest, metadata?: Metadata): Observable<IamUser>;
  createUser(request: CreateUserRequest, metadata?: Metadata): Observable<IamUser>;
}
