import { Folder, RefreshCw, CheckCircle2 } from 'lucide-react';

type ScanState = 'notScanned' | 'scanning' | 'empty';

// Shared empty/scanning/not-scanned row for the four Bookmark Management tabs.
// Each tab renders this as its only <tr> when there is no data to list.
export function ScanTableState({
  state,
  language,
  subtitleId,
  subtitleEn,
  emptyId,
  emptyEn,
}: {
  state: ScanState;
  language: string;
  subtitleId: string;
  subtitleEn: string;
  emptyId: string;
  emptyEn: string;
}) {
  const isId = language === 'id';

  if (state === 'scanning') {
    return (
      <tr key="scanning">
        <td colSpan={5} className="py-14 px-4 text-center text-xs text-[var(--color-muted-foreground)]">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
            <span>{isId ? 'Memindai...' : 'Scanning...'}</span>
          </div>
        </td>
      </tr>
    );
  }

  if (state === 'empty') {
    return (
      <tr key="empty">
        <td colSpan={5} className="py-14 px-4 text-center text-xs text-[var(--color-muted-foreground)]">
          <div className="flex flex-col items-center justify-center space-y-1.5">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            <p className="font-semibold text-[var(--color-foreground)]">
              {isId ? emptyId : emptyEn}
            </p>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr key="not-scanned">
      <td colSpan={5} className="py-14 px-4 text-center text-xs text-[var(--color-muted-foreground)]">
        <div className="flex flex-col items-center justify-center space-y-2">
          <Folder className="h-6 w-6 text-[var(--color-muted-foreground)]/40" />
          <p className="font-semibold text-[var(--color-foreground)]">
            {isId ? 'Belum Ada Data Pemindaian' : 'No Scan Data Yet'}
          </p>
          <p className="text-[11px] text-[var(--color-muted-foreground)] max-w-xs">
            {isId ? subtitleId : subtitleEn}
          </p>
        </div>
      </td>
    </tr>
  );
}
