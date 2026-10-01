import { argon2Verify } from 'hash-wasm';

export type Argon2Variant = 'argon2id' | 'argon2i' | 'argon2d';

export interface Argon2Params {
  variant: Argon2Variant;
  iterations: number;
  memorySizeKB: number;
  parallelism: number;
  hashLength: number;
  saltLength: number;
}

export const ARGON2_PRESETS = {
  // `authelia crypto hash generate argon2` defaults
  authelia: { variant: 'argon2id', iterations: 3, memorySizeKB: 65536, parallelism: 4, hashLength: 32, saltLength: 16 },
  // OWASP Password Storage Cheat Sheet minimum for argon2id
  owasp: { variant: 'argon2id', iterations: 2, memorySizeKB: 19456, parallelism: 1, hashLength: 32, saltLength: 16 },
} as const satisfies Record<string, Argon2Params>;

export type Argon2PresetName = keyof typeof ARGON2_PRESETS;

export const MAX_MEMORY_KIB = 1048576; // 1 GiB
export const WARN_MEMORY_KIB = 262144; // 256 MiB
export const MIN_SALT_BYTES = 8;
export const MAX_SALT_BYTES = 64;

export type Argon2Issue =
  | { kind: 'missing-value' }
  | { kind: 'memory-too-low'; min: number }
  | { kind: 'memory-too-high'; max: number }
  | { kind: 'memory-high'; warnAbove: number }
  | { kind: 'salt-length-out-of-range'; min: number; max: number }
  | { kind: 'invalid-hex-salt'; min: number; max: number };

const PARAM_KEYS: (keyof Argon2Params)[] = [
  'variant',
  'iterations',
  'memorySizeKB',
  'parallelism',
  'hashLength',
  'saltLength',
];

export function matchPreset(params: Argon2Params): Argon2PresetName | 'custom' {
  for (const [name, preset] of Object.entries(ARGON2_PRESETS) as [Argon2PresetName, Argon2Params][]) {
    if (PARAM_KEYS.every((key) => preset[key] === params[key])) {
      return name;
    }
  }
  return 'custom';
}

// Returns undefined when the string is not valid hex or does not fit the argon2 salt size limits.
export function parseHexSalt(hex: string): Uint8Array | undefined {
  const clean = hex.trim().replace(/^0x/i, '');
  if (clean.length === 0 || clean.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(clean)) {
    return undefined;
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  if (bytes.length < MIN_SALT_BYTES || bytes.length > MAX_SALT_BYTES) {
    return undefined;
  }
  return bytes;
}

export function validateParams(
  params: { [K in keyof Argon2Params]: Argon2Params[K] | null | undefined },
  hexSalt = '',
): { errors: Argon2Issue[]; warnings: Argon2Issue[] } {
  const errors: Argon2Issue[] = [];
  const warnings: Argon2Issue[] = [];
  const { iterations, memorySizeKB, parallelism, hashLength, saltLength } = params;

  if ([iterations, memorySizeKB, parallelism, hashLength, saltLength].some((v) => v == null || Number.isNaN(v))) {
    return { errors: [{ kind: 'missing-value' }], warnings };
  }

  const minMemory = 8 * parallelism!;
  if (memorySizeKB! < minMemory) {
    errors.push({ kind: 'memory-too-low', min: minMemory });
  }
  if (memorySizeKB! > MAX_MEMORY_KIB) {
    errors.push({ kind: 'memory-too-high', max: MAX_MEMORY_KIB });
  } else if (memorySizeKB! > WARN_MEMORY_KIB) {
    warnings.push({ kind: 'memory-high', warnAbove: WARN_MEMORY_KIB });
  }

  if (hexSalt.trim() !== '') {
    if (!parseHexSalt(hexSalt)) {
      errors.push({ kind: 'invalid-hex-salt', min: MIN_SALT_BYTES, max: MAX_SALT_BYTES });
    }
  } else if (saltLength! < MIN_SALT_BYTES || saltLength! > MAX_SALT_BYTES) {
    errors.push({ kind: 'salt-length-out-of-range', min: MIN_SALT_BYTES, max: MAX_SALT_BYTES });
  }

  return { errors, warnings };
}

const PHC_ARGON2_REGEX = /^\$argon2(?:id|i|d)\$v=\d+\$m=(\d+),t=\d+,p=\d+\$[A-Za-z0-9+/]+={0,2}\$[A-Za-z0-9+/]+={0,2}$/;

export async function verifyArgon2(password: string, hash: string): Promise<'match' | 'no-match' | 'invalid'> {
  const phc = hash.trim();
  const match = PHC_ARGON2_REGEX.exec(phc);
  // Refuse absurd memory costs: verifying would freeze or crash the tab.
  if (!match || Number(match[1]) > MAX_MEMORY_KIB) {
    return 'invalid';
  }
  try {
    return (await argon2Verify({ password, hash: phc })) ? 'match' : 'no-match';
  } catch {
    return 'invalid';
  }
}
