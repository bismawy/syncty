import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { loadSession } from '@/lib/storage';
import { getDeviceLabel, getDeviceId } from '@/lib/device';
import { listDevices, removeDevice, upsertDevice } from '@/lib/api';
import type { DeviceInfo } from '@/lib/types';
import { Eye, EyeOff, Copy, Check, ShieldAlert, Trash2 } from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLabelChange: (newLabel: string) => void;
}

export function SettingsModal({ open, onOpenChange, onLabelChange }: SettingsModalProps) {
  const [deviceName, setDeviceName] = React.useState('');
  const [syncInterval, setSyncInterval] = React.useState<number>(15);
  const [mnemonic, setMnemonic] = React.useState('');
  const [showMnemonic, setShowMnemonic] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [devices, setDevices] = React.useState<DeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = React.useState<string>('');
  const [loadingDevices, setLoadingDevices] = React.useState(false);

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

  const formatLastSync = (n: number | null) => {
    if (!n) return 'belum sinkron';
    const d = Date.now() - n;
    if (d < 60_000) return 'baru saja';
    if (d < 3_600_000) return `${Math.floor(d / 60_000)}m lalu`;
    if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}j lalu`;
    return `${Math.floor(d / 86_400_000)}h lalu`;
  };

  // Load existing configurations from storage
  React.useEffect(() => {
    if (!open) return;

    // Load mnemonic from active session
    loadSession().then((session) => {
      if (session) setMnemonic(session.mnemonic);
    });

    // Load custom label and interval
    browser.storage.local.get(['syncty.customDeviceLabel', 'syncty.syncInterval']).then((data) => {
      const customLabel = data['syncty.customDeviceLabel'] as string | undefined;
      setDeviceName(customLabel || getDeviceLabel());

      const interval = data['syncty.syncInterval'] as number | undefined;
      setSyncInterval(interval !== undefined ? interval : 15);
    });

    fetchDevices();
  }, [open, fetchDevices]);

  const handleCopy = async () => {
    if (!mnemonic) return;
    await navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanName = deviceName.trim();
      
      // Save configurations to storage
      await browser.storage.local.set({
        'syncty.customDeviceLabel': cleanName,
        'syncty.syncInterval': syncInterval,
      });

      // Instantly register the new label to the database!
      const session = await loadSession();
      if (session) {
        const devId = await getDeviceId();
        const finalLabel = cleanName || getDeviceLabel();
        await upsertDevice(session.authId, devId, finalLabel);
        // Also update the last-written device label cache so sync doesn't overwrite/think it's different
        await browser.storage.local.set({ ['syncty.lastDeviceLabel']: finalLabel });
      }

      // Push custom device label update up to state
      onLabelChange(cleanName || getDeviceLabel());
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const intervals = [
    { label: '5 Menit', value: 5 },
    { label: '15 Menit', value: 15 },
    { label: '30 Menit', value: 30 },
    { label: '60 Menit', value: 60 },
    { label: 'Manual', value: 0 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-foreground)] rounded-lg p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-base font-bold tracking-tight text-[var(--color-foreground)] uppercase">
            Pengaturan Aplikasi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-xs">
          {/* Section 1: Device Name */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider block">
              Nama Perangkat Ini
            </label>
            <Input
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Contoh: Brave - Laptop Utama"
              className="h-9 text-xs bg-[var(--color-background)] border-[var(--color-border)] focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]/60"
            />
            <p className="text-[10px] text-[var(--color-muted-foreground)]/80">
              Nama ini digunakan untuk membedakan riwayat sinkronisasi perangkat ini dengan yang lain.
            </p>
          </div>

          {/* Section 2: Sync Interval */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider block">
              Interval Sinkronisasi Otomatis
            </label>
            <div className="grid grid-cols-5 gap-1.5 bg-[var(--color-background)] border border-[var(--color-border)] p-1 rounded-md">
              {intervals.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSyncInterval(item.value)}
                  className={`py-1.5 text-[10px] font-semibold rounded border transition-all cursor-pointer ${
                    syncInterval === item.value
                      ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] border-[var(--color-border)] shadow-sm'
                      : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/20'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--color-muted-foreground)]/80">
              Pilih seberapa sering bookmarks Anda disinkronkan ke server secara berkala.
            </p>
          </div>

          {/* Section 3: Secret Key */}
          <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
            <label className="font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider block">
              Secret Key Anda (12 Kata Mnemonic)
            </label>
            <div className="relative flex items-center bg-[var(--color-background)] border border-[var(--color-border)] rounded-md px-3 py-2 text-xs font-mono select-none break-all pr-20 min-h-9">
              <span className={showMnemonic ? 'text-[var(--color-foreground)] font-medium select-text' : 'text-[var(--color-muted-foreground)]/40 tracking-wider font-sans select-none'}>
                {showMnemonic ? mnemonic : '•••• •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• ••••'}
              </span>
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/30 rounded"
                  onClick={() => setShowMnemonic(!showMnemonic)}
                  title={showMnemonic ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {showMnemonic ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-6 w-6 rounded transition-colors ${
                    copied
                      ? 'text-emerald-500 hover:text-emerald-600 bg-emerald-500/10'
                      : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/30'
                  }`}
                  onClick={handleCopy}
                  title="Salin Kunci"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {/* Warning Alert Box */}
            <div className="flex gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-[10px] leading-relaxed text-[var(--color-muted-foreground)]">
              <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-500 block mb-0.5 font-bold uppercase tracking-wider text-[9px]">PENTING & RAHASIA</strong>
                Simpan Secret Key ini di tempat yang aman dan tersembunyi. Siapa pun yang memiliki akses ke kunci ini dapat memulihkan, membaca, dan mengubah semua data bookmark Anda. Kami tidak menyimpan kunci Anda di server kami, sehingga kunci yang hilang tidak dapat dipulihkan.
              </div>
            </div>
          </div>

          {/* Section 4: Device Sessions */}
          <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
            <label className="font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider block">
              Daftar Sesi Browser (Perangkat)
            </label>
            {loadingDevices ? (
              <div className="text-[10px] text-[var(--color-muted-foreground)]/60 py-2">Memuat daftar perangkat…</div>
            ) : devices.length === 0 ? (
              <div className="text-[10px] text-[var(--color-muted-foreground)]/60 py-2">Tidak ada perangkat terdaftar.</div>
            ) : (
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {devices.map((dev) => {
                  const isCurrent = dev.device_id === currentDeviceId;
                  return (
                    <div
                      key={dev.device_id}
                      className="flex items-center justify-between bg-[var(--color-background)] border border-[var(--color-border)] rounded-md p-2 text-xs"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-[var(--color-foreground)] truncate">{dev.label}</span>
                        <span className="text-[9px] text-[var(--color-muted-foreground)]/60 leading-none mt-1">
                          Aktif {formatLastSync(dev.last_sync)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCurrent ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            Perangkat Ini
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTerminateDevice(dev.device_id)}
                            className="h-7 w-7 text-[var(--color-muted-foreground)] hover:text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer"
                            title="Hentikan Sesi"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-4 mt-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 px-4 text-xs font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]/30 rounded"
          >
            Batal
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !deviceName.trim()}
            size="sm"
            className="h-8 px-4 text-xs font-semibold rounded bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:bg-[var(--color-accent)]/80 border border-[var(--color-border)] shadow-sm cursor-pointer"
          >
            {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
