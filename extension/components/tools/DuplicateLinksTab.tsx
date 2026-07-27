import * as React from 'react';
import { ExternalLink, Trash2, ChevronDown, ChevronRight, Folder, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { moveToTrash } from '@/lib/trash';

export interface DuplicateBookmarkItem {
  id: string;
  title: string;
  url: string;
  dateAdded?: number;
  parentId?: string;
  folderPath: string;
}

export interface DuplicateGroup {
  key: string;
  displayUrl: string;
  items: DuplicateBookmarkItem[];
}

interface DuplicateLinksTabProps {
  dupLinkGroups: DuplicateGroup[];
  selectedLinkIds: Set<string>;
  setSelectedLinkIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  expandedLinkGroupKeys: Set<string>;
  toggleExpandLinkGroup: (key: string) => void;
  pageData: DuplicateGroup[];
  page: number;
  itemsPerPage: number;
  language: string;
  hasScanned: boolean;
  isScanning: boolean;
  handleScanDuplicateLinks: () => void;
}

export function DuplicateLinksTab({
  dupLinkGroups,
  selectedLinkIds,
  setSelectedLinkIds,
  expandedLinkGroupKeys,
  toggleExpandLinkGroup,
  pageData,
  page,
  itemsPerPage,
  language,
  hasScanned,
  isScanning,
  handleScanDuplicateLinks,
}: DuplicateLinksTabProps) {
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
                ? 'Klik tombol Pindai untuk menganalisis link duplikat Anda.'
                : 'Click Scan to analyze your duplicate links.'}
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
            <span>{language === 'id' ? 'Memindai link duplikat...' : 'Scanning duplicate links...'}</span>
          </div>
        </td>
      </tr>
    );
  }

  if (hasScanned && dupLinkGroups.length === 0) {
    return (
      <tr key="empty">
        <td colSpan={5} className="py-14 px-4 text-center text-xs text-[var(--color-muted-foreground)]">
          <div className="flex flex-col items-center justify-center space-y-1.5">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            <p className="font-semibold text-[var(--color-foreground)]">
              {language === 'id' ? 'Tidak Ada Link Duplikat Ditemukan!' : 'No Duplicate Links Found!'}
            </p>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      {pageData.map((group, groupIdx) => {
        const isGroupExpanded = expandedLinkGroupKeys.has(group.key);
        const groupItemIds = group.items.map((i) => i.id);
        const groupSelectedCount = groupItemIds.filter((id) => selectedLinkIds.has(id)).length;
        const groupCheckedState: boolean | 'indeterminate' =
          groupSelectedCount === 0
            ? false
            : groupSelectedCount === groupItemIds.length
            ? true
            : 'indeterminate';

        return (
          <React.Fragment key={group.key + groupIdx}>
            {/* Duplicate Group Header Row */}
            <tr className="bg-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/50 transition-colors">
              <td className="py-2.5 px-4 text-center">
                <Checkbox
                  checked={groupCheckedState}
                  onCheckedChange={(c) => {
                    setSelectedLinkIds((prev) => {
                      const next = new Set(prev);
                      if (c) {
                        groupItemIds.forEach((id) => next.add(id));
                      } else {
                        groupItemIds.forEach((id) => next.delete(id));
                      }
                      return next;
                    });
                  }}
                />
              </td>
              <td colSpan={4} className="py-2.5 px-4">
                <div className="flex items-center justify-between font-mono font-semibold text-[var(--color-foreground)]">
                  <div className="flex items-center gap-2 min-w-0 pr-4">
                    <button
                      type="button"
                      onClick={() => toggleExpandLinkGroup(group.key)}
                      className="p-0.5 rounded-md hover:bg-[var(--color-accent)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
                      title={
                        isGroupExpanded
                          ? (language === 'id' ? 'Sembunyikan detail' : 'Hide details')
                          : (language === 'id' ? 'Tampilkan detail' : 'Show details')
                      }
                    >
                      {isGroupExpanded ? (
                        <ChevronDown className="h-4 w-4 text-current shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-current shrink-0" />
                      )}
                    </button>
                    <span className="text-[var(--color-muted-foreground)] font-bold text-xs shrink-0">
                      #{(page - 1) * itemsPerPage + groupIdx + 1}
                    </span>
                    <span
                      className="truncate text-xs cursor-pointer hover:underline"
                      title={group.displayUrl}
                      onClick={() => toggleExpandLinkGroup(group.key)}
                    >
                      {group.displayUrl}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] shrink-0 ml-2">
                    {group.items.length} {language === 'id' ? 'duplikat' : 'duplicates'}
                  </Badge>
                </div>
              </td>
            </tr>

            {/* Duplicate Link Items (Rendered ONLY when expanded) */}
            {isGroupExpanded &&
              group.items.map((item, idx) => {
                const isSelected = selectedLinkIds.has(item.id);
                const isOriginal = idx === 0;

                return (
                  <tr key={item.id} className="bg-[var(--color-card)]/40 hover:bg-[var(--color-accent)]/20 transition-colors animate-in fade-in duration-150">
                    <td className="py-2.5 px-4 text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(c) => {
                          setSelectedLinkIds((prev) => {
                            const next = new Set(prev);
                            if (c) next.add(item.id);
                            else next.delete(item.id);
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td className="py-2.5 px-4 min-w-0">
                      <div className="flex flex-col min-w-0 pl-6">
                        <span className="font-semibold text-[var(--color-foreground)] truncate" title={item.title}>
                          {item.title}
                        </span>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] font-mono truncate flex items-center gap-1 mt-0.5"
                        >
                          <span>{item.url}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 text-current" />
                        </a>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-[var(--color-muted-foreground)] font-mono text-[11px] truncate" title={item.folderPath}>
                      {item.folderPath}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {isOriginal ? (
                        <Badge className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md">
                          {language === 'id' ? 'Simpan' : 'Keep Original'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] uppercase font-bold text-rose-500 border-rose-500/30 bg-rose-500/10 rounded-md">
                          {language === 'id' ? 'Duplikat' : 'Duplicate'}
                        </Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await moveToTrash(item.id);
                          handleScanDuplicateLinks();
                        }}
                        className="h-7 w-7 p-0 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        title="Buang ke Tong Sampah"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-current" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
          </React.Fragment>
        );
      })}
    </>
  );
}
