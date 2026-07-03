import * as React from 'react';
import { toolbarId } from '@/lib/sync';

export { toolbarId };
export type Bm = Browser.bookmarks.BookmarkTreeNode;

export function useBookmarks(parentId: string = toolbarId()) {
  const [folders, setFolders] = React.useState<Bm[]>([]);
  const [bookmarks, setBookmarks] = React.useState<Bm[]>([]);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    try {
      const children = await browser.bookmarks.getChildren(parentId);

      // Auto-sort folders first, then links, ONLY in the main Bookmark Bar/Toolbar
      if (parentId === toolbarId()) {
        let firstBookmarkIdx = -1;
        let folderAfterBookmarkIdx = -1;
        for (let i = 0; i < children.length; i++) {
          if (children[i].url && firstBookmarkIdx === -1) {
            firstBookmarkIdx = i;
          }
          if (!children[i].url && firstBookmarkIdx !== -1) {
            folderAfterBookmarkIdx = i;
            break;
          }
        }

        if (folderAfterBookmarkIdx !== -1) {
          const fsNodes = children.filter((c) => !c.url);
          const bsNodes = children.filter((c) => c.url);
          const targetOrder = [...fsNodes, ...bsNodes];

          for (let i = 0; i < targetOrder.length; i++) {
            const node = targetOrder[i];
            const currentChildren = await browser.bookmarks.getChildren(parentId);
            const currentIdx = currentChildren.findIndex((c) => c.id === node.id);
            if (currentIdx !== i) {
              await browser.bookmarks.move(node.id, { index: i });
            }
          }
          return;
        }
      }

      const fs: Bm[] = [];
      const bs: Bm[] = [];
      for (const c of children) {
        if (c.url) bs.push(c);
        else fs.push(c);
      }
      setFolders(fs);
      setBookmarks(bs);
    } catch (err) {
      console.error('useBookmarks reload failed:', err);
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  React.useEffect(() => {
    reload();
    browser.bookmarks.onCreated.addListener(reload);
    browser.bookmarks.onRemoved.addListener(reload);
    browser.bookmarks.onMoved.addListener(reload);
    browser.bookmarks.onChanged.addListener(reload);
    return () => {
      browser.bookmarks.onCreated.removeListener(reload);
      browser.bookmarks.onRemoved.removeListener(reload);
      browser.bookmarks.onMoved.removeListener(reload);
      browser.bookmarks.onChanged.removeListener(reload);
    };
  }, [reload]);

  const renameFolder = React.useCallback(async (id: string, title: string) => {
    await browser.bookmarks.update(id, { title });
    await reload();
  }, [reload]);

  const deleteNode = React.useCallback(async (id: string) => {
    try { await browser.bookmarks.removeTree(id); } catch { await browser.bookmarks.remove(id); }
    await reload();
  }, [reload]);

  const moveNode = React.useCallback(async (id: string, parentIdTarget: string, index?: number) => {
    await browser.bookmarks.move(id, { parentId: parentIdTarget, ...(index !== undefined ? { index } : {}) });
    await reload();
  }, [reload]);

  return { folders, bookmarks, loading, reload, renameFolder, deleteNode, moveNode };
}
