import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { getErrorMessage } from './http-error';

describe('getErrorMessage', () => {
  it('uses the message sent by the server', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { message: 'An account with this email already exists' }
    });

    expect(getErrorMessage(error, 'fallback')).toBe(
      'An account with this email already exists'
    );
  });

  it('explains when the server cannot be reached', () => {
    const error = new HttpErrorResponse({ status: 0 });

    expect(getErrorMessage(error, 'fallback')).toContain('reach the server');
  });

  it('uses the fallback for anything else', () => {
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('fallback');
  });
});