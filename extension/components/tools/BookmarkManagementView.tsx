import * as React from 'react';
import {
  CopyCheck,
  FolderGit2,
  Split,
  FolderX,
  RefreshCw,
  Search,
  CheckCircle2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/bookmark/Pagination';
import { moveToTrash } from '@/lib/trash';
import {
  scanDuplicateFolders,
  mergeDuplicateFolderGroup,
  scanFoldersForSplitting,
  scanEmptyFolders,
  type DuplicateFolderGroup,
  type SplitFolderCandidate,
  type EmptyFolderItem,
} from '@/lib/bookmarkManagement';

import { DuplicateLinksTab, type DuplicateGroup } from './DuplicateLinksTab';
import { MergeFoldersTab } from './MergeFoldersTab';
import { DomainGroupingTab } from './DomainGroupingTab';
import { EmptyFoldersTab } from './EmptyFoldersTab';

const ITEMS_PER_PAGE = 8;

export function BookmarkManagementView() {
  const { language, t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = React.useState<'duplicates' | 'merge' | 'split' | 'empty'>('duplicates');

  // Common UI states
  const [isScanning, setIsScanning] = React.useState(false);
  const [hasScanned, setHasScanned] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);

  // Sub-tab 1: Duplicate Link Scanner state
  const [matchStrategy, setMatchStrategy] = React.useState<'strict' | 'normalized' | 'smart'>('smart');
  const [dupLinkGroups, setDupLinkGroups] = React.useState<DuplicateGroup[]>([]);
  const [selectedLinkIds, setSelectedLinkIds] = React.useState<Set<string>>(new Set());
  const [expandedLinkGroupKeys, setExpandedLinkGroupKeys] = React.useState<Set<string>>(new Set());

  const toggleExpandLinkGroup = React.useCallback((key: string) => {
    setExpandedLinkGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Sub-tab 2: Merge Duplicate Folders state
  const [duplicateGroups, setDuplicateGroups] = React.useState<DuplicateFolderGroup[]>([]);
  const [selectedGroupKeys, setSelectedGroupKeys] = React.useState<Set<string>>(new Set());
  const [expandedGroupKeys, setExpandedGroupKeys] = React.useState<Set<string>>(new Set());

  const toggleExpandGroup = React.useCallback((key: string) => {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Sub-tab 3: Split Folders state
  const [splitCandidates, setSplitCandidates] = React.useState<SplitFolderCandidate[]>([]);

  // Sub-tab 4: Empty Folders state
  const [emptyFolders, setEmptyFolders] = React.useState<EmptyFolderItem[]>([]);
  const [selectedEmptyFolderIds, setSelectedEmptyFolderIds] = React.useState<Set<string>>(new Set());

  // Helper normalize URL
  const normalizeUrl = React.useCallback((rawUrl: string, strategy: 'strict' | 'normalized' | 'smart'): string => {
    if (strategy === 'strict') return rawUrl.trim();
    try {
      let u = rawUrl.trim().toLowerCase();

      // Strip protocol & www
      u = u.replace(/^https?:\/\//, '');
      u = u.replace(/^www\./, '');

      // Strip hash fragment (#...)
      u = u.split('#')[0];

      // Strip query parameters for normalized and smart strategies
      if (strategy === 'normalized' || strategy === 'smart') {
        u = u.split('?')[0];
      }

      // Smart Strategy: Strip language locale path prefixes (e.g., /en-US/, /id/, /en/)
      if (strategy === 'smart') {
        u = u.replace(/\/(en-us|id-id|en|id|zh-cn|ja|de|fr|es)(\/|$)/g, '/');
      }

      // Strip trailing index filenames & slashes
      u = u.replace(/\/index\.(html?|php|aspx?)$/, '');
      if (u.length > 1 && u.endsWith('/')) {
        u = u.slice(0, -1);
      }
      return u;
    } catch {
      return rawUrl.trim();
    }
  }, []);

  // Scan handlers
  const handleScanDuplicateLinks = React.useCallback(async () => {
    setIsScanning(true);
    setNotice(null);
    try {
      const tree = await browser.bookmarks.getTree();
      const map = new Map<string, Array<{ id: string; title: string; url: string; folderPath: string; dateAdded?: number }>>();

      const traverse = (node: Browser.bookmarks.BookmarkTreeNode, currentPath: string[]) => {
        if (node.url) {
          const key = normalizeUrl(node.url, matchStrategy);
          const item = {
            id: node.id,
            title: node.title || node.url,
            url: node.url,
            folderPath: currentPath.join(' > ') || 'Root',
            dateAdded: node.dateAdded,
          };
          const existing = map.get(key) || [];
          existing.push(item);
          map.set(key, existing);
        }

        if (node.children) {
          const nextPath = node.title ? [...currentPath, node.title] : currentPath;
          for (const child of node.children) {
            traverse(child, nextPath);
          }
        }
      };

      for (const rootNode of tree) {
        traverse(rootNode, []);
      }

      const dupGroups: DuplicateGroup[] = [];
      map.forEach((items, key) => {
        if (items.length > 1) {
          const sorted = [...items].sort((a, b) => (a.dateAdded || 0) - (b.dateAdded || 0));
          dupGroups.push({ key, displayUrl: sorted[0].url, items: sorted });
        }
      });

      dupGroups.sort((a, b) => b.items.length - a.items.length);
      setDupLinkGroups(dupGroups);
      setHasScanned(true);
      setPage(1);

      // Default auto-select duplicates (keep oldest 1)
      const autoSet = new Set<string>();
      dupGroups.forEach((g) => {
        g.items.slice(1).forEach((item) => autoSet.add(item.id));
      });
      setSelectedLinkIds(autoSet);
    } catch (err) {
      console.error('Failed to scan duplicate links:', err);
    } finally {
      setIsScanning(false);
    }
  }, [matchStrategy, normalizeUrl]);

  const handleScanMerge = React.useCallback(async () => {
    setIsScanning(true);
    setNotice(null);
    try {
      const groups = await scanDuplicateFolders();
      setDuplicateGroups(groups);
      setSelectedGroupKeys(new Set(groups.map((g) => g.key)));
      setHasScanned(true);
      setPage(1);
    } finally {
      setIsScanning(false);
    }
  }, []);

  const handleScanSplit = React.useCallback(async () => {
    setIsScanning(true);
    setNotice(null);
    try {
      const candidates = await scanFoldersForSplitting();
      setSplitCandidates(candidates);
      setHasScanned(true);
      setPage(1);
    } finally {
      setIsScanning(false);
    }
  }, []);

  const handleScanEmpty = React.useCallback(async () => {
    setIsScanning(true);
    setNotice(null);
    try {
      const folders = await scanEmptyFolders();
      setEmptyFolders(folders);
      setSelectedEmptyFolderIds(new Set(folders.map((f) => f.id)));
      setHasScanned(true);
      setPage(1);
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Trigger scan when subtab or matchStrategy changes
  React.useEffect(() => {
    setNotice(null);
    if (activeSubTab === 'duplicates') handleScanDuplicateLinks();
    else if (activeSubTab === 'merge') handleScanMerge();
    else if (activeSubTab === 'split') handleScanSplit();
    else if (activeSubTab === 'empty') handleScanEmpty();
  }, [activeSubTab, matchStrategy, handleScanDuplicateLinks, handleScanMerge, handleScanSplit, handleScanEmpty]);

  // Action: Delete Selected Duplicate Links
  const handleDeleteDuplicateLinks = async () => {
    if (selectedLinkIds.size === 0) return;
    setIsProcessing(true);
    setNotice(null);
    try {
      const count = selectedLinkIds.size;
      for (const id of Array.from(selectedLinkIds)) {
        await moveToTrash(id);
      }
      setNotice(
        language === 'id'
          ? `Berhasil memindahkan ${count} link duplikat ke Tong Sampah!`
          : `Successfully moved ${count} duplicate links to Trash!`
      );
      await handleScanDuplicateLinks();
    } catch (err) {
      console.error('Failed to delete duplicate links:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Action: Merge Selected Duplicate Folder Groups
  const handleMergeSelected = async () => {
    if (selectedGroupKeys.size === 0) return;
    setIsProcessing(true);
    setNotice(null);
    try {
      let totalMergedFolders = 0;
      let totalMovedBookmarks = 0;
      let totalTrashedDuplicates = 0;

      const groupsToMerge = duplicateGroups.filter((g) => selectedGroupKeys.has(g.key));
      for (const group of groupsToMerge) {
        const result = await mergeDuplicateFolderGroup(group);
        totalMergedFolders += group.folders.length - 1;
        totalMovedBookmarks += result.movedBookmarksCount;
        totalTrashedDuplicates += result.trashedDuplicatesCount;
      }

      setNotice(
        language === 'id'
          ? `Berhasil menggabungkan ${totalMergedFolders} folder duplikat (${totalMovedBookmarks} link dipindahkan, ${totalTrashedDuplicates} link duplikat dibuang ke Trash).`
          : `Successfully merged ${totalMergedFolders} duplicate folders (${totalMovedBookmarks} links moved, ${totalTrashedDuplicates} duplicate links sent to Trash).`
      );

      await handleScanMerge();
    } catch (err) {
      console.error('Merge failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Action: Delete Selected Empty Folders
  const handleDeleteEmptyFolders = async () => {
    if (selectedEmptyFolderIds.size === 0) return;
    setIsProcessing(true);
    setNotice(null);
    try {
      const count = selectedEmptyFolderIds.size;
      for (const id of Array.from(selectedEmptyFolderIds)) {
        await moveToTrash(id);
      }
      setNotice(
        language === 'id'
          ? `Berhasil memindahkan ${count} folder kosong ke Tong Sampah!`
          : `Successfully moved ${count} empty folders to Trash!`
      );
      await handleScanEmpty();
    } catch (err) {
      console.error('Failed to delete empty folders:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Compute total items and pages
  const currentTotalItems = React.useMemo(() => {
    if (activeSubTab === 'duplicates') return dupLinkGroups.reduce((acc, g) => acc + g.items.length, 0);
    if (activeSubTab === 'merge') return duplicateGroups.length;
    if (activeSubTab === 'split') return splitCandidates.length;
    return emptyFolders.length;
  }, [activeSubTab, dupLinkGroups, duplicateGroups.length, splitCandidates.length, emptyFolders.length]);

  const pageCount = React.useMemo(() => {
    if (activeSubTab === 'duplicates') return Math.max(1, Math.ceil(dupLinkGroups.length / ITEMS_PER_PAGE));
    return Math.max(1, Math.ceil(currentTotalItems / ITEMS_PER_PAGE));
  }, [activeSubTab, dupLinkGroups.length, currentTotalItems]);

  const getCurrentPageData = <T,>(items: T[]): T[] => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return items.slice(start, start + ITEMS_PER_PAGE);
  };

  const matchOptions = React.useMemo(
    () => [
      {
        value: 'smart',
        label: language === 'id' ? 'Pintar (Bahasa & Parameter)' : 'Smart (Locale & Query)',
      },
      { value: 'normalized', label: t('matchNormalized') },
      { value: 'strict', label: t('matchStrict') },
    ],
    [t, language]
  );

  const handleAutoSelectDuplicates = React.useCallback(() => {
    const autoSet = new Set<string>();
    dupLinkGroups.forEach((g) => {
      g.items.slice(1).forEach((item) => autoSet.add(item.id));
    });
    setSelectedLinkIds(autoSet);
  }, [dupLinkGroups]);

  const allDupItemIds = React.useMemo(() => {
    const ids: string[] = [];
    dupLinkGroups.forEach((g) => g.items.forEach((item) => ids.push(item.id)));
    return ids;
  }, [dupLinkGroups]);

  const dupHeaderCheckedState: boolean | 'indeterminate' = React.useMemo(() => {
    if (allDupItemIds.length === 0) return false;
    if (selectedLinkIds.size === 0) return false;
    if (selectedLinkIds.size === allDupItemIds.length) return true;
    return 'indeterminate';
  }, [allDupItemIds.length, selectedLinkIds.size]);

  const mergeHeaderCheckedState: boolean | 'indeterminate' = React.useMemo(() => {
    if (duplicateGroups.length === 0) return false;
    if (selectedGroupKeys.size === 0) return false;
    if (selectedGroupKeys.size === duplicateGroups.length) return true;
    return 'indeterminate';
  }, [duplicateGroups.length, selectedGroupKeys.size]);

  const emptyHeaderCheckedState: boolean | 'indeterminate' = React.useMemo(() => {
    if (emptyFolders.length === 0) return false;
    if (selectedEmptyFolderIds.size === 0) return false;
    if (selectedEmptyFolderIds.size === emptyFolders.length) return true;
    return 'indeterminate';
  }, [emptyFolders.length, selectedEmptyFolderIds.size]);

  return (
    <div className="flex-1 w-full min-w-0 h-full overflow-y-auto px-8 pt-[89px] pb-8 select-none">
      <div className="w-full space-y-3">
        {/* Notice Banner */}
        {notice && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-in fade-in duration-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-current" />
            <span>{notice}</span>
          </div>
        )}

        {/* Clean, Borderless Toolbar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          {/* Left Side: Sub-tab Pills & Sub-filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Sub-Tab Navigation Pill Container */}
            <div className="flex items-center gap-1 bg-[var(--color-accent)]/60 p-1 rounded-xl border border-[var(--color-border)]/50">
              <button
                type="button"
                onClick={() => setActiveSubTab('duplicates')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSubTab === 'duplicates'
                    ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-xs border border-[var(--color-border)]/60'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                }`}
              >
                <CopyCheck className="h-3.5 w-3.5 text-current" />
                <span>{language === 'id' ? 'Duplikat Link' : 'Duplicate Links'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('merge')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSubTab === 'merge'
                    ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-xs border border-[var(--color-border)]/60'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                }`}
              >
                <FolderGit2 className="h-3.5 w-3.5 text-current" />
                <span>{language === 'id' ? 'Gabung Folder' : 'Merge Folders'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('split')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSubTab === 'split'
                    ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-xs border border-[var(--color-border)]/60'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                }`}
              >
                <Split className="h-3.5 w-3.5 text-current" />
                <span>{language === 'id' ? 'Kelompokkan Domain' : 'Group by Domain'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('empty')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSubTab === 'empty'
                    ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-xs border border-[var(--color-border)]/60'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                }`}
              >
                <FolderX className="h-3.5 w-3.5 text-current" />
                <span>{language === 'id' ? 'Folder Kosong' : 'Empty Folders'}</span>
              </button>
            </div>

            {/* Match Strategy Dropdown (When on Duplicates tab) */}
            {activeSubTab === 'duplicates' && (
              <div className="w-56 shrink-0">
                <Select
                  value={matchStrategy}
                  onValueChange={(val) => setMatchStrategy(val as 'strict' | 'normalized' | 'smart')}
                  options={matchOptions}
                  className="h-8 text-xs rounded-xl bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-foreground)]"
                />
              </div>
            )}

            {/* Scan / Rescan Button */}
            <Button
              onClick={() => {
                if (activeSubTab === 'duplicates') handleScanDuplicateLinks();
                else if (activeSubTab === 'merge') handleScanMerge();
                else if (activeSubTab === 'split') handleScanSplit();
                else handleScanEmpty();
              }}
              disabled={isScanning}
              className="flex items-center gap-1.5 h-8 px-3.5 text-xs rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 font-semibold cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              {isScanning ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-current" />
              ) : (
                <Search className="h-3.5 w-3.5 text-current" />
              )}
              <span>{hasScanned ? (language === 'id' ? 'Pindai Ulang' : 'Rescan') : (language === 'id' ? 'Pindai' : 'Scan')}</span>
            </Button>

            {/* Batch Action Buttons */}
            {activeSubTab === 'duplicates' && hasScanned && dupLinkGroups.length > 0 && (
              <>
                <Button
                  onClick={handleAutoSelectDuplicates}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex items-center gap-1.5 h-8 px-3.5 bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-accent)] font-semibold text-xs rounded-xl border border-[var(--color-border)] shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-current" />
                  <span>{language === 'id' ? 'Pilih Otomatis' : 'Auto Select'}</span>
                </Button>

                <Button
                  onClick={handleDeleteDuplicateLinks}
                  disabled={selectedLinkIds.size === 0 || isProcessing}
                  className="flex items-center gap-1.5 h-8 px-3.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-40 transition-all active:scale-95 cursor-pointer"
                >
                  {isProcessing ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 text-white" />
                  )}
                  <span>
                    {language === 'id'
                      ? `Hapus Terpilih (${selectedLinkIds.size})`
                      : `Delete Selected (${selectedLinkIds.size})`}
                  </span>
                </Button>
              </>
            )}

            {activeSubTab === 'merge' && hasScanned && duplicateGroups.length > 0 && (
              <Button
                onClick={handleMergeSelected}
                disabled={selectedGroupKeys.size === 0 || isProcessing}
                className="flex items-center gap-1.5 h-8 px-3.5 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 font-semibold text-xs rounded-xl shadow-xs disabled:opacity-40 transition-all active:scale-95 cursor-pointer"
              >
                {isProcessing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-current" />
                ) : (
                  <FolderGit2 className="h-3.5 w-3.5 text-current" />
                )}
                <span>
                  {language === 'id'
                    ? `Gabungkan Semua (${selectedGroupKeys.size})`
                    : `Merge All (${selectedGroupKeys.size})`}
                </span>
              </Button>
            )}

            {activeSubTab === 'empty' && hasScanned && emptyFolders.length > 0 && (
              <Button
                onClick={handleDeleteEmptyFolders}
                disabled={selectedEmptyFolderIds.size === 0 || isProcessing}
                className="flex items-center gap-1.5 h-8 px-3.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-40 transition-all active:scale-95 cursor-pointer"
              >
                {isProcessing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 text-white" />
                )}
                <span>
                  {language === 'id'
                    ? `Hapus Terpilih (${selectedEmptyFolderIds.size})`
                    : `Delete Selected (${selectedEmptyFolderIds.size})`}
                </span>
              </Button>
            )}
          </div>

          {/* Right Side: Summary & Pagination */}
          <div className="flex items-center gap-3 text-xs font-semibold text-[var(--color-foreground)] shrink-0">
            {isScanning ? (
              <span className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--color-primary)]" />
                <span>{language === 'id' ? 'Memindai...' : 'Scanning...'}</span>
              </span>
            ) : !hasScanned ? (
              <span className="text-[var(--color-muted-foreground)] font-medium">
                {language === 'id' ? 'Klik pindai untuk memulai' : 'Click scan to start'}
              </span>
            ) : currentTotalItems > 0 ? (
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  {language === 'id'
                    ? `${currentTotalItems} item ditemukan`
                    : `${currentTotalItems} items found`}
                </span>
                {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onChange={setPage} />}
              </div>
            ) : (
              <span className="text-[var(--color-muted-foreground)] font-medium">
                {language === 'id' ? 'Tidak ada data ditemukan' : 'No items found'}
              </span>
            )}
          </div>
        </div>

        {/* Fixed Table Layout Container (Strict 1-Word Column Headers) */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse table-fixed">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]/60 text-[var(--color-muted-foreground)] font-semibold select-none">
                  {activeSubTab === 'duplicates' ? (
                    <>
                      <th className="py-2.5 px-4 w-12 text-center">
                        <Checkbox
                          checked={dupHeaderCheckedState}
                          disabled={!hasScanned || dupLinkGroups.length === 0}
                          onCheckedChange={(c) => {
                            if (c) setSelectedLinkIds(new Set(allDupItemIds));
                            else setSelectedLinkIds(new Set());
                          }}
                        />
                      </th>
                      <th className="py-2.5 px-4">{language === 'id' ? 'Link' : 'Link'}</th>
                      <th className="py-2.5 px-4 w-60">{language === 'id' ? 'Lokasi' : 'Location'}</th>
                      <th className="py-2.5 px-4 w-28 text-center">{language === 'id' ? 'Status' : 'Status'}</th>
                      <th className="py-2.5 px-4 w-20 text-center">{language === 'id' ? 'Aksi' : 'Action'}</th>
                    </>
                  ) : activeSubTab === 'merge' ? (
                    <>
                      <th className="py-2.5 px-4 w-12 text-center">
                        <Checkbox
                          checked={mergeHeaderCheckedState}
                          disabled={!hasScanned || duplicateGroups.length === 0}
                          onCheckedChange={(c) => {
                            if (c) setSelectedGroupKeys(new Set(duplicateGroups.map((g) => g.key)));
                            else setSelectedGroupKeys(new Set());
                          }}
                        />
                      </th>
                      <th className="py-2.5 px-4">{language === 'id' ? 'Folder' : 'Folder'}</th>
                      <th className="py-2.5 px-4 w-72">{language === 'id' ? 'Target' : 'Target'}</th>
                      <th className="py-2.5 px-4 w-32 text-center">{language === 'id' ? 'Jumlah' : 'Count'}</th>
                      <th className="py-2.5 px-4 w-28 text-center">{language === 'id' ? 'Aksi' : 'Action'}</th>
                    </>
                  ) : activeSubTab === 'empty' ? (
                    <>
                      <th className="py-2.5 px-4 w-12 text-center">
                        <Checkbox
                          checked={emptyHeaderCheckedState}
                          disabled={!hasScanned || emptyFolders.length === 0}
                          onCheckedChange={(c) => {
                            if (c) setSelectedEmptyFolderIds(new Set(emptyFolders.map((f) => f.id)));
                            else setSelectedEmptyFolderIds(new Set());
                          }}
                        />
                      </th>
                      <th className="py-2.5 px-4">{language === 'id' ? 'Folder' : 'Folder'}</th>
                      <th className="py-2.5 px-4 w-72">{language === 'id' ? 'Lokasi' : 'Location'}</th>
                      <th className="py-2.5 px-4 w-28 text-center">{language === 'id' ? 'Status' : 'Status'}</th>
                      <th className="py-2.5 px-4 w-20 text-center">{language === 'id' ? 'Aksi' : 'Action'}</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2.5 px-4 w-12 text-center">#</th>
                      <th className="py-2.5 px-4">{language === 'id' ? 'Folder' : 'Folder'}</th>
                      <th className="py-2.5 px-4 w-72">{language === 'id' ? 'Domain' : 'Domains'}</th>
                      <th className="py-2.5 px-4 w-28 text-center">{language === 'id' ? 'Jumlah' : 'Count'}</th>
                      <th className="py-2.5 px-4 w-32 text-center">{language === 'id' ? 'Aksi' : 'Action'}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/40">
                {activeSubTab === 'duplicates' && (
                  <DuplicateLinksTab
                    dupLinkGroups={dupLinkGroups}
                    selectedLinkIds={selectedLinkIds}
                    setSelectedLinkIds={setSelectedLinkIds}
                    expandedLinkGroupKeys={expandedLinkGroupKeys}
                    toggleExpandLinkGroup={toggleExpandLinkGroup}
                    pageData={getCurrentPageData(dupLinkGroups)}
                    page={page}
                    itemsPerPage={ITEMS_PER_PAGE}
                    language={language}
                    hasScanned={hasScanned}
                    isScanning={isScanning}
                    handleScanDuplicateLinks={handleScanDuplicateLinks}
                  />
                )}

                {activeSubTab === 'merge' && (
                  <MergeFoldersTab
                    duplicateGroups={duplicateGroups}
                    selectedGroupKeys={selectedGroupKeys}
                    setSelectedGroupKeys={setSelectedGroupKeys}
                    expandedGroupKeys={expandedGroupKeys}
                    toggleExpandGroup={toggleExpandGroup}
                    pageData={getCurrentPageData(duplicateGroups)}
                    page={page}
                    itemsPerPage={ITEMS_PER_PAGE}
                    language={language}
                    hasScanned={hasScanned}
                    isScanning={isScanning}
                    isProcessing={isProcessing}
                    setIsProcessing={setIsProcessing}
                    setNotice={setNotice}
                    handleScanMerge={handleScanMerge}
                  />
                )}

                {activeSubTab === 'split' && (
                  <DomainGroupingTab
                    splitCandidates={splitCandidates}
                    pageData={getCurrentPageData(splitCandidates)}
                    page={page}
                    itemsPerPage={ITEMS_PER_PAGE}
                    language={language}
                    hasScanned={hasScanned}
                    isScanning={isScanning}
                    isProcessing={isProcessing}
                    setIsProcessing={setIsProcessing}
                    setNotice={setNotice}
                    handleScanSplit={handleScanSplit}
                  />
                )}

                {activeSubTab === 'empty' && (
                  <EmptyFoldersTab
                    emptyFolders={emptyFolders}
                    selectedEmptyFolderIds={selectedEmptyFolderIds}
                    setSelectedEmptyFolderIds={setSelectedEmptyFolderIds}
                    pageData={getCurrentPageData(emptyFolders)}
                    language={language}
                    hasScanned={hasScanned}
                    isScanning={isScanning}
                    handleScanEmpty={handleScanEmpty}
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
