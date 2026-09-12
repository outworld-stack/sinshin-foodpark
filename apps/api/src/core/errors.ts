export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'DEVICE_LIMIT_REACHED'
  | 'BANNED'
  | 'INTERNAL_ERROR'

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const Err = {
  validation: (msg = 'ورودی ارسالی معتبر نیست.', details?: unknown) =>
    new AppError('VALIDATION_ERROR', msg, 422, details),

  unauthorized: (msg = 'ابتدا وارد حساب کاربری خود شوید.') =>
    new AppError('UNAUTHORIZED', msg, 401),

  forbidden: (msg = 'دسترسی لازم برای این عملیات را ندارید.') =>
    new AppError('FORBIDDEN', msg, 403),

  notFound: (msg = 'موردی پیدا نشد.') => new AppError('NOT_FOUND', msg, 404),

  conflict: (msg = 'این مورد از قبل وجود دارد.') =>
    new AppError('CONFLICT', msg, 409),

  rateLimited: (
    msg = 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.',
    retryAfterSeconds?: number,
  ) =>
    new AppError(
      'RATE_LIMITED',
      msg,
      429,
      retryAfterSeconds !== undefined ? { retryAfterSeconds } : undefined,
    ),

  deviceLimit: (max: number) =>
    new AppError(
      'DEVICE_LIMIT_REACHED',
      `حداکثر ${max} دستگاه مجاز است. برای افزودن دستگاه جدید، یکی از دستگاه‌های قبلی را حذف کنید.`,
      409,
      { max },
    ),

  banned: (msg = 'حساب کاربری شما مسدود شده است.') =>
    new AppError('BANNED', msg, 403),
}