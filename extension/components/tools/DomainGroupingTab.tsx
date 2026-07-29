import * as React from 'react';
import { Folder, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SplitFolderCandidate, splitFolderByDomain } from '@/lib/bookmarkManagement';
import { ScanTableState } from './ScanTableState';

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
  const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(new Set());

  const toggleExpand = (folderId: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

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
      <ScanTableState
        state="notScanned"
        language={language}
        subtitleId="Klik tombol Pindai untuk menganalisis pengelompokan domain Anda."
        subtitleEn="Click Scan to analyze domain grouping."
        emptyId="Tidak Ada Folder Yang Perlu Dikelompokkan!"
        emptyEn="No Folders Need Domain Grouping!"
      />
    );
  }

  if (isScanning) {
    return <ScanTableState state="scanning" language={language} subtitleId="" subtitleEn="" emptyId="" emptyEn="" />;
  }

  if (hasScanned && splitCandidates.length === 0) {
    return (
      <ScanTableState
        state="empty"
        language={language}
        subtitleId=""
        subtitleEn=""
        emptyId="Tidak Ada Folder Yang Perlu Dikelompokkan!"
        emptyEn="No Folders Need Domain Grouping!"
      />
    );
  }

  return (
    <>
      {pageData.map((candidate, idx) => {
        const rowNumber = (page - 1) * itemsPerPage + idx + 1;
        const isExpanded = expandedKeys.has(candidate.folderId);
        const totalBookmarksInCandidate = candidate.domainGroups.reduce((acc, g) => acc + g.count, 0);

        return (
          <React.Fragment key={candidate.folderId}>
            {/* Primary Candidate Row */}
            <tr className="hover:bg-[var(--color-accent)]/40 transition-colors">
              <td className="py-3 px-4 text-center font-mono text-[var(--color-muted-foreground)] font-bold">
                {rowNumber}
              </td>
              <td className="py-3 px-4 min-w-0">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 font-bold text-[var(--color-foreground)] min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleExpand(candidate.folderId)}
                      className="p-0.5 rounded-md hover:bg-[var(--color-accent)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
                      title={
                        isExpanded
                          ? (language === 'id' ? 'Sembunyikan detail' : 'Hide details')
                          : (language === 'id' ? 'Tampilkan detail' : 'Show details')
                      }
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-current shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-current shrink-0" />
                      )}
                    </button>
                    <Folder className="h-4 w-4 text-current shrink-0" />
                    <span className="truncate" title={candidate.folderName}>
                      {candidate.folderName}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-[var(--color-border)] text-[var(--color-muted-foreground)] shrink-0 ml-1">
                      {candidate.domainGroups.length} {language === 'id' ? 'domain' : 'domains'}
                    </Badge>
                  </div>
                  {isExpanded && (
                    <span className="text-[11px] text-[var(--color-muted-foreground)] font-mono mt-0.5 pl-6 truncate" title={candidate.folderPath}>
                      {candidate.folderPath}
                    </span>
                  )}
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
                {totalBookmarksInCandidate} items
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

            {/* Sub-Folders List (Rendered ONLY when expanded) */}
            {isExpanded &&
              candidate.domainGroups.map((g, domainIdx) => (
                <tr key={g.domain + domainIdx} className="bg-[var(--color-card)]/40 hover:bg-[var(--color-accent)]/20 transition-colors animate-in fade-in duration-150">
                  <td className="py-2 px-4 text-center font-mono text-[10px] text-[var(--color-muted-foreground)]">
                    #{domainIdx + 1}
                  </td>
                  <td className="py-2 px-4 min-w-0">
                    <div className="flex items-center gap-2 pl-6">
                      <Folder className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] shrink-0" />
                      <span className="font-medium text-[var(--color-foreground)] text-xs truncate" title={g.domain}>
                        {g.domain}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-4 text-[var(--color-muted-foreground)] font-mono text-[11px] truncate">
                    <span className="text-[var(--color-muted-foreground)]">Sub-folder: </span>
                    <span className="font-bold text-[var(--color-foreground)]">{g.domain}</span>
                  </td>
                  <td className="py-2 px-4 text-center text-[var(--color-muted-foreground)] font-mono text-[11px]">
                    {g.count} items
                  </td>
                  <td className="py-2 px-4 text-center">
                    <Badge variant="outline" className="text-[9px] uppercase font-bold text-sky-500 border-sky-500/30 bg-sky-500/10 rounded-md">
                      {language === 'id' ? 'Akan Dibuat' : 'Will Create'}
                    </Badge>
                  </td>
                </tr>
              ))}
          </React.Fragment>
        );
      })}
    </>
  );
}
