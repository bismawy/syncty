// Theme management helper for Syncty

export interface ThemePreset {
  id: string;
  name: string;
  accentHex: string;
}

export const PRESET_THEMES: ThemePreset[] = [
  { id: 'default', name: 'Default (Zinc)', accentHex: '#ffffff' },
  { id: 'dracula', name: 'Dracula (Violet)', accentHex: '#bd93f9' },
  { id: 'clouds', name: 'Clouds (Sky Blue)', accentHex: '#38bdf8' },
  { id: 'emerald', name: 'Emerald Synth (Green)', accentHex: '#10b981' },
  { id: 'amber', name: 'Cyber Amber (Gold)', accentHex: '#f59e0b' },
  { id: 'sunset', name: 'Sunset Orange (Coral)', accentHex: '#f97316' },
  { id: 'rose-pine', name: 'Rosé Pine (Pink)', accentHex: '#ec4899' },
  { id: 'custom', name: 'Kustom Hex / GitHub', accentHex: '#6366f1' },
];

export interface ThemeConfig {
  mode: 'dark' | 'light' | 'system';
  presetId: string;
  customAccent: string;
  githubUrl?: string;
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  mode: 'system',
  presetId: 'default',
  customAccent: '#6366f1',
  githubUrl: '',
};

/**
 * Standard RGB -> OKLCH converter to extract exact Hue angle H (0-360 deg) and Chroma
 * for 100% precise native OKLCH theme generation without hue distortion.
 */
export function hexToOklch(hex: string): { l: number; c: number; h: number } {
  let cleanHex = hex.trim().replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((ch) => ch + ch).join('');
  }
  if (cleanHex.length !== 6) return { l: 0.75, c: 0.15, h: 250 };

  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  const toLinear = (c: number) => (c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92);
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720403 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757986 * s_;

  const C = Math.sqrt(a * a + b_ * b_);
  let H = (Math.atan2(b_, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return { l: L, c: C, h: H };
}

export async function loadThemeConfig(): Promise<ThemeConfig> {
  try {
    const data = await browser.storage.local.get([
      'syncty.themeMode',
      'syncty.themePreset',
      'syncty.customAccent',
      'syncty.githubAccentUrl',
    ]);
    return {
      mode: (data['syncty.themeMode'] as ThemeConfig['mode']) || 'system',
      presetId: (data['syncty.themePreset'] as string) || 'default',
      customAccent: (data['syncty.customAccent'] as string) || '#6366f1',
      githubUrl: (data['syncty.githubAccentUrl'] as string) || '',
    };
  } catch (err) {
    console.error('Failed to load theme config:', err);
    return DEFAULT_THEME_CONFIG;
  }
}

export async function saveThemeConfig(config: ThemeConfig): Promise<void> {
  try {
    await browser.storage.local.set({
      'syncty.themeMode': config.mode,
      'syncty.themePreset': config.presetId,
      'syncty.customAccent': config.customAccent,
      'syncty.githubAccentUrl': config.githubUrl || '',
    });
    localStorage.setItem('syncty.theme', config.mode);
    applyThemeConfig(config);
  } catch (err) {
    console.error('Failed to save theme config:', err);
  }
}

export function getEffectiveIsDark(mode: 'dark' | 'light' | 'system'): boolean {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return mode === 'dark';
}

export function applyThemeConfig(config?: ThemeConfig | null): void {
  if (!config) return;
  const root = document.documentElement;

  // 1. Mode application
  const isDark = getEffectiveIsDark(config.mode);
  root.classList.toggle('light', !isDark);

  // 2. Preset & Accent application
  const preset = PRESET_THEMES.find((p) => p.id === config.presetId) || PRESET_THEMES[0];
  const accentColor = config.presetId === 'custom' && config.customAccent ? config.customAccent : preset.accentHex;

  if (preset.id === 'default') {
    root.style.removeProperty('--accent');
    root.style.removeProperty('--primary');
    root.style.removeProperty('--ring');
    root.style.removeProperty('--background');
    root.style.removeProperty('--card');
    root.style.removeProperty('--popover');
    root.style.removeProperty('--muted');
    root.style.removeProperty('--border');
  } else {
    root.style.setProperty('--primary', accentColor);
    root.style.setProperty('--ring', accentColor);

    const { h } = hexToOklch(accentColor);
    const roundH = Math.round(h * 10) / 10;

    if (isDark) {
      // Ultra-subtle, sleek OKLCH surface tinting using identical Hue H to eliminate reddish distortion
      root.style.setProperty('--background', `oklch(0.10 0.005 ${roundH})`);
      root.style.setProperty('--card', `oklch(0.14 0.008 ${roundH})`);
      root.style.setProperty('--popover', `oklch(0.14 0.008 ${roundH})`);
      root.style.setProperty('--muted', `oklch(0.17 0.012 ${roundH})`);
      root.style.setProperty('--border', `oklch(0.23 0.015 ${roundH})`);
      root.style.setProperty('--accent', `oklch(0.19 0.020 ${roundH})`);
    } else {
      root.style.setProperty('--background', `oklch(0.99 0.004 ${roundH})`);
      root.style.setProperty('--card', `oklch(0.97 0.007 ${roundH})`);
      root.style.setProperty('--popover', `oklch(0.97 0.007 ${roundH})`);
      root.style.setProperty('--muted', `oklch(0.93 0.010 ${roundH})`);
      root.style.setProperty('--border', `oklch(0.88 0.012 ${roundH})`);
      root.style.setProperty('--accent', `oklch(0.94 0.014 ${roundH})`);
    }
  }
}

export async function fetchGitHubAccentColor(url: string): Promise<string | null> {
  try {
    const rawUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    const res = await fetch(rawUrl);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (data && typeof data.accentHex === 'string') {
      return data.accentHex;
    }
    if (data && typeof data.accent === 'string') {
      return data.accent;
    }
    if (data && typeof data.primary === 'string') {
      return data.primary;
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch accent color from GitHub:', err);
    return null;
  }
}
