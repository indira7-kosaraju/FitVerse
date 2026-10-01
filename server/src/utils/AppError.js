export class AppError extends Error {
  /**
   * @param {number} status HTTP status
   * @param {string} message Shown to the user as a toast/banner
   * @param {Record<string,string>} [errors] Field errors shown inline under form fields
   */
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export const badRequest = (message, errors) => new AppError(400, message, errors);
export const unauthorized = (message = 'Please log in to continue.') => new AppError(401, message);
export const forbidden = (message = "You don't have permission to do that.") => new AppError(403, message);
export const notFound = (what = 'Resource') => new AppError(404, `${what} not found.`);
export const conflict = (message, errors) => new AppError(409, message, errors);
