# @orbit/contracts-iam

Public wire contract for the **iam** service — the only thing other services
are allowed to import in order to talk to iam.

## Responsibility

- Ship `protos/iam.proto`, the source of truth for the `iam.IamService` gRPC
  surface (`GetUser`, `CreateUser`).
- Expose generated TypeScript types from `src/generated/` (regenerated via
  `pnpm proto:gen`).
- Re-export the consumer-facing names the rest of the codebase uses:
  - `IamUser`, `GetUserRequest`, `CreateUserRequest`
  - `IamServiceClient` — Observable-returning client interface with optional
    `Metadata` (so callers can forward correlation IDs); kept hand-written
    because the ts-proto `nestJs=true` emit omits the metadata parameter.
- Export `protoPath` so server (`buildGrpcServerOptions`) and client
  (`buildGrpcClientOptions`) wiring resolves the same `.proto` file.

## Boundary

- The `iam` app implements this contract; every other service that calls iam
  imports from this package.
- This package must not depend on any `apps/*` code, on `@orbit/common`, or on
  any other contracts package — contracts are the most-depended-on layer and
  stay leaf-level.
- Treat the proto as a public API: additive changes are safe; renames,
  removals, or field-number reuse are breaking and require a coordinated
  rollout across producers and consumers.
