/*
 * Resolves the notify.proto path at runtime. Mirrors the iam contracts
 * package; kept here so notify's contract is self-contained.
 */
import { existsSync } from 'fs';
import { resolve } from 'path';

const file = 'notify.proto';

const candidates = [
  resolve(__dirname, '..', 'protos', file),
  resolve(__dirname, '..', '..', 'protos', file),
  resolve(process.cwd(), 'libs', 'contracts', 'notify', 'protos', file),
  resolve(__dirname, '..', '..', '..', '..', '..', 'libs', 'contracts', 'notify', 'protos', file),
];

const found = candidates.find(existsSync);
export const NOTIFY_PROTO_PATH = found ?? candidates[0];
export const NOTIFY_PACKAGE = 'notify';
export const NOTIFY_SERVICE_NAME = 'NotifyService';
