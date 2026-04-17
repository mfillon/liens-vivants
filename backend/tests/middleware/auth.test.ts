import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { basicAuth } from '@/middleware/auth';

function req(authHeader?: string): Request {
  return { headers: authHeader ? { authorization: authHeader } : {} } as unknown as Request;
}

function res(): {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
} {
  const r = { status: vi.fn(), json: vi.fn(), set: vi.fn() };
  r.status.mockReturnValue(r);
  r.json.mockReturnValue(r);
  r.set.mockReturnValue(r);
  return r;
}

const validHeader = `Basic ${Buffer.from('admin:testpass').toString('base64')}`;

describe('basicAuth', () => {
  it('calls next() with valid credentials', () => {
    const next = vi.fn() as NextFunction;
    basicAuth(req(validHeader), res() as unknown as Response, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('returns 401 with no Authorization header', () => {
    const next = vi.fn() as NextFunction;
    const r = res();
    basicAuth(req(), r as unknown as Response, next);
    expect(r.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 with wrong password', () => {
    const next = vi.fn() as NextFunction;
    const r = res();
    const bad = `Basic ${Buffer.from('admin:wrong').toString('base64')}`;
    basicAuth(req(bad), r as unknown as Response, next);
    expect(r.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 with non-Basic scheme', () => {
    const next = vi.fn() as NextFunction;
    const r = res();
    basicAuth(req('Bearer token'), r as unknown as Response, next);
    expect(r.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('handles passwords containing colons', () => {
    const next = vi.fn() as NextFunction;
    const creds = `Basic ${Buffer.from('admin:pass:with:colons').toString('base64')}`;
    // vitest env sets ADMIN_PASS=testpass, so this should fail auth (not crash)
    const r = res();
    basicAuth(req(creds), r as unknown as Response, next);
    expect(r.status).toHaveBeenCalledWith(401);
  });
});
