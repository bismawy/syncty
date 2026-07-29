import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Panel } from '@/components/ui/panel';
import { NavItem } from '@/components/ui/nav-item';
import { ToggleChip } from '@/components/ui/toggle-chip';
import { ListItemCard } from '@/components/ui/list-item-card';
import { AlertBox } from '@/components/ui/alert-box';
import { MutedText } from '@/components/ui/muted-text';
import { SettingField, SettingSectionTitle } from './SettingField';
import { loadSession, KEYS } from '@/lib/storage';
import { mnemonicToTextFile } from '@/lib/mnemonic';
import { getDeviceLabel, getDeviceId } from '@/lib/device';
import { listDevices, removeDevice, upsertDevice } from '@/lib/api';
import type { DeviceInfo } from '@/lib/types';
import {
  loadThemeConfig,
  saveThemeConfig,
  applyThemeConfig,
  fetchGitHubAccentColor,
  getEffectiveIsDark,
  PRESET_THEMES,
  type ThemeConfig,
} from '@/lib/theme';
import { toolbarId } from '@/components/bookmark/useBookmarks';
import { cn, formatSyncAgo } from '@/lib/utils';
import { useTranslation, type TranslationKey } from '@/lib/i18n';
import {
  Sliders,
  ShieldCheck,
  Monitor,
  HardDrive,
  Info,
  Sun,
  Moon,
  Laptop,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldAlert,
  Trash2,
  LogOut,
  Download,
  Upload,
  Palette,
  Github,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Cloud,
  Lock,
  Heart,
  Radio,
  BookOpen,
  CloudRain,
  Quote,
} from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLabelChange: (newLabel: string) => void;
  onLogout?: () => void;
}

type TabType = 'general' | 'security' | 'sessions' | 'storage' | 'credits' | 'about';

const CREDITS: { icon: React.ComponentType<{ className?: string }>; titleKey: TranslationKey; sourceKey: TranslationKey; descKey: TranslationKey; href: string }[] = [
  { icon: CloudRain, titleKey: 'creditsNatureRadioTitle', sourceKey: 'creditsNatureRadioSource', descKey: 'creditsNatureRadioDesc', href: 'https://noisekun.com' },
  { icon: Radio, titleKey: 'creditsQuranRadioTitle', sourceKey: 'creditsQuranRadioSource', descKey: 'creditsQuranRadioDesc', href: 'https://qurango.net' },
  { icon: Quote, titleKey: 'creditsMotivationalQuotesTitle', sourceKey: 'creditsMotivationalQuotesSource', descKey: 'creditsMotivationalQuotesDesc', href: 'https://quotes.liupurnomo.com' },
  { icon: BookOpen, titleKey: 'creditsIslamicQuotesTitle', sourceKey: 'creditsIslamicQuotesSource', descKey: 'creditsIslamicQuotesDesc', href: 'https://myquran.com' },
  { icon: Heart, titleKey: 'creditsIconsTitle', sourceKey: 'creditsIconsSource', descKey: 'creditsIconsDesc', href: 'https://lucide.dev' },
];

export function SettingsModal({ open, onOpenChange, onLabelChange, onLogout }: SettingsModalProps) {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<TabType>('general');

  // App Version (dynamically synced from extension manifest/package.json)
  const appVersion = React.useMemo(() => {
    try {
      return browser.runtime.getManifest()?.version ?? '1.0.0';
    } catch {
      return '1.0.0';
    }
  }, []);

  // General tab state
  const [deviceName, setDeviceName] = React.useState('');
  const [syncInterval, setSyncInterval] = React.useState<number>(15);

  // Theme state
  const [themeConfig, setThemeConfig] = React.useState<ThemeConfig>({
    mode: 'system',
    presetId: 'default',
    customAccent: '#6366f1',
    githubUrl: '',
  });
  const [githubLoading, setGithubLoading] = React.useState(false);
  const [githubError, setGithubError] = React.useState<string | null>(null);

  // Security tab state
  const [mnemonic, setMnemonic] = React.useState('');
  const [mnemonicCreatedAt, setMnemonicCreatedAt] = React.useState<number | undefined>(undefined);
  const [showMnemonic, setShowMnemonic] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [downloaded, setDownloaded] = React.useState(false);

  // Sessions tab state
  const [devices, setDevices] = React.useState<DeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = React.useState<string>('');
  const [loadingDevices, setLoadingDevices] = React.useState(false);

  // Storage tab state
  const [importing, setImporting] = React.useState(false);
  const [importSuccess, setImportSuccess] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Saving state
  const [saving, setSaving] = React.useState(false);

  const fetchDevices = React.useCallback(async () => {
    setLoadingDevices(true);
    try {
      const curId = await getDeviceId();
      setCurrentDeviceId(curId);
      const session = await loadSession();
      if (session) {
        const list = await listDevices(session.authId);
        setDevices(list);
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  const handleTerminateDevice = async (targetDeviceId: string) => {
    const session = await loadSession();
    if (!session) return;
    try {
      await removeDevice(session.authId, targetDeviceId);
      await fetchDevices();
    } catch (err) {
      console.error('Failed to remove device:', err);
    }
  };

  const initialThemeRef = React.useRef<ThemeConfig | null>(null);

  // Load existing configurations from storage
  React.useEffect(() => {
    if (!open) {
      if (initialThemeRef.current) {
        applyThemeConfig(initialThemeRef.current);
      }
      return;
    }

    loadSession().then((session) => {
      if (session) {
        setMnemonic(session.mnemonic);
        setMnemonicCreatedAt(session.createdAt);
      }
    });

    browser.storage.local.get(['syncty.customDeviceLabel', 'syncty.syncInterval']).then((data) => {
      const customLabel = data['syncty.customDeviceLabel'] as string | undefined;
      setDeviceName(customLabel || getDeviceLabel());

      const interval = data['syncty.syncInterval'] as number | undefined;
      setSyncInterval(interval !== undefined ? interval : 15);
    });

    loadThemeConfig().then((cfg) => {
      initialThemeRef.current = cfg;
      setThemeConfig(cfg);
      applyThemeConfig(cfg);
    });
    fetchDevices();
  }, [open, fetchDevices]);

  // Real-time live theme preview as user changes preset or accent
  React.useEffect(() => {
    if (open && themeConfig) {
      applyThemeConfig(themeConfig);
    }
  }, [open, themeConfig]);

  const handleCopyMnemonic = async () => {
    if (!mnemonic) return;
    await navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMnemonic = () => {
    if (!mnemonic) return;
    const content = mnemonicToTextFile(mnemonic, {
      createdAt: mnemonicCreatedAt,
      deviceName: deviceName || getDeviceLabel(),
      lang: language as 'id' | 'en',
    });
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `syncty-secret-key-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  const handleImportGitHubAccent = async () => {
    if (!themeConfig.githubUrl?.trim()) return;
    setGithubLoading(true);
    setGithubError(null);
    try {
      const hex = await fetchGitHubAccentColor(themeConfig.githubUrl);
      if (hex) {
        setThemeConfig((prev) => ({
          ...prev,
          presetId: 'custom',
          customAccent: hex,
        }));
      } else {
        setGithubError(t('githubImportError'));
      }
    } catch (err) {
      setGithubError(t('githubFetchError'));
    } finally {
      setGithubLoading(false);
    }
  };

  const handleExportBookmarks = async () => {
    try {
      const id = toolbarId();
      const nodes = await browser.bookmarks.getSubTree(id);
      const blob = new Blob([JSON.stringify(nodes, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `syncty-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export bookmarks:', err);
    }
  };

  const handleImportBookmarks = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const targetFolderId = toolbarId();

      const importRecursive = async (node: any, parentId: string) => {
        if (node.children) {
          let currentParent = parentId;
          if (node.id !== targetFolderId && node.title) {
            const created = await browser.bookmarks.create({ parentId, title: node.title });
            currentParent = created.id;
          }
          for (const child of node.children) {
            await importRecursive(child, currentParent);
          }
        } else if (node.url && node.title) {
          await browser.bookmarks.create({ parentId, title: node.title, url: node.url });
        }
      };

      if (Array.isArray(data)) {
        for (const item of data) await importRecursive(item, targetFolderId);
      } else {
        await importRecursive(data, targetFolderId);
      }

      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to import bookmarks:', err);
      alert(t('importError'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearCache = async () => {
    if (confirm(t('clearCacheConfirm'))) {
      await browser.storage.local.remove([KEYS.version, KEYS.lastSync, 'syncty.dirty']);
      alert(t('clearCacheSuccess'));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanName = deviceName.trim();

      await browser.storage.local.set({
        'syncty.customDeviceLabel': cleanName,
        'syncty.syncInterval': syncInterval,
      });

      initialThemeRef.current = themeConfig;
      await saveThemeConfig(themeConfig);

      const session = await loadSession();
      if (session) {
        const devId = await getDeviceId();
        const finalLabel = cleanName || getDeviceLabel();
        await upsertDevice(session.authId, devId, finalLabel);
        await browser.storage.local.set({ ['syncty.lastDeviceLabel']: finalLabel });
      }

      onLabelChange(cleanName || getDeviceLabel());
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const intervals = [
    { label: t('interval5m'), value: 5 },
    { label: t('interval15m'), value: 15 },
    { label: t('interval30m'), value: 30 },
    { label: t('interval60m'), value: 60 },
    { label: t('intervalManual'), value: 0 },
  ];

  const sidebarNavItems = [
    { id: 'general' as TabType, label: t('tabGeneral'), icon: Sliders },
    { id: 'security' as TabType, label: t('tabSecurity'), icon: ShieldCheck },
    { id: 'sessions' as TabType, label: t('tabSessions'), icon: Monitor },
    { id: 'storage' as TabType, label: t('tabStorage'), icon: HardDrive },
    { id: 'credits' as TabType, label: t('tabCredits'), icon: Heart },
    { id: 'about' as TabType, label: t('tabAbout'), icon: Info },
  ];

  const presetSelectOptions = PRESET_THEMES.map((preset) => ({
    value: preset.id,
    label: preset.name,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] w-[95vw] h-[620px] max-h-[92vh] bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-foreground)] rounded-2xl p-0 flex flex-col overflow-hidden shadow-2xl gap-0">
        {/* Header Bar */}
        <DialogHeader className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between shrink-0 bg-[var(--color-background)]/40">
          <DialogTitle className="text-sm font-bold tracking-wider text-[var(--color-foreground)] uppercase flex items-center gap-2">
            <span>{t('settingsModalTitle')}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Main Body: Sidebar + Active Tab Content Area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Sidebar Navigation */}
          <aside className="w-48 sm:w-52 border-r border-[var(--color-border)] bg-[var(--color-background)]/30 p-3 space-y-1 shrink-0 flex flex-col">
            {sidebarNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavItem
                  key={item.id}
                  active={activeTab === item.id}
                  icon={<Icon className="h-4 w-4" />}
                  onClick={() => setActiveTab(item.id)}
                >
                  {item.label}
                </NavItem>
              );
            })}
          </aside>

          {/* Right Tab Content View */}
          <main className="flex-1 p-5 overflow-y-auto text-xs space-y-5">
            {/* TAB 1: UMUM */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Device Name Section */}
                <SettingField
                  label={t('deviceNameLabel')}
                  description={t('deviceNameDesc')}
                >
                  <Input
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder={t('deviceNamePlaceholder')}
                    className="h-9 text-xs bg-[var(--color-background)] border-[var(--color-border)] focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]/60 rounded-xl"
                  />
                </SettingField>

                {/* Sync Interval Section */}
                <SettingField
                  label={t('syncIntervalLabel')}
                  description={t('syncIntervalDesc')}
                >
                  <div className="grid grid-cols-5 gap-1.5 bg-[var(--color-background)] border border-[var(--color-border)] p-1 rounded-xl">
                    {intervals.map((item) => (
                      <ToggleChip
                        key={item.value}
                        selected={syncInterval === item.value}
                        onClick={() => setSyncInterval(item.value)}
                        className="py-1.5 text-[10px] rounded-lg border-transparent px-1"
                      >
                        {item.label}
                      </ToggleChip>
                    ))}
                  </div>
                </SettingField>

                {/* Theme Customization Section */}
                <div className="border-t border-[var(--color-border)] pt-5 space-y-5">
                  <SettingSectionTitle>{t('themeSectionTitle')}</SettingSectionTitle>

                  {/* Mode Selection */}
                  <SettingField label={t('themeModeLabel')}>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'dark', label: t('themeDark'), icon: Moon },
                        { id: 'light', label: t('themeLight'), icon: Sun },
                        { id: 'system', label: t('themeSystem'), icon: Laptop },
                      ].map((m) => {
                        const Icon = m.icon;
                        return (
                          <ToggleChip
                            key={m.id}
                            selected={themeConfig.mode === m.id}
                            icon={<Icon className="h-3.5 w-3.5" />}
                            onClick={() => setThemeConfig({ ...themeConfig, mode: m.id as ThemeConfig['mode'] })}
                          >
                            {m.label}
                          </ToggleChip>
                        );
                      })}
                    </div>
                  </SettingField>

                  {/* Preset Dropdown */}
                  <SettingField label={t('themePresetLabel')}>
                    <Select
                      value={themeConfig.presetId}
                      onValueChange={(val) => setThemeConfig({ ...themeConfig, presetId: val })}
                      options={presetSelectOptions}
                      placeholder="Pilih Preset Warna"
                    />
                  </SettingField>

                  {/* Custom Hex / GitHub Accent Import */}
                  {themeConfig.presetId === 'custom' && (
                    <Panel className="p-3.5">
                      <div className="flex items-center gap-3">
                        <Palette className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                        <span className="text-xs font-semibold">{t('customAccentTitle')}</span>
                        <div className="ml-auto flex items-center gap-2">
                          <div
                            className="relative h-7 w-7 rounded-full overflow-hidden border border-[var(--color-border)] shrink-0 shadow-xs cursor-pointer"
                            style={{ backgroundColor: themeConfig.customAccent }}
                            title="Pilih Warna HEX"
                          >
                            <input
                              type="color"
                              value={themeConfig.customAccent}
                              onChange={(e) => setThemeConfig({ ...themeConfig, customAccent: e.target.value })}
                              className="absolute inset-0 opacity-0 h-full w-full cursor-pointer"
                            />
                          </div>
                          <Input
                            value={themeConfig.customAccent}
                            onChange={(e) => setThemeConfig({ ...themeConfig, customAccent: e.target.value })}
                            placeholder="#6366f1"
                            className="h-7 w-24 text-xs font-mono bg-[var(--color-background)] border-[var(--color-border)] rounded-md"
                          />
                        </div>
                      </div>

                      {/* GitHub Import */}
                      <div className="space-y-1.5 border-t border-[var(--color-border)]/60 pt-3">
                        <span className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase flex items-center gap-1.5">
                          <Github className="h-3 w-3" />
                          {t('githubImportTitle')}
                        </span>
                        <div className="flex items-center gap-2">
                          <Input
                            value={themeConfig.githubUrl || ''}
                            onChange={(e) => setThemeConfig({ ...themeConfig, githubUrl: e.target.value })}
                            placeholder="https://raw.githubusercontent.com/.../theme.json"
                            className="h-8 text-[11px] bg-[var(--color-background)] border-[var(--color-border)] rounded-lg flex-1"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleImportGitHubAccent}
                            disabled={githubLoading || !themeConfig.githubUrl?.trim()}
                            className="h-8 px-3 text-xs bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/80 text-[var(--color-foreground)] border border-[var(--color-border)] rounded-lg cursor-pointer"
                          >
                            {githubLoading ? t('githubLoading') : t('githubImportBtn')}
                          </Button>
                        </div>
                        {githubError && <p className="text-[10px] text-rose-500">{githubError}</p>}
                      </div>
                    </Panel>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: KEAMANAN */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <SettingField label={t('secretKeyLabel')}>
                  <div className="relative flex items-center bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-xs font-mono select-none break-all pr-24 min-h-10">
                    <span className={showMnemonic ? 'text-[var(--color-foreground)] font-medium select-text' : 'text-[var(--color-muted-foreground)]/40 tracking-wider font-sans select-none'}>
                      {showMnemonic ? mnemonic : '•••• •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• ••••'}
                    </span>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/30 rounded-lg cursor-pointer"
                        onClick={() => setShowMnemonic(!showMnemonic)}
                        title={showMnemonic ? t('hide') : t('show')}
                      >
                        {showMnemonic ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-7 w-7 rounded-lg transition-colors cursor-pointer',
                          copied
                            ? 'text-emerald-500 hover:text-emerald-600 bg-emerald-500/10'
                            : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/30'
                        )}
                        onClick={handleCopyMnemonic}
                        title={t('copyKey')}
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </SettingField>

                {/* Warning Alert Box */}
                <AlertBox icon={<ShieldAlert className="h-5 w-5 text-rose-500" />}>
                  <strong className="text-rose-500 block mb-0.5 font-bold uppercase tracking-wider text-[9px]">{t('importantAlertTitle')}</strong>
                  {t('importantAlertDesc')}
                </AlertBox>

                {/* Download Secret Key Button */}
                <div className="pt-1">
                  <Button
                    type="button"
                    onClick={handleDownloadMnemonic}
                    className={cn(
                      'w-full h-9 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2',
                      downloaded
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        : 'bg-[var(--color-background)] hover:bg-[var(--color-accent)] text-[var(--color-foreground)] border-[var(--color-border)]'
                    )}
                  >
                    {downloaded ? <CheckCircle2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                    <span>{downloaded ? t('downloadedKeyBtn') : t('downloadKeyBtn')}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 3: SESI */}
            {activeTab === 'sessions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <SettingSectionTitle>{t('deviceSessionsTitle')}</SettingSectionTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchDevices}
                    disabled={loadingDevices}
                    className="h-6 text-[10px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] gap-1 px-2"
                  >
                    <RefreshCw className={cn('h-3 w-3', loadingDevices && 'animate-spin')} />
                    <span>{t('reload')}</span>
                  </Button>
                </div>

                {loadingDevices ? (
                  <div className="text-[11px] text-[var(--color-muted-foreground)] py-6 text-center">{t('loadingDevices')}</div>
                ) : devices.length === 0 ? (
                  <div className="text-[11px] text-[var(--color-muted-foreground)] py-6 text-center">{t('noDevices')}</div>
                ) : (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {devices.map((dev) => {
                      const isCurrent = dev.device_id === currentDeviceId;
                      return (
                        <ListItemCard key={dev.device_id}>
                          <div className="flex flex-col min-w-0 pr-3">
                            <span className="font-semibold text-[var(--color-foreground)] truncate">{dev.label}</span>
                            <MutedText size="2xs" as="span" className="leading-none mt-1.5 font-mono">
                              {t('activeAgo', { time: formatSyncAgo(t, dev.last_sync) })}
                            </MutedText>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isCurrent ? (
                              <Badge color="emerald" compact className="uppercase tracking-wider font-bold">
                                {t('thisDeviceBadge')}
                              </Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleTerminateDevice(dev.device_id)}
                                className="h-8 w-8 text-[var(--color-muted-foreground)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                                title={t('terminateSessionTooltip')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </ListItemCard>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PENYIMPANAN & BACKUP */}
            {activeTab === 'storage' && (
              <div className="space-y-6">
                <SettingField
                  label={t('backupRecoveryLabel')}
                  description={t('backupRecoveryDesc')}
                >
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {/* Export Box */}
                    <Panel className="flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="font-semibold text-xs text-[var(--color-foreground)] block">{t('exportBookmarksTitle')}</span>
                        <MutedText size="2xs">{t('exportBookmarksDesc')}</MutedText>
                      </div>
                      <Button
                        type="button"
                        onClick={handleExportBookmarks}
                        className="w-full h-8 text-xs font-semibold bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/80 border border-[var(--color-border)] text-[var(--color-foreground)] rounded-lg cursor-pointer gap-2"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>{t('exportJsonBtn')}</span>
                      </Button>
                    </Panel>

                    {/* Import Box */}
                    <Panel className="flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="font-semibold text-xs text-[var(--color-foreground)] block">{t('importBookmarksTitle')}</span>
                        <MutedText size="2xs">{t('importBookmarksDesc')}</MutedText>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImportBookmarks}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        className={cn(
                          'w-full h-8 text-xs font-semibold border rounded-lg cursor-pointer gap-2 transition-all',
                          importSuccess
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                            : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/80 border-[var(--color-border)] text-[var(--color-foreground)]'
                        )}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>{importing ? t('importingBtn') : importSuccess ? t('importedSuccessBtn') : t('importJsonBtn')}</span>
                      </Button>
                    </Panel>
                  </div>
                </SettingField>

                {/* Reset Cache */}
                <SettingField
                  label={t('cacheCleanupLabel')}
                  description={t('cacheCleanupDesc')}
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearCache}
                    className="h-8 px-3 text-xs text-rose-500 hover:text-rose-600 border-rose-500/30 hover:bg-rose-500/10 rounded-lg cursor-pointer mt-1"
                  >
                    {t('clearLocalCacheBtn')}
                  </Button>
                </SettingField>
              </div>
            )}

            {/* TAB 5: KREDIT */}
            {activeTab === 'credits' && (
              <div className="space-y-3.5">
                {/* Header Title */}
                <div className="border-b border-[var(--color-border)] pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-foreground)]">
                    {t('creditsTitle')}
                  </h3>
                  <p className="text-[10px] text-[var(--color-muted-foreground)] mt-1 leading-relaxed">
                    {t('creditsSubtitle')}
                  </p>
                </div>

                {/* Credits Cards List */}
                <div className="space-y-2 max-h-[490px] overflow-y-auto pr-1">
                  {CREDITS.map((credit) => {
                    const Icon = credit.icon;
                    return (
                      <Panel key={credit.href} className="p-2.5 space-y-1 flex items-start gap-3 transition-colors hover:border-[var(--color-primary)]/40">
                        <div className="h-8 w-8 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center shrink-0 mt-0.5 text-[var(--color-primary)]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-xs text-[var(--color-foreground)]">{t(credit.titleKey)}</span>
                            <a
                              href={credit.href}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-mono text-[var(--color-primary)] hover:underline flex items-center gap-1 shrink-0"
                            >
                              <span>{t(credit.sourceKey)}</span>
                              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                            </a>
                          </div>
                          <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5 leading-relaxed">
                            {t(credit.descKey)}
                          </p>
                        </div>
                      </Panel>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 6: TENTANG */}
            {activeTab === 'about' && (
              <div className="space-y-4">
                {/* Header Branding with Logo */}
                <div className="flex items-center gap-3.5 border-b border-[var(--color-border)] pb-4">
                  <div className="h-11 w-11 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-center shrink-0 p-2 shadow-xs">
                    <img
                      src={getEffectiveIsDark(themeConfig.mode) ? '/icons/Syncty_Logo_Mark_Light.svg' : '/icons/Syncty_Logo_Mark_Dark.svg'}
                      alt="Syncty Logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold tracking-tight text-[var(--color-foreground)]">SYNCTY</h3>
                      <Badge color="accent" compact className="font-mono font-bold">v{appVersion}</Badge>
                    </div>
                    <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">
                      End-to-End Encrypted Bookmark Synchronization
                    </p>
                  </div>
                </div>

                {/* Technical Architecture Highlights */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 text-center transition-colors hover:bg-[var(--color-muted)]/50">
                    <ShieldCheck className="h-4 w-4 text-[var(--color-primary)] mb-1" />
                    <span className="text-[10px] font-semibold text-[var(--color-foreground)]">AES-GCM 256</span>
                    <span className="text-[9px] text-[var(--color-muted-foreground)]">E2E Encrypted</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 text-center transition-colors hover:bg-[var(--color-muted)]/50">
                    <Cloud className="h-4 w-4 text-[var(--color-primary)] mb-1" />
                    <span className="text-[10px] font-semibold text-[var(--color-foreground)]">Cloudflare</span>
                    <span className="text-[9px] text-[var(--color-muted-foreground)]">Database Server</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 text-center transition-colors hover:bg-[var(--color-muted)]/50">
                    <Lock className="h-4 w-4 text-[var(--color-primary)] mb-1" />
                    <span className="text-[10px] font-semibold text-[var(--color-foreground)]">Zero-Knowledge</span>
                    <span className="text-[9px] text-[var(--color-muted-foreground)]">Client-Side Privacy</span>
                  </div>
                </div>

                {/* Explanation */}
                <Panel className="space-y-1.5">
                  <span className="font-semibold text-[11px] text-[var(--color-foreground)] block">{t('aboutAppDescTitle')}</span>
                  <MutedText className="text-[11px] leading-relaxed">{t('aboutAppDesc')}</MutedText>
                </Panel>

                {/* Developer, Database & License Info */}
                <div className="border-t border-[var(--color-border)] pt-3.5 text-[10px] text-[var(--color-muted-foreground)] space-y-2 font-mono">
                  <div className="flex justify-between items-center">
                    <span>{t('developerLabel')}</span>
                    <a
                      href="https://github.com/bismawy"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[var(--color-foreground)] hover:text-[var(--color-primary)] hover:underline flex items-center gap-1"
                    >
                      <span>Bisma</span>
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('databaseServerLabel')}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="font-semibold text-[var(--color-foreground)] flex items-center gap-1">
                        <Cloud className="h-3 w-3 text-[var(--color-primary)]" />
                        <span>Cloudflare</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('licenseLabel')}</span>
                    <span className="font-semibold text-[var(--color-foreground)]">Apache-2.0 Open Source</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('repoLabel')}</span>
                    <a
                      href="https://github.com/bismawy/syncty"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
                    >
                      <span>github.com/bismawy/syncty</span>
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--color-border)] bg-[var(--color-background)]/40 flex items-center justify-between shrink-0">
          {onLogout ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="h-8 px-3 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl cursor-pointer gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{t('logoutBtn')}</span>
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 px-4 text-xs font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]/40 rounded-xl cursor-pointer"
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-8 px-4 text-xs font-semibold bg-[var(--color-foreground)] text-[var(--color-background)] hover:opacity-90 rounded-xl cursor-pointer shadow-xs"
            >
              {saving ? t('savingBtn') : t('saveChangesBtn')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
