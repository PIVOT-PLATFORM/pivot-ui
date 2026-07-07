import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { PIVOT_API_URL } from './tokens';

export interface UiCoreConfig {
  apiUrl: string;
}

/** Configures @pivot-platform/ui-core. Call this in your app's providers array. */
export function provideUiCore(config: UiCoreConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PIVOT_API_URL, useValue: config.apiUrl },
  ]);
}
