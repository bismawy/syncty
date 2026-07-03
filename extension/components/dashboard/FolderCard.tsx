import * as React from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pencil, Trash2, Folder as FolderIcon, Check, ExternalLink, GripVertical } from 'lucide-react';
import type { Bm } from './useBookmarks';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Marquee } from '@/components/ui/marquee';
import { Pagination } from './Pagination';
import { cn, domainOf } from '@/lib/utils';

const PER_PAGE = 5;

export function FolderCard({
  folder, onRename, onDeleteChild, onDeleteFolder, onNavigate, isOver, activeId, overId,
}: {
  folder: Bm;
  onRename: (id: string, title: string) => Promise<void>;
  onDeleteChild: (id: string) => Promise<void>;
  onDeleteFolder?: (id: string) => Promise<void>;
  onNavigate?: (id: string) => void;
  isOver: boolean;
  activeId: string | null;
  overId: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `folder:${folder.id}`,
    data: { type: 'folder', folderId: folder.id },
  });
  const [children, setChildren] = React.useState<Bm[]>([]);
  const [page, setPage] = React.useState(1);
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(folder.title);

  const reloadChildren = React.useCallback(() => {
    browser.bookmarks.getChildren(folder.id).then(setChildren).catch(() => {});
  }, [folder.id]);

  React.useEffect(() => {
    reloadChildren();
    browser.bookmarks.onCreated.addListener(reloadChildren);
    browser.bookmarks.onRemoved.addListener(reloadChildren);
    browser.bookmarks.onMoved.addListener(reloadChildren);
    browser.bookmarks.onChanged.addListener(reloadChildren);
    return () => {
      browser.bookmarks.onCreated.removeListener(reloadChildren);
      browser.bookmarks.onRemoved.removeListener(reloadChildren);
      browser.bookmarks.onMoved.removeListener(reloadChildren);
      browser.bookmarks.onChanged.removeListener(reloadChildren);
    };
  }, [reloadChildren]);

  React.useEffect(() => setTitle(folder.title), [folder.title]);

  const hasSubfolders = children.some((c) => !c.url);
  const pageCount = Math.max(1, Math.ceil(children.length / PER_PAGE));
  const view = children.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const save = async () => {
    try { await onRename(folder.id, title.trim() || folder.title); setEditing(false); } catch {}
  };

  const handleDeleteFolder = async () => {
    const ok = window.confirm(`Apakah Anda yakin ingin menghapus folder "${folder.title}"?\n\nTindakan ini tidak bisa dibatalkan.`);
    if (ok) {
      try {
        if (onDeleteFolder) {
          await onDeleteFolder(folder.id);
        } else {
          await onDeleteChild(folder.id);
        }
      } catch (err) {
        console.error('Failed to delete folder', err);
      }
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={cn(
        'flex flex-col min-w-0 overflow-hidden h-full',
        isOver && 'ring-2 ring-[var(--color-primary)]',
      )}
    >
      <CardHeader className="flex-row items-center gap-2 pb-2 min-w-0 overflow-hidden">
        <button {...attributes} {...listeners} className="cursor-grab touch-none text-[var(--color-muted-foreground)] active:cursor-grabbing shrink-0 animate-fade-in" title="Seret">
          <GripVertical className="h-4 w-4" />
        </button>
        <FolderIcon className="h-4 w-4 shrink-0 text-[var(--color-primary)] animate-fade-in" />
        {editing ? (
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setTitle(folder.title); } }}
            className="h-7"
          />
        ) : (
          <div className="flex-1 min-w-0 overflow-hidden">
            {hasSubfolders ? (
              <button className="text-left font-medium hover:text-[var(--color-primary)] transition-colors w-full truncate cursor-pointer" onClick={() => onNavigate?.(folder.id)}>
                <Marquee text={folder.title || 'Tanpa nama'} className="font-medium" />
              </button>
            ) : (
              <div className="text-left font-medium w-full truncate cursor-default">
                <Marquee text={folder.title || 'Tanpa nama'} className="font-medium" />
              </div>
            )}
          </div>
        )}
        {editing ? (
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 animate-fade-in" onClick={handleDeleteFolder} title="Hapus folder">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 animate-fade-in" onClick={save} title="Simpan">
              <Check className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditing(true)} title="Ganti nama">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-3 pt-0 flex flex-col justify-between">
        <div>
          {view.length > 0 ? (
            <SortableContext items={view.map(c => `bm:${c.id}`)} strategy={verticalListSortingStrategy}>
              <div className="rounded-md border border-[var(--color-border)] divide-y divide-[var(--color-border)] overflow-hidden bg-[var(--color-background)]/20">
                {view.map((c) => (
                  <FolderBookmarkRow
                    key={c.id}
                    c={c}
                    onDeleteChild={onDeleteChild}
                    parentFolderId={folder.id}
                    activeId={activeId}
                    overId={overId}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </SortableContext>
          ) : (
            <p className="py-6 text-center text-xs text-[var(--color-muted-foreground)]">Folder kosong</p>
          )}
        </div>
        {pageCount > 1 && (
          <div className="mt-3">
            <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FolderBookmarkRow({
  c, onDeleteChild, parentFolderId, activeId, overId, onNavigate,
}: {
  c: Bm;
  onDeleteChild: (id: string) => Promise<void>;
  parentFolderId: string;
  activeId: string | null;
  overId: string | null;
  onNavigate?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `bm:${c.id}`,
    data: { type: 'bookmark', bookmarkId: c.id, parentFolderId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isDragging ? 0.3 : 1,
  };

  const showDividerTop = overId === `bm:${c.id}` && activeId !== `bm:${c.id}`;
  const isSubfolder = !c.url;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-[var(--color-accent)]/30 transition-colors relative cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40 bg-[var(--color-muted)]"
      )}
      {...attributes}
      {...listeners}
    >
      {showDividerTop && (
        <span className="absolute -top-px left-0 right-0 h-0.5 bg-[var(--color-primary)] z-10" />
      )}
      <GripVertical className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
      {isSubfolder ? (
        <button
          className="flex min-w-0 flex-1 items-center gap-2 text-xs py-0.5 text-left font-medium hover:text-[var(--color-primary)] transition-colors"
          onClick={(e) => { e.stopPropagation(); onNavigate?.(c.id); }}
          draggable="false"
        >
          <FolderIcon className="h-3.5 w-3.5 shrink-0 text-amber-500/80 dark:text-amber-400/80" />
          <Marquee text={c.title} className="font-medium text-[var(--color-primary)]/90" />
        </button>
      ) : (
        <a
          href={c.url ?? '#'}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 flex-1 items-center gap-2 text-xs py-0.5"
          onClick={(e) => { if (!c.url) e.preventDefault(); }}
          draggable="false"
        >
          <img src={`https://www.google.com/s2/favicons?sz=32&domain=${domainOf(c.url)}`} alt="" className="h-3.5 w-3.5 shrink-0 rounded-sm" onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} />
          <Marquee text={c.title || domainOf(c.url) || '(tanpa judul)'} className="font-normal" />
        </a>
      )}
      {!isSubfolder && (
        <a href={c.url ?? '#'} target="_blank" rel="noreferrer" className="opacity-0 transition-opacity group-hover:opacity-100 shrink-0" onClick={(e) => e.stopPropagation()}>
          <ExternalLink className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
        </a>
      )}
      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 shrink-0" onClick={(e) => { e.stopPropagation(); onDeleteChild(c.id); }} title="Hapus">
        <Trash2 className="h-3.5 w-3.5 text-[var(--color-destructive)]" />
      </Button>
    </div>
  );
}
