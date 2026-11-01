import { HttpErrorResponse } from '@angular/common/http';

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Unable to reach the server. Please check your connection and try again.';
    }

    const message = error.error?.message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }

  return fallback;
}