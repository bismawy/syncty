import * as React from 'react';
import { loadSession } from '@/lib/storage';
import { Onboarding } from '@/components/onboarding';
import { Dashboard } from '@/components/dashboard/Dashboard';

export default function App() {
  const [ready, setReady] = React.useState(false);
  const [onboarded, setOnboarded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadSession()
      .then((s) => { setOnboarded(!!s); setReady(true); })
      .catch((e) => { setError(String(e)); setReady(true); });
  }, []);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-center text-sm text-[var(--color-destructive)]">
        <div>
          <p>Gagal memuat sesi</p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{error}</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <img src="/icons/logo.svg" alt="Syncty" className="h-12 w-12 animate-pulse" />
      </div>
    );
  }
  return onboarded ? (
    <Dashboard onLogout={() => setOnboarded(false)} />
  ) : (
    <Onboarding onDone={() => setOnboarded(true)} />
  );
}
