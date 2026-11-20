import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, detail: string, code = 'HTTP_ERROR', details?: unknown) {
    super(detail);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      detail: err.message,
      code: err.code,
      status: err.status,
      ...(err.details !== undefined ? { errors: err.details } : {}),
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('[API Error]', err);
  res.status(500).json({
    detail: message,
    code: 'INTERNAL_SERVER_ERROR',
    status: 500,
  });
}

// FastAPI / Pydantic-style request payload validators
export function asRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(422, 'Request body must be a JSON object.', 'VALIDATION_ERROR');
  }
  return body as Record<string, unknown>;
}

export function requireString(obj: Record<string, unknown>, field: string, minLength = 1): string {
  const val = obj[field];
  if (typeof val !== 'string' || val.trim().length < minLength) {
    throw new HttpError(
      422,
      `Field "${field}" must be a string with at least ${minLength} character(s).`,
      'VALIDATION_ERROR',
      { field }
    );
  }
  return val.trim();
}

export function optionalString(obj: Record<string, unknown>, field: string): string | undefined {
  const val = obj[field];
  if (val === undefined || val === null) return undefined;
  if (typeof val !== 'string') {
    throw new HttpError(422, `Field "${field}" must be a string.`, 'VALIDATION_ERROR', { field });
  }
  return val;
}

export function requireNumber(
  obj: Record<string, unknown>,
  field: string,
  opts?: { min?: number; max?: number }
): number {
  const raw = obj[field];
  const val = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!Number.isFinite(val)) {
    throw new HttpError(422, `Field "${field}" must be a valid number.`, 'VALIDATION_ERROR', { field });
  }
  if (opts?.min !== undefined && val < opts.min) {
    throw new HttpError(422, `Field "${field}" must be >= ${opts.min}.`, 'VALIDATION_ERROR', { field });
  }
  if (opts?.max !== undefined && val > opts.max) {
    throw new HttpError(422, `Field "${field}" must be <= ${opts.max}.`, 'VALIDATION_ERROR', { field });
  }
  return val;
}

export function optionalNumber(
  obj: Record<string, unknown>,
  field: string,
  opts?: { min?: number; max?: number }
): number | undefined {
  const raw = obj[field];
  if (raw === undefined || raw === null) return undefined;
  return requireNumber(obj, field, opts);
}

export function optionalBoolean(obj: Record<string, unknown>, field: string): boolean | undefined {
  const val = obj[field];
  if (val === undefined || val === null) return undefined;
  if (typeof val !== 'boolean') {
    throw new HttpError(422, `Field "${field}" must be a boolean.`, 'VALIDATION_ERROR', { field });
  }
  return val;
}

export function requireArray<T = unknown>(obj: Record<string, unknown>, field: string): T[] {
  const val = obj[field];
  if (!Array.isArray(val)) {
    throw new HttpError(422, `Field "${field}" must be an array.`, 'VALIDATION_ERROR', { field });
  }
  return val as T[];
}

export function requireEnum<T extends string>(
  obj: Record<string, unknown>,
  field: string,
  allowed: readonly T[]
): T {
  const val = obj[field];
  if (typeof val !== 'string' || !allowed.includes(val as T)) {
    throw new HttpError(
      422,
      `Field "${field}" must be one of: ${allowed.join(', ')}.`,
      'VALIDATION_ERROR',
      { field, allowed }
    );
  }
  return val as T;
}

export function optionalEnum<T extends string>(
  obj: Record<string, unknown>,
  field: string,
  allowed: readonly T[]
): T | undefined {
  const val = obj[field];
  if (val === undefined || val === null) return undefined;
  return requireEnum(obj, field, allowed);
}
