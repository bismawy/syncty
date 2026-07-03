import * as React from 'react';
import { KeyRound, Download, Copy, Check, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { generateMnemonic, normalizeMnemonic, validateMnemonic, mnemonicToTextFile, MNEMONIC_WORDS } from '@/lib/mnemonic';
import { deriveKeys } from '@/lib/crypto';
import { saveSession } from '@/lib/storage';

type Mode = 'choose' | 'create' | 'import';

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = React.useState<Mode>('choose');
  const [mnemonic, setMnemonic] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [importText, setImportText] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const generate = () => {
    setMnemonic(generateMnemonic());
    setSaved(false);
    setCopied(false);
  };

  React.useEffect(() => { if (mode === 'create' && !mnemonic) generate(); }, [mode]);

  const finish = async (mnemonicValue: string) => {
    setBusy(true); setError(null);
    try {
      const keys = await deriveKeys(mnemonicValue);
      await saveSession(mnemonicValue, keys);
      onDone();
    } catch (e) {
      setError('Gagal menurunkan kunci: ' + String(e));
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    const text = mnemonicToTextFile(mnemonic);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'syncty-secret-key.txt'; a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const doImport = async () => {
    const normalized = normalizeMnemonic(importText);
    const v = validateMnemonic(normalized);
    if (!v.ok) { setError(v.reason ?? 'Secret Key tidak valid'); return; }
    await finish(normalized);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <img src="/icons/logo_full.svg" alt="Syncty" className="mx-auto h-11 mb-2 select-none" />
          <CardDescription>
            {mode === 'choose' && 'Sinkronisasi bookmark terenkripsi antar browser & OS.'}
            {mode === 'create' && 'Simpan Secret Key Anda di tempat aman.'}
            {mode === 'import' && 'Masukkan 12 kata Secret Key Anda.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === 'choose' && (
            <div className="flex flex-col gap-2">
              <Button className="w-full" onClick={() => setMode('create')}>
                <KeyRound className="h-4 w-4" />
                Buat Secret Key Baru
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setMode('import')}>
                <ShieldCheck className="h-4 w-4" />
                Sudah Punya Secret Key
              </Button>
            </div>
          )}

          {mode === 'create' && (
            <>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-4">
                <div className="mb-2 flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                  <ShieldCheck className="h-4 w-4" /> Secret Key 12 kata — satu-satunya cara mengakses bookmark Anda
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {mnemonic.split(' ').map((w, i) => (
                    <div key={i} className="rounded-md bg-[var(--color-card)] px-2 py-1.5 text-center text-sm">
                      <span className="mr-1 text-[10px] text-[var(--color-muted-foreground)]">{i + 1}.</span>{w}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={download}>
                  <Download className="h-4 w-4" /> Unduh .txt
                </Button>
                <Button variant="outline" size="sm" onClick={copy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Tersalin' : 'Salin'}
                </Button>
                <Button variant="ghost" size="sm" onClick={generate}>Buat ulang</Button>
              </div>
              {saved && (
                <p className="flex items-center gap-1.5 text-xs text-[var(--color-success)]">
                  <Check className="h-3.5 w-3.5" /> File backup telah diunduh.
                </p>
              )}
              {error && <p className="text-xs text-[var(--color-destructive)]">{error}</p>}
              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => setMode('choose')}>
                  <ArrowLeft className="h-4 w-4" /> Kembali
                </Button>
                <Button onClick={() => finish(mnemonic)} disabled={busy}>
                  {busy ? 'Memproses…' : 'Saya sudah menyimpan, lanjut'}
                </Button>
              </div>
            </>
          )}

          {mode === 'import' && (
            <>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-[var(--color-input)] bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                placeholder={`Masukkan ${MNEMONIC_WORDS} kata, dipisah spasi…`}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              {error && <p className="text-xs text-[var(--color-destructive)]">{error}</p>}
              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => { setMode('choose'); setError(null); }}>
                  <ArrowLeft className="h-4 w-4" /> Kembali
                </Button>
                <Button onClick={doImport} disabled={busy || !importText.trim()}>
                  {busy ? 'Memproses…' : 'Masuk ke Dashboard'}
                </Button>
              </div>
            </>
          )}

          <p className="text-center text-[11px] text-[var(--color-muted-foreground)]">
            Secret Key tidak pernah dikirim ke server. Data Anda terenkripsi end-to-end.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
