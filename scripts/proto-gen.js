#!/usr/bin/env node
/*
 * Generates TypeScript types from each libs/contracts/<svc>/protos/*.proto
 * via ts-proto. Run with `pnpm proto:gen`. Output goes to
 * libs/contracts/<svc>/src/generated/ and is committed so CI doesn't need
 * protoc at build time.
 */
'use strict';

const { execFileSync } = require('child_process');
const { readdirSync, mkdirSync, existsSync } = require('fs');
const { resolve, join } = require('path');

const repoRoot = resolve(__dirname, '..');
const contractsDir = resolve(repoRoot, 'libs', 'contracts');

const protoc = resolve(repoRoot, 'node_modules', '.bin', 'grpc_tools_node_protoc');
const plugin = resolve(repoRoot, 'node_modules', '.bin', 'protoc-gen-ts_proto');

const tsProtoOpts = [
  'nestJs=true',
  'esModuleInterop=true',
  'env=node',
  'useOptionals=messages',
  'forceLong=string',
  // Match @grpc/proto-loader's `enums: String` wire format.
  'stringEnums=true',
  // proto-loader handles wire format; we only need interfaces + enums.
  'outputEncodeMethods=false',
  'outputJsonMethods=false',
  'outputClientImpl=false',
].join(',');

const services = readdirSync(contractsDir).filter((name) => existsSync(join(contractsDir, name, 'protos')));
if (services.length === 0) {
  console.error(`no contracts/<svc>/protos directories found under ${contractsDir}`);
  process.exit(1);
}

for (const service of services) {
  const protoDir = join(contractsDir, service, 'protos');
  const outDir = join(contractsDir, service, 'src', 'generated');
  mkdirSync(outDir, { recursive: true });

  const protos = readdirSync(protoDir).filter((f) => f.endsWith('.proto'));
  if (protos.length === 0) {
    console.warn(`no .proto files in ${protoDir}, skipping`);
    continue;
  }

  const args = [
    `--plugin=protoc-gen-ts_proto=${plugin}`,
    `--ts_proto_out=${outDir}`,
    `--ts_proto_opt=${tsProtoOpts}`,
    `-I=${protoDir}`,
    ...protos.map((f) => join(protoDir, f)),
  ];

  console.log(`generating ${service}: ${protos.join(', ')} → libs/contracts/${service}/src/generated/`);
  execFileSync(protoc, args, { stdio: 'inherit' });
}

console.log('done.');
