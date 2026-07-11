'use server';

import { cookies, headers } from 'next/headers';
import {
  verifyStorePassword,
  verifyManagerPassword,
  getDemoStoreCredentials,
} from '@/lib/auth/store-passwords';
import { canRequestManagerAccess } from '@/lib/demo-users';
import { AUTH_RATE_LIMIT, consumeRateLimit } from '@/lib/auth/rate-limit';

const COOKIE_STORE = 'ddhub-store';
const COOKIE_MANAGER = 'ddhub-manager';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_MAX_AGE,
    path: '/',
  };
}

async function getRateLimitKey(scope: string, storeCode?: string) {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || headerList.get('x-real-ip') || 'unknown';
  return storeCode ? `${scope}:${ip}:${storeCode}` : `${scope}:${ip}`;
}

function rateLimitMessage(retryAfterSec?: number) {
  if (!retryAfterSec) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return `Too many attempts. Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

export async function verifyStoreAccess(
  storeCode: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (!storeCode || !password) {
    return { success: false, error: 'Store and password are required.' };
  }

  const limit = await consumeRateLimit(
    await getRateLimitKey('store-login', storeCode),
    AUTH_RATE_LIMIT.maxAttempts,
    AUTH_RATE_LIMIT.windowMs
  );
  if (!limit.allowed) {
    return { success: false, error: rateLimitMessage(limit.retryAfterSec) };
  }

  if (!verifyStorePassword(storeCode, password)) {
    return { success: false, error: 'Incorrect password for this store.' };
  }

  const jar = await cookies();
  jar.set(COOKIE_STORE, storeCode, cookieOptions());
  jar.delete(COOKIE_MANAGER);
  return { success: true };
}

export async function verifyManagerAccess(
  password: string,
  advisorEmail?: string,
  advisorName?: string
): Promise<{ success: boolean; error?: string }> {
  const jar = await cookies();
  const storeCode = jar.get(COOKIE_STORE)?.value;
  if (!storeCode) {
    return { success: false, error: 'Store session required. Please log in to a store first.' };
  }

  if (
    advisorName &&
    !canRequestManagerAccess({ name: advisorName, email: advisorEmail ?? '' })
  ) {
    return {
      success: false,
      error: 'Manager access is not available for portfolio demo guest accounts.',
    };
  }

  const limit = await consumeRateLimit(
    await getRateLimitKey('manager-login', storeCode),
    AUTH_RATE_LIMIT.maxAttempts,
    AUTH_RATE_LIMIT.windowMs
  );
  if (!limit.allowed) {
    return { success: false, error: rateLimitMessage(limit.retryAfterSec) };
  }

  if (!verifyManagerPassword(advisorEmail, password)) {
    return { success: false, error: 'Incorrect manager password.' };
  }

  jar.set(COOKIE_MANAGER, '1', cookieOptions());
  return { success: true };
}

export async function getSessionAccess(): Promise<{
  storeCode: string | null;
  isManager: boolean;
}> {
  const jar = await cookies();
  return {
    storeCode: jar.get(COOKIE_STORE)?.value ?? null,
    isManager: jar.get(COOKIE_MANAGER)?.value === '1',
  };
}

export async function clearStoreSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_STORE);
  jar.delete(COOKIE_MANAGER);
}

export async function revokeManagerAccess(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_MANAGER);
}

export async function tryDemoStoreAccess(): Promise<{
  success: boolean;
  storeCode?: string;
  error?: string;
}> {
  const { storeCode, password } = getDemoStoreCredentials();
  const result = await verifyStoreAccess(storeCode, password);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, storeCode };
}
