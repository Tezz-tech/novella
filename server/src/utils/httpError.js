/** Operational error with an HTTP status. Thrown in services/controllers, rendered by error.js. */
export class HttpError extends Error {
  constructor(statusCode, message, errors) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}
