import { Request, Response, NextFunction, RequestHandler } from "express";

// Wraps an async route handler so a thrown/rejected error becomes a 500 response
// instead of an unhandled rejection that crashes the whole process.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
