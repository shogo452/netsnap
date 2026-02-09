import { describe, it, expect } from 'vitest';
import { formatSize, formatTime, statusClass, extractPath } from '../utils.js';

describe('formatSize', () => {
  it('returns "-" for null', () => {
    expect(formatSize(null)).toBe('-');
  });

  it('returns "-" for undefined', () => {
    expect(formatSize(undefined)).toBe('-');
  });

  it('returns "-" for negative values', () => {
    expect(formatSize(-1)).toBe('-');
  });

  it('returns "0 B" for 0', () => {
    expect(formatSize(0)).toBe('0 B');
  });

  it('returns bytes for values under 1024', () => {
    expect(formatSize(512)).toBe('512 B');
  });

  it('returns KB for 1024', () => {
    expect(formatSize(1024)).toBe('1.0 KB');
  });

  it('returns KB with decimal for 2560', () => {
    expect(formatSize(2560)).toBe('2.5 KB');
  });
});

describe('formatTime', () => {
  it('returns "-" for null', () => {
    expect(formatTime(null)).toBe('-');
  });

  it('returns "-" for undefined', () => {
    expect(formatTime(undefined)).toBe('-');
  });

  it('returns "-" for negative values', () => {
    expect(formatTime(-1)).toBe('-');
  });

  it('returns "0 ms" for 0', () => {
    expect(formatTime(0)).toBe('0 ms');
  });

  it('returns ms for values under 1000', () => {
    expect(formatTime(500)).toBe('500 ms');
  });

  it('returns seconds for 1000', () => {
    expect(formatTime(1000)).toBe('1.00 s');
  });

  it('returns seconds with decimal for 1500', () => {
    expect(formatTime(1500)).toBe('1.50 s');
  });
});

describe('statusClass', () => {
  it('returns "ok" for 200', () => {
    expect(statusClass(200)).toBe('ok');
  });

  it('returns "ok" for 299', () => {
    expect(statusClass(299)).toBe('ok');
  });

  it('returns "redirect" for 301', () => {
    expect(statusClass(301)).toBe('redirect');
  });

  it('returns "redirect" for 399', () => {
    expect(statusClass(399)).toBe('redirect');
  });

  it('returns "error" for 404', () => {
    expect(statusClass(404)).toBe('error');
  });

  it('returns "error" for 500', () => {
    expect(statusClass(500)).toBe('error');
  });

  it('returns "error" for 0', () => {
    expect(statusClass(0)).toBe('error');
  });
});

describe('extractPath', () => {
  it('extracts path from URL', () => {
    expect(extractPath('https://example.com/api/users')).toBe('/api/users');
  });

  it('extracts path with query string', () => {
    expect(extractPath('https://example.com/api?page=1')).toBe('/api?page=1');
  });

  it('returns original string for invalid URL', () => {
    expect(extractPath('invalid')).toBe('invalid');
  });
});
