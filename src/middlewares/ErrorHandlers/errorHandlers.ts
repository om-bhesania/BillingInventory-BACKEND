import { NextFunction, Request, Response, ErrorRequestHandler } from "express";

const errorHandler: ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);

  if (res.headersSent) {
    next(err);
    return;
  }

  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
};

export { errorHandler };

