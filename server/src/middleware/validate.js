/**
 * Validates req[source] (body, query or params) against a zod schema and replaces it with the
 * parsed value, so handlers only ever see cleaned data. Failures go to the central error handler.
 */
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    try {
      req[source] = schema.parse(req[source] ?? {});
      next();
    } catch (err) {
      next(err);
    }
  };
