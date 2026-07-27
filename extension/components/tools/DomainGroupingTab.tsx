import { Folder, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SplitFolderCandidate, splitFolderByDomain } from '@/lib/bookmarkManagement';

interface DomainGroupingTabProps {
  splitCandidates: SplitFolderCandidate[];
  pageData: SplitFolderCandidate[];
  page: number;
  itemsPerPage: number;
  language: string;
  hasScanned: boolean;
  isScanning: boolean;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
  setNotice: (val: string | null) => void;
  handleScanSplit: () => void;
}

export function DomainGroupingTab({
  splitCandidates,
  pageData,
  page,
  itemsPerPage,
  language,
  hasScanned,
  isScanning,
  isProcessing,
  setIsProcessing,
  setNotice,
  handleScanSplit,
}: DomainGroupingTabProps) {
  const handleSplitSingle = async (candidate: SplitFolderCandidate) => {
    setIsProcessing(true);
    setNotice(null);
    try {
      const movedCount = await splitFolderByDomain(candidate);
      setNotice(
        language === 'id'
          ? `Berhasil memisahkan folder "${candidate.folderName}" (${movedCount} link dipindahkan ke sub-folder domain).`
          : `Successfully split folder "${candidate.folderName}" (${movedCount} links moved to domain sub-folders).`
      );
      await handleScanSplit();
    } catch (err) {
      console.error('Split failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!hasScanned && !isScanning) {
    return (
      <tr key="not-scanned">
        <td colSpan={5} className="py-14 px-4 text-center text-xs text-[var(--color-muted-foreground)]">
          <div className="flex flex-col items-center justify-center space-y-2">
            <Folder className="h-6 w-6 text-[var(--color-muted-foreground)]/40" />
            <p className="font-semibold text-[var(--color-foreground)]">
              {language === 'id' ? 'Belum Ada Data Pemindaian' : 'No Scan Data Yet'}
            </p>
            <p className="text-[11px] text-[var(--color-muted-foreground)] max-w-xs">
              {language === 'id'
                ? 'Klik tombol Pindai untuk menganalisis pengelompokan domain Anda.'
                : 'Click Scan to analyze domain grouping.'}
            </p>
          </div>
        </td>
      </tr>
    );
  }

  if (isScanning) {
    return (
      <tr key="scanning">
        <td colSpan={5} className="py-14 px-4 text-center text-xs text-[var(--color-muted-foreground)]">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
            <span>{language === 'id' ? 'Memindai pengelompokan domain...' : 'Scanning domain grouping...'}</span>
          </div>
        </td>
      </tr>
    );
  }

  if (hasScanned && splitCandidates.length === 0) {
    return (
      <tr key="empty">
        <td colSpan={5} className="py-14 px-4 text-center text-xs text-[var(--color-muted-foreground)]">
          <div className="flex flex-col items-center justify-center space-y-1.5">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            <p className="font-semibold text-[var(--color-foreground)]">
              {language === 'id' ? 'Tidak Ada Folder Yang Perlu Dikelompokkan!' : 'No Folders Need Domain Grouping!'}
            </p>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      {pageData.map((candidate, idx) => {
        const rowNumber = (page - 1) * itemsPerPage + idx + 1;

        return (
          <tr key={candidate.folderId} className="hover:bg-[var(--color-accent)]/40 transition-colors">
            <td className="py-3 px-4 text-center font-mono text-[var(--color-muted-foreground)] font-bold">
              {rowNumber}
            </td>
            <td className="py-3 px-4 min-w-0">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 font-bold text-[var(--color-foreground)] truncate" title={candidate.folderName}>
                  <Folder className="h-4 w-4 text-current shrink-0" />
                  <span className="truncate">{candidate.folderName}</span>
                </div>
                <span className="text-[11px] text-[var(--color-muted-foreground)] font-mono mt-0.5 truncate" title={candidate.folderPath}>
                  {candidate.folderPath}
                </span>
              </div>
            </td>
            <td className="py-3 px-4">
              <div className="flex flex-wrap gap-1">
                {candidate.domainGroups.map((g) => (
                  <Badge
                    key={g.domain}
                    variant="outline"
                    className="text-[10px] font-mono px-1.5 py-0.5 bg-[var(--color-accent)] text-[var(--color-foreground)] border-[var(--color-border)]/60 rounded-md"
                  >
                    {g.domain} ({g.count})
                  </Badge>
                ))}
              </div>
            </td>
            <td className="py-3 px-4 text-center font-mono font-bold text-[var(--color-foreground)]">
              {candidate.domainGroups.reduce((acc, g) => acc + g.count, 0)}
            </td>
            <td className="py-3 px-4 text-center">
              <Button
                size="sm"
                onClick={() => handleSplitSingle(candidate)}
                disabled={isProcessing}
                className="h-7 px-3 rounded-lg text-[11px] font-semibold bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 cursor-pointer shadow-xs"
              >
                {language === 'id' ? 'Kelompokkan' : 'Group'}
              </Button>
            </td>
          </tr>
        );
      })}
    </>
  );
}
