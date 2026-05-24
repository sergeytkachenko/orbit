/*
 * Resolves the iam.proto path at runtime. Mirrors the lookup the old
 * libs/proto used, but scoped to this contracts package so it stays
 * self-contained.
 */
import { existsSync } from 'fs';
import { resolve } from 'path';

const file = 'iam.proto';

const candidates = [
  // dev (ts-node): src/ → ../protos
  resolve(__dirname, '..', 'protos', file),
  // compiled: dist/libs/contracts/iam/src → ../protos (post-build copy)
  resolve(__dirname, '..', '..', 'protos', file),
  // walked back from process.cwd()
  resolve(process.cwd(), 'libs', 'contracts', 'iam', 'protos', file),
  // dist back to repo root fallback
  resolve(__dirname, '..', '..', '..', '..', '..', 'libs', 'contracts', 'iam', 'protos', file),
];

const found = candidates.find(existsSync);
export const IAM_PROTO_PATH = found ?? candidates[0];
export const IAM_PACKAGE = 'iam';
export const IAM_SERVICE_NAME = 'IamService';
