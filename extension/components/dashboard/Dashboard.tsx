import * as React from 'react';
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCorners,
  DragOverlay, type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { RefreshCw, LogOut, Search, Filter, Folder, Link2, Sun, Moon, Laptop, GripVertical, ArrowLeft, Settings } from 'lucide-react';
import { useBookmarks, toolbarId, type Bm } from './useBookmarks';
import { FolderCard } from './FolderCard';
import { BookmarkList } from './BookmarkList';
import { SettingsModal } from './SettingsModal';
import { Pagination } from './Pagination';
import type { SyncStatus } from '@/lib/types';
import { EMPTY_STATUS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { clearSession } from '@/lib/storage';
import { getDeviceLabel } from '@/lib/device';
import { cn } from '@/lib/utils';

export function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [currentFolderId, setCurrentFolderId] = React.useState<string>(toolbarId());
  const [currentFolder, setCurrentFolder] = React.useState<Bm | null>(null);
  const [breadcrumbs, setBreadcrumbs] = React.useState<{ id: string; title: string }[]>([]);
  const { folders, bookmarks, loading, reload, renameFolder, deleteNode, moveNode } = useBookmarks(currentFolderId);
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'folders' | 'bookmarks'>('all');
  const [status, setStatus] = React.useState<SyncStatus>(EMPTY_STATUS);
  const [syncing, setSyncing] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  const [overFolder, setOverFolder] = React.useState<string | null>(null);
  const [folderPage, setFolderPage] = React.useState(1);
  const [bookmarkPage, setBookmarkPage] = React.useState(1);
  const [showSettings, setShowSettings] = React.useState(false);
  const [deviceLabel, setDeviceLabel] = React.useState(() => getDeviceLabel());

  React.useEffect(() => {
    // Trigger re-render when label cache (managed by device.ts) updates via
    // a storage change in any context.
    const onChange = (changes: Record<string, any>) => {
      if (changes['syncty.customDeviceLabel']) {
        setDeviceLabel(getDeviceLabel());
      }
    };
    browser.storage.onChanged.addListener(onChange);
    return () => browser.storage.onChanged.removeListener(onChange);
  }, []);

  const [totalLocalCount, setTotalLocalCount] = React.useState<number>(0);

  const calculateTotalBookmarks = React.useCallback(async () => {
    try {
      const id = toolbarId();
      const nodes = await browser.bookmarks.getSubTree(id);
      
      const count = (node: Browser.bookmarks.BookmarkTreeNode): number => {
        if (node.url) return 1;
        return (node.children ?? []).reduce((n, c) => n + count(c), 0);
      };
      
      if (nodes && nodes[0]) {
        setTotalLocalCount(count(nodes[0]));
      }
    } catch (err) {
      console.error('Failed to calculate total bookmarks:', err);
    }
  }, []);

  React.useEffect(() => {
    calculateTotalBookmarks();
    browser.bookmarks.onCreated.addListener(calculateTotalBookmarks);
    browser.bookmarks.onRemoved.addListener(calculateTotalBookmarks);
    browser.bookmarks.onMoved.addListener(calculateTotalBookmarks);
    browser.bookmarks.onChanged.addListener(calculateTotalBookmarks);
    return () => {
      browser.bookmarks.onCreated.removeListener(calculateTotalBookmarks);
      browser.bookmarks.onRemoved.removeListener(calculateTotalBookmarks);
      browser.bookmarks.onMoved.removeListener(calculateTotalBookmarks);
      browser.bookmarks.onChanged.removeListener(calculateTotalBookmarks);
    };
  }, [calculateTotalBookmarks]);

  const FOLDERS_PER_PAGE = 6;
  const BOOKMARKS_PER_PAGE = 12;

  React.useEffect(() => {
    if (currentFolderId === toolbarId()) {
      setCurrentFolder(null);
    } else {
      browser.bookmarks.get(currentFolderId).then(([node]) => {
        setCurrentFolder(node);
      }).catch(() => setCurrentFolder(null));
    }
    setFolderPage(1);
    setBookmarkPage(1);
  }, [currentFolderId]);

  React.useEffect(() => {
    const buildPath = async () => {
      if (currentFolderId === toolbarId()) {
        setBreadcrumbs([]);
      } else {
        const path: { id: string; title: string }[] = [];
        let currId = currentFolderId;
        while (currId && currId !== toolbarId()) {
          try {
            const [node] = await browser.bookmarks.get(currId);
            path.unshift({ id: node.id, title: node.title });
            currId = node.parentId || '';
          } catch {
            break;
          }
        }
        setBreadcrumbs(path);
      }
    };
    buildPath();
  }, [currentFolderId]);

  React.useEffect(() => {
    setFolderPage(1);
    setBookmarkPage(1);
  }, [filter]);

  const handleGoBack = () => {
    if (currentFolder && currentFolder.parentId) {
      setCurrentFolderId(currentFolder.parentId);
    } else {
      setCurrentFolderId(toolbarId());
    }
  };

  const [theme, setTheme] = React.useState<'dark' | 'light' | 'system'>(() => {
    return (localStorage.getItem('syncty.theme') as 'dark' | 'light' | 'system') || 'system';
  });

  React.useEffect(() => {
    const applyTheme = (t: 'dark' | 'light' | 'system') => {
      const root = document.documentElement;
      let isDark = true;
      if (t === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        isDark = t === 'dark';
      }
      root.classList.toggle('light', !isDark);
    };

    applyTheme(theme);
    localStorage.setItem('syncty.theme', theme);

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [theme]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const send = (type: string) => browser.runtime.sendMessage({ type });

  React.useEffect(() => {
    send('status').then((s: SyncStatus) => setStatus(s)).catch(() => {});
  }, []);

  const onSync = async () => {
    setSyncing(true);
    try {
      const res = await send('sync');
      setStatus(res as SyncStatus);
      await reload();
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await clearSession();
      onLogout();
    } catch (err) {
      console.error('logout failed', err);
    }
  };

  const formatLastSync = (n: number | null) => {
    if (!n) return 'Belum';
    const d = Date.now() - n;
    if (d < 60_000) return 'baru saja';
    if (d < 3_600_000) return `${Math.floor(d / 60_000)}m lalu`;
    return `${Math.floor(d / 3_600_000)}j lalu`;
  };

  const q = query.trim().toLowerCase();
  const match = (t: string, u?: string) => !q || t.toLowerCase().includes(q) || (u?.toLowerCase().includes(q) ?? false);
  const shownFolders = folders.filter((f) => match(f.title));
  const folderPageCount = Math.max(1, Math.ceil(shownFolders.length / FOLDERS_PER_PAGE));
  const foldersView = shownFolders.slice((folderPage - 1) * FOLDERS_PER_PAGE, folderPage * FOLDERS_PER_PAGE);
  const shownBookmarks = bookmarks.filter((b) => match(b.title, b.url));
  const bookmarkPageCount = Math.max(1, Math.ceil(shownBookmarks.length / BOOKMARKS_PER_PAGE));
  const bookmarksView = shownBookmarks.slice((bookmarkPage - 1) * BOOKMARKS_PER_PAGE, bookmarkPage * BOOKMARKS_PER_PAGE);

  const onDragStart = (e: DragStartEvent) => { setActiveId(String(e.active.id)); };
  const onDragOver = (e: DragOverEvent) => {
    setOverId(e.over ? String(e.over.id) : null);
    const oType = e.over?.data.current?.type;
    setOverFolder(oType === 'folder' ? String(e.over!.id) : null);
  };
  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null); setOverId(null); setOverFolder(null);
    const { active, over } = e;
    if (!over) return;
    const aType = active.data.current?.type;
    const oType = over.data.current?.type;
    try {
      if (aType === 'bookmark' && oType === 'folder') {
        // Dragging bookmark directly over a folder card (append to folder)
        await moveNode(active.data.current!.bookmarkId, over.data.current!.folderId);
      } else {
        // Dragging bookmark over another bookmark, or folder over another folder
        const activeNodeId = aType === 'folder' ? active.data.current!.folderId : active.data.current!.bookmarkId;
        const overNodeId = oType === 'folder' ? over.data.current!.folderId : over.data.current!.bookmarkId;
        
        if (activeNodeId && overNodeId && activeNodeId !== overNodeId) {
          const [activeNode] = await browser.bookmarks.get(activeNodeId);
          const [overNode] = await browser.bookmarks.get(overNodeId);
          
          if (activeNode && overNode && overNode.parentId) {
            await moveNode(activeNode.id, overNode.parentId, overNode.index);
          }
        }
      }
    } catch (err) {
      console.error('drag failed', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <img src="/icons/logo.svg" alt="" className="h-10 w-10 animate-pulse" />
      </div>
    );
  }

  const showFolders = filter === 'all' || filter === 'folders';
  const showBookmarks = filter === 'all' || filter === 'bookmarks';

  return (
    <div className="flex h-screen w-full bg-[var(--color-background)] text-[var(--color-foreground)] overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-60 border-r border-[var(--color-border)] bg-[var(--color-card)]/10 p-4 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
        <div className="space-y-6">
          {/* Logo */}
          <div>
            <img src="/icons/logo_full.svg" alt="Syncty" className="h-7 w-auto select-none" />
          </div>
        </div>

        <div className="space-y-4 border-t border-[var(--color-border)] pt-4">

          {/* Theme Selector Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/50"
            onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
            title="Klik untuk mengubah tema (Terang / Gelap / Sistem)"
          >
            {theme === 'light' ? (
              <Sun className="h-4 w-4 shrink-0" />
            ) : theme === 'dark' ? (
              <Moon className="h-4 w-4 shrink-0" />
            ) : (
              <Laptop className="h-4 w-4 shrink-0" />
            )}
            <span>Tema: {theme === 'light' ? 'Terang' : theme === 'dark' ? 'Gelap' : 'Sistem'}</span>
          </Button>

          {/* Settings Option */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/50"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Pengaturan
          </Button>

          {/* Logout Option */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Keluar (Logout)
          </Button>
        </div>
      </aside>

      {/* Right Content Panel */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Right Header */}
        <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-background)]/80 backdrop-blur px-6 py-3">
          <div className="w-full flex items-center justify-between gap-4">
            {/* Left Group: Search + Filters */}
            <div className="flex items-center gap-3">
              {/* Search Input */}
              <div className="relative w-80">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari folder atau bookmark…"
                  className="pl-8 h-9 text-xs"
                />
              </div>

              {/* Filter controls */}
              <div className="flex items-center rounded-md border border-[var(--color-border)] p-0.5 bg-[var(--color-card)]/50 shrink-0">
                <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} icon={<Filter className="h-3.5 w-3.5" />} label="Semua" />
                <FilterBtn active={filter === 'folders'} onClick={() => setFilter('folders')} icon={<Folder className="h-3.5 w-3.5" />} label="Folder" />
                <FilterBtn active={filter === 'bookmarks'} onClick={() => setFilter('bookmarks')} icon={<Link2 className="h-3.5 w-3.5" />} label="Link" />
              </div>
            </div>

            {/* Right Group: Sync Status & Action */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex flex-col items-end text-[11px] text-[var(--color-muted-foreground)] leading-tight shrink-0 select-none">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full animate-pulse",
                    status.lastSync ? "bg-emerald-500" : "bg-neutral-500"
                  )} />
                  <span>
                    {status.lastSync ? `Sinkron ${formatLastSync(status.lastSync)}` : 'Belum sinkron'}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--color-muted-foreground)]/70">
                  {totalLocalCount} bookmark
                </span>
              </div>
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs bg-transparent hover:bg-[var(--color-accent)] shrink-0 flex items-center gap-1.5" onClick={onSync} disabled={syncing}>
                <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                {syncing ? 'Sinkron…' : 'Sinkron Sekarang'}
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden px-6 py-4 flex flex-col">
          <div className="w-full flex-1 flex flex-col min-h-0 justify-between space-y-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
            >
              {/* Scrollable grid area inside fixed view */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch w-full">
                  {/* Left Section: Folder cards */}
                  {showFolders && (
                    <div className={cn(
                      filter === 'folders' ? 'xl:col-span-3' : 'xl:col-span-2',
                      'space-y-3 flex flex-col justify-between h-full min-h-0'
                    )}>
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center justify-between min-h-8">
                          <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] select-none truncate">
                            <button
                              onClick={() => setCurrentFolderId(toolbarId())}
                              className="hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
                            >
                              FOLDER
                            </button>
                            {breadcrumbs.map((b, i) => (
                              <React.Fragment key={b.id}>
                                <span className="mx-1">/</span>
                                <button
                                  onClick={() => setCurrentFolderId(b.id)}
                                  className={cn(
                                    "transition-colors",
                                    i === breadcrumbs.length - 1
                                      ? "text-[var(--color-foreground)] cursor-default"
                                      : "hover:text-[var(--color-foreground)] cursor-pointer"
                                  )}
                                  disabled={i === breadcrumbs.length - 1}
                                >
                                  {b.title.toUpperCase()}
                                </button>
                              </React.Fragment>
                            ))}
                          </div>
                          {currentFolderId !== toolbarId() && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-xs flex items-center gap-1.5 shrink-0 bg-transparent hover:bg-[var(--color-accent)]"
                              onClick={handleGoBack}
                            >
                              <ArrowLeft className="h-3.5 w-3.5" />
                              Kembali
                            </Button>
                          )}
                        </div>
                        
                        {shownFolders.length > 0 ? (
                          <SortableContext items={foldersView.map((f) => `folder:${f.id}`)} strategy={rectSortingStrategy}>
                            <div className={cn(
                              "grid gap-4 items-stretch",
                              filter === 'folders'
                                ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                            )}>
                              {foldersView.map((f) => (
                                <FolderCard
                                  key={f.id}
                                  folder={f}
                                  onRename={renameFolder}
                                  onDeleteChild={deleteNode}
                                  onDeleteFolder={deleteNode}
                                  onNavigate={setCurrentFolderId}
                                  isOver={overFolder === `folder:${f.id}`}
                                  activeId={activeId}
                                  overId={overId}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        ) : (
                          <div className="rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center text-xs text-[var(--color-muted-foreground)]">
                            Tidak ada folder di dalam folder ini.
                          </div>
                        )}
                      </div>
                      {folderPageCount > 1 && (
                        <div className="flex justify-start mt-4 pt-2 shrink-0">
                          <Pagination page={folderPage} pageCount={folderPageCount} onChange={setFolderPage} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Right Section: Non-folder bookmarks (Bookmark Toolbar / Current Path) */}
                  {showBookmarks && (
                    <div className={cn(
                      filter === 'bookmarks' ? 'xl:col-span-3' : 'xl:col-span-1',
                      'space-y-3 flex flex-col justify-between h-full min-h-0'
                    )}>
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center min-h-8">
                          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] truncate">
                            {currentFolderId === toolbarId() ? 'BOOKMARK TOOLBAR' : breadcrumbs.map(b => b.title.toUpperCase()).join(' / ')}
                          </h2>
                        </div>
                        <BookmarkList bookmarks={bookmarksView} onDelete={deleteNode} activeId={activeId} overId={overId} />
                      </div>
                      {bookmarkPageCount > 1 && (
                        <div className="flex justify-start mt-4 pt-2 shrink-0">
                          <Pagination page={bookmarkPage} pageCount={bookmarkPageCount} onChange={setBookmarkPage} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {shownFolders.length === 0 && shownBookmarks.length === 0 && (
                  <p className="py-16 text-center text-sm text-[var(--color-muted-foreground)]">
                    Tidak ada hasil{q ? ` untuk "${query}"` : ''}.
                  </p>
                )}
              </div>

              <DragOverlay>
                {activeId ? (
                  activeId.startsWith('folder:') ? (
                    <div className="opacity-80 scale-102 shadow-2xl rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 w-72">
                      <div className="flex items-center gap-2 font-medium text-sm text-[var(--color-foreground)] mb-2">
                        <GripVertical className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                        <span>{folders.find((f) => `folder:${f.id}` === activeId)?.title || 'Folder'}</span>
                      </div>
                      <div className="text-xs text-[var(--color-muted-foreground)] italic">Memindahkan folder…</div>
                    </div>
                  ) : (
                    <div className="opacity-85 scale-102 shadow-2xl rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-xs font-medium text-[var(--color-foreground)] flex items-center gap-2 w-72">
                      <GripVertical className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                      <span className="truncate">{bookmarks.find((b) => `bm:${b.id}` === activeId)?.title || 'Link'}</span>
                    </div>
                  )
                ) : null}
              </DragOverlay>
            </DndContext>

            <footer className="border-t border-[var(--color-border)] pt-3 flex items-center justify-between text-[11px] text-[var(--color-muted-foreground)] shrink-0">
              <span>Perangkat ini: <strong className="text-[var(--color-foreground)]">{deviceLabel}</strong></span>
              <span>Seret item untuk menyusun ulang atau memindahkan ke folder</span>
            </footer>
          </div>
        </main>
      </div>

      <SettingsModal
        open={showSettings}
        onOpenChange={setShowSettings}
        onLabelChange={setDeviceLabel}
      />
    </div>
  );
}

function FilterBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded px-2.5 py-1.5 text-xs transition-colors select-none",
        active
          ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-medium"
          : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
