import {
  ɵresolveComponentResources as resolveComponentResources,
  provideZonelessChangeDetection,
} from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

function findFile(filename: string, dir: string): string | null {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    try {
      if (statSync(fullPath).isDirectory()) {
        const found = findFile(filename, fullPath);
        if (found) return found;
      } else if (entry === filename) {
        return fullPath;
      }
    } catch {
      // ignore unreadable entries
    }
  }
  return null;
}

function templateResolver(url: string): Promise<string> {
  const filename = url.split('/').pop() ?? '';
  if (filename.endsWith('.scss') || filename.endsWith('.css')) {
    return Promise.resolve('');
  }
  if (filename.endsWith('.html')) {
    const found = findFile(filename, 'src');
    if (found) {
      return Promise.resolve(readFileSync(found, 'utf-8'));
    }
  }
  return Promise.resolve('');
}

beforeEach(() => resolveComponentResources(templateResolver));

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting([provideZonelessChangeDetection()]),
);
