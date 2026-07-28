import {
  DEMO_STORE_CODE,
  DEMO_STORE_NAME,
  DEMO_REGION_CODE,
  DEMO_STORE_PASSWORD,
  isPortfolioDemoStore,
} from '../demo-store';

/**
 * Server-only password verification. Import only from Server Actions or Route Handlers.
 */

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function parseStorePasswordsEnv(): Record<string, string> {
  const raw = process.env.STORE_PASSWORDS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed && typeof parsed === 'object') {
        // Always ensure portfolio demo store is present (isolated from real stores)
        return {
          ...parsed,
          [DEMO_STORE_CODE]: parsed[DEMO_STORE_CODE] ?? DEMO_STORE_PASSWORD,
        };
      }
    } catch {
      console.error('[auth] Failed to parse STORE_PASSWORDS JSON');
    }
  }

  if (isProduction()) {
    console.error('[auth] STORE_PASSWORDS is required in production');
    return {
      [DEMO_STORE_CODE]: process.env.DEMO_STORE_PASSWORD ?? DEMO_STORE_PASSWORD,
    };
  }

  // Development fallback only — never used when NODE_ENV=production
  return {
    [DEMO_STORE_CODE]: DEMO_STORE_PASSWORD,
    clermont: 'clermont2026',
    gainesville: 'gainesville2026',
    jacksonville: 'jacksonville2026',
    kissimmee: 'kissimmee2026',
    'orlando-florida-mall': 'teslamall2026',
    'orlando-john-young-pkwy': 'jy2026',
    'orlando-lee-vista-blvd': 'leevista2026',
    pensacola: 'pensacola2026',
    tallahassee: 'tallahassee2026',
    'merritt-island': 'merritt2026',
    'tampa-mall-showroom': 'tampamall2026',
    'fort-lauderdale': 'teslafort2026',
  };
}

let cachedStorePasswords: Record<string, string> | null = null;

function getStorePasswordsMap(): Record<string, string> {
  if (!cachedStorePasswords) {
    cachedStorePasswords = parseStorePasswordsEnv();
  }
  return cachedStorePasswords;
}

export function verifyStorePassword(storeCode: string, password: string): boolean {
  const expected = getStorePasswordsMap()[storeCode];
  if (!expected) return false;
  return password === expected;
}

export function verifyManagerPassword(advisorEmail: string | undefined, password: string): boolean {
  const overrideEmail = process.env.MANAGER_PASSWORD_OVERRIDE_EMAIL ?? 'marco.serrano@demo.local';
  const overridePassword = process.env.MANAGER_PASSWORD_OVERRIDE;
  const defaultPassword = process.env.MANAGER_PASSWORD;

  if (isProduction() && !defaultPassword) {
    console.error('[auth] MANAGER_PASSWORD is required in production');
    return false;
  }

  const resolvedDefault = defaultPassword ?? 'tesla2026';
  // Portfolio demo: same manager PIN as everyone else (tesla2026) unless env override is set
  const resolvedOverride = overridePassword ?? resolvedDefault;

  if (advisorEmail && advisorEmail.toLowerCase() === overrideEmail.toLowerCase()) {
    return password === resolvedOverride;
  }
  return password === resolvedDefault;
}

export function getDemoStoreCredentials(): { storeCode: string; password: string } {
  const storeCode = process.env.DEMO_STORE_CODE ?? DEMO_STORE_CODE;
  const passwords = getStorePasswordsMap();
  const password =
    process.env.DEMO_STORE_PASSWORD ??
    passwords[storeCode] ??
    DEMO_STORE_PASSWORD;
  return { storeCode, password };
}

export { DEMO_STORE_CODE, DEMO_STORE_NAME, isPortfolioDemoStore, DEMO_REGION_CODE };
