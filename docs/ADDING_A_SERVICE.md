# Adding a new service

A new service touches ~9 files across the workspace. Follow the steps in
order — each step has a fail-fast signal (typecheck, `pnpm check:circular`,
`pnpm test`) that catches a missed wire-up before the next step compounds
the mistake.

> **Conventions used below.** Replace `<svc>` with the kebab-case service
> name (e.g. `billing`), `<Svc>` with the PascalCase form (`Billing`),
> `<SVC>` with the SCREAMING_SNAKE form (`BILLING`), and `<svcCamel>` with
> the camelCase form (`billing`; only differs from `<svc>` when the name
> has a dash, e.g. `audit-log` → `auditLog`).
>
> Pick ports past the highest already in `DEFAULT_REGISTRY`: HTTP starts
> at `3001`, gRPC at `50051`.

## Checklist

1. **Register the name in the type union.**
   Edit [`libs/service-registry/src/types.ts`](../libs/service-registry/src/types.ts):

   ```ts
   export type ServiceName = 'iam' | 'notify' | '<svc>';
   ```

   Until this is done, step 2 will fail typecheck — that is intentional.

2. **Register host/port in the default registry.**
   Edit [`libs/service-registry/src/config.ts`](../libs/service-registry/src/config.ts),
   add an entry under `services`:

   ```ts
   <svcCamel>: { name: '<svc>', grpcPort: <port>, httpPort: <port> },
   ```

   `Record<ServiceName, ServiceDescriptor>` will refuse to compile if
   step 1 was skipped or the key here does not match the union.

3. **Scaffold the contracts library** at
   `libs/contracts/<svc>/`. Files:

   - `protos/<svc>.proto` — `syntax = "proto3"; package <svcCamel>;` plus
     a `<Svc>Service` with at least a `Ping` rpc. The `.proto` is the
     single source of truth (CONSTITUTION §2.1) — never hand-write the
     equivalent TS.
   - `src/proto-path.ts` — exports `<SVC>_PROTO_PATH`, `<SVC>_PACKAGE`,
     `<SVC>_SERVICE_NAME`. Copy the resolver pattern from
     [`libs/contracts/iam/src/proto-path.ts`](../libs/contracts/iam/src/proto-path.ts)
     verbatim — the candidate-path list matters for both dev and the
     bundled Dockerfile.
   - `src/types.ts` — stub re-exporting from `./generated/<svc>.ts` (the
     generated file lands after step 8).
   - `src/index.ts` — `export * from './proto-path'; export * from './types';`
   - `src/generated/.gitkeep` — empty file so the directory exists
     before `pnpm proto:gen` runs.
   - `tsconfig.lib.json` — copy from
     [`libs/contracts/iam/tsconfig.lib.json`](../libs/contracts/iam/tsconfig.lib.json)
     unchanged.
   - `package.json` — name `@orbit/contracts-<svc>`, private, depends on
     `@nestjs/microservices` and `rxjs`. Mirror
     [`libs/contracts/iam/package.json`](../libs/contracts/iam/package.json).

4. **Scaffold the app** at `apps/<svc>/`. Files:

   - `src/main.ts` — **`startTracing('<svc>')` must run before any other
     import** (ADR 0006). Resolve ports from `DEFAULT_REGISTRY.services.<svcCamel>`
     with `<SVC>_HTTP_PORT` / `<SVC>_GRPC_PORT` env overrides, then call
     `bootstrapService` with `withGrpc(...)`. Copy
     [`apps/iam/src/main.ts`](../apps/iam/src/main.ts) and substitute.
   - `src/app.module.ts` — imports `ConfigModule.forRoot({ isGlobal: true })`,
     `SharedLoggerModule`, `ServiceRegistryModule.forRoot()`, `HealthModule`.
   - `tsconfig.app.json`, `README.md`, `test/.gitkeep` — copy from `apps/iam/`.
   - `package.json` — name `@orbit/app-<svc>`, with the same dependency
     set as [`apps/iam/package.json`](../apps/iam/package.json) plus
     `@orbit/contracts-<svc>: workspace:*`.

5. **Wire into Nest CLI.** Add a project entry to
   [`nest-cli.json`](../nest-cli.json):

   ```json
   "<svc>": {
     "type": "application",
     "root": "apps/<svc>",
     "entryFile": "main",
     "sourceRoot": "apps/<svc>/src",
     "compilerOptions": { "tsConfigPath": "apps/<svc>/tsconfig.app.json" }
   }
   ```

6. **Add a project reference for tsc.** Append to `references` in
   [`tsconfig.libs.json`](../tsconfig.libs.json):

   ```json
   { "path": "libs/contracts/<svc>/tsconfig.lib.json" }
   ```

7. **Wire into root `package.json`.**
   [`package.json`](../package.json):

   - Add scripts: `start:<svc>`, `start:dev:<svc>`, `build:<svc>`.
   - Extend `scripts.build:apps` with `&& nest build <svc>` so
     `pnpm build` still picks the new app up.
   - Add to `jest.moduleNameMapper`:

     ```json
     "^@orbit/contracts-<svc>(|/.*)$": "<rootDir>/libs/contracts/<svc>/src$1"
     ```

8. **Install + generate + verify.**

   ```bash
   pnpm install              # picks up the new workspace package
   pnpm proto:gen            # generates libs/contracts/<svc>/src/generated/<svc>.ts
   pnpm typecheck            # catches every wire-up missed above
   pnpm check:circular       # catches accidental app→app or cycle through libs
   pnpm test
   ```

9. **Build the Docker image** (Dockerfile is untouched per ADR 0008):

   ```bash
   docker build --build-arg SERVICE_NAME=<svc> -t orbit-<svc> .
   ```

## Why no generator

There used to be a `pnpm new:service <svc>` script that performed steps
1–7 automatically. It was removed: the per-step fail-fast signals
(typecheck on `ServiceName`, `Record<ServiceName, …>`, `check:circular`)
already catch the mistakes the generator was guarding against, and the
generator itself was a regex-based file patcher that drifted whenever
any of the touched files evolved. The runbook above is now the single
source of truth.

If you find yourself doing this more than once a quarter and the steps
have not shifted, reach for a generator again — but write it as a
codemod over the AST, not regex over source.
