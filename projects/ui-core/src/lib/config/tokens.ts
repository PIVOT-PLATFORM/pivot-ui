import { InjectionToken } from '@angular/core';

/** Base URL of the PIVOT backend API. Provide this token in your app's providers. */
export const PIVOT_API_URL = new InjectionToken<string>('PIVOT_API_URL');
