# @orbit/contracts-notify

Public wire contract for the **notify** service — the only thing other services
are allowed to import in order to talk to notify.

## Responsibility

- Ship `protos/notify.proto`, the source of truth for the `notify.NotifyService`
  gRPC surface (`SendNotification`) and the `NotificationChannel` /
  `NotificationStatus` enums.
- Expose generated TypeScript types from `src/generated/` (regenerated via
  `pnpm proto:gen`).
- Re-export the consumer-facing names the rest of the codebase uses:
  - `NotifyNotification`, `NotifyRecipient`, `SendNotificationRequest`
  - PascalCase enum aliases `NotifyNotificationChannel.{Email,Sms,...}` and
    `NotifyNotificationStatus.{Pending,Sent,...}` layered over the generated
    `SCREAMING_SNAKE` enum members so callers get an ergonomic API.
  - `NotifyServiceClient` — Observable-returning client interface.
- Export `protoPath` so server (`buildGrpcServerOptions`) and client
  (`buildGrpcClientOptions`) wiring resolves the same `.proto` file.

## Boundary

- The `notify` app implements this contract; every other service that calls
  notify imports from this package.
- This package must not depend on any `apps/*` code, on `@orbit/common`, or on
  any other contracts package — contracts are leaf-level.
- Treat the proto as a public API: additive changes are safe; renames,
  removals, or field-number reuse are breaking and require a coordinated
  rollout across producers and consumers.
