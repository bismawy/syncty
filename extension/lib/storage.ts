import { deriveKeys, type DerivedKeys } from './crypto';

// Local persisted state keys.
export const KEYS = {
  mnemonic: 'syncty.mnemonic', // the 12-word Secret Key (kept locally only)
  authId: 'syncty.authId',
  version: 'syncty.version', // last-known server vault version
  lastSync: 'syncty.lastSync',
} as const;

export interface StoredSession {
  mnemonic: string;
  authId: string;
  encKey: CryptoKey;
}

// Cache the derived keys in-memory so the background and pages share one derivation.
let sessionCache: (StoredSession & { keys: DerivedKeys }) | null = null;

export async function loadSession(): Promise<StoredSession | null> {
  if (sessionCache) return sessionCache;
  const data = await browser.storage.local.get([KEYS.mnemonic, KEYS.authId]);
  const mnemonic = data[KEYS.mnemonic] as string | undefined;
  const authId = data[KEYS.authId] as string | undefined;
  if (!mnemonic || !authId) return null;
  const keys = await deriveKeys(mnemonic);
  sessionCache = { mnemonic, authId, encKey: keys.encKey, keys };
  return sessionCache;
}

export async function saveSession(mnemonic: string, keys: DerivedKeys): Promise<void> {
  await browser.storage.local.set({
    [KEYS.mnemonic]: mnemonic,
    [KEYS.authId]: keys.authId,
  });
  sessionCache = { mnemonic, authId: keys.authId, encKey: keys.encKey, keys };
}

export async function clearSession(): Promise<void> {
  sessionCache = null;
  await browser.storage.local.remove([KEYS.mnemonic, KEYS.authId, KEYS.version, KEYS.lastSync]);
}

export async function getVersion(): Promise<number> {
  const data = await browser.storage.local.get(KEYS.version);
  return (data[KEYS.version] as number) ?? 0;
}

export async function setVersion(version: number): Promise<void> {
  await browser.storage.local.set({ [KEYS.version]: version });
}

export async function getLastSync(): Promise<number | null> {
  const data = await browser.storage.local.get(KEYS.lastSync);
  return (data[KEYS.lastSync] as number) ?? null;
}

export async function setLastSync(ts: number): Promise<void> {
  await browser.storage.local.set({ [KEYS.lastSync]: ts });
}
