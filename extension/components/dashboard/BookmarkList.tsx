import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, ExternalLink, GripVertical } from 'lucide-react';
import type { Bm } from './useBookmarks';
import { Button } from '@/components/ui/button';
import { Marquee } from '@/components/ui/marquee';
import { cn, domainOf } from '@/lib/utils';

export function BookmarkList({
  bookmarks, onDelete, activeId, overId,
}: {
  bookmarks: Bm[];
  onDelete: (id: string) => Promise<void>;
  activeId: string | null;
  overId: string | null;
}) {
  const ids = bookmarks.map((b) => `bm:${b.id}`);

  if (bookmarks.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">Belum ada bookmark di toolbar.</p>;
  }

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div className="space-y-1.5">
        {bookmarks.map((b) => (
          <SortableRow
            key={b.id}
            bookmark={b}
            onDelete={onDelete}
            showDividerTop={!!activeId && overId === `bm:${b.id}` && activeId !== `bm:${b.id}`}
          />
        ))}
      </div>
    </SortableContext>
  );
}

function SortableRow({
  bookmark: b, onDelete, showDividerTop,
}: { bookmark: Bm; onDelete: (id: string) => Promise<void>; showDividerTop: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `bm:${b.id}`,
    data: { type: 'bookmark', bookmarkId: b.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isDragging ? 0.3 : 1,
  };

  const domain = domainOf(b.url);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-2',
        isDragging && 'opacity-40'
      )}
    >
      {showDividerTop && (
        <span className="absolute -top-1.5 left-0 right-0 h-0.5 rounded-full bg-[var(--color-primary)] z-10" />
      )}
      <button {...attributes} {...listeners} className="cursor-grab touch-none text-[var(--color-muted-foreground)] active:cursor-grabbing shrink-0" title="Seret">
        <GripVertical className="h-4 w-4" />
      </button>
      <a
        href={b.url ?? '#'}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 flex-1 items-center gap-2 text-sm"
        onClick={(e) => { if (!b.url) e.preventDefault(); }}
        draggable="false"
      >
        <img src={`https://www.google.com/s2/favicons?sz=32&domain=${domain}`} alt="" className="h-4 w-4 shrink-0 rounded-sm" onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} />
        <Marquee text={b.title || domain || '(tanpa judul)'} className="font-normal" />
      </a>
      <a href={b.url ?? '#'} target="_blank" rel="noreferrer" className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] shrink-0" onClick={(e) => e.stopPropagation()}>
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); onDelete(b.id); }} title="Hapus">
        <Trash2 className="h-3.5 w-3.5 text-[var(--color-destructive)]" />
      </Button>
    </div>
  );
}
