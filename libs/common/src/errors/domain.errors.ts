/**
 * Transport-agnostic domain errors. Thrown by service layers; the shared
 * exception filter maps them to HTTP status codes and gRPC status codes
 * so transport controllers stay free of error-translation logic.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {}
export class ValidationError extends DomainError {}
export class ConflictError extends DomainError {}

/**
 * Raised when a downstream service (typically reached over gRPC) is slow,
 * unreachable, or rejects the call with an UNAVAILABLE-class status. Maps
 * to HTTP 504 / gRPC 14 (UNAVAILABLE) via the shared filter.
 */
export class UpstreamUnavailableError extends DomainError {}
