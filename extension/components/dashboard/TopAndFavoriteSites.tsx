import * as React from 'react';
import { Plus, Trash2, History, Star } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { FaviconImage } from '@/components/ui/FaviconImage';
import { Pagination } from '@/components/bookmark/Pagination';
import { domainOf } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';

interface SiteItem {
  id?: string;
  url: string;
  title: string;
}

const DEFAULT_PINNED_SITES: SiteItem[] = [
  { id: '1', title: 'Google', url: 'https://www.google.com' },
  { id: '2', title: 'YouTube', url: 'https://www.youtube.com' },
  { id: '3', title: 'GitHub', url: 'https://github.com' },
  { id: '4', title: 'ChatGPT', url: 'https://chatgpt.com' },
  { id: '5', title: 'Wikipedia', url: 'https://www.wikipedia.org' },
];

const FALLBACK_TOP_SITES: SiteItem[] = [
  { title: 'Google', url: 'https://www.google.com' },
  { title: 'YouTube', url: 'https://www.youtube.com' },
  { title: 'GitHub', url: 'https://github.com' },
  { title: 'Reddit', url: 'https://www.reddit.com' },
  { title: 'Wikipedia', url: 'https://www.wikipedia.org' },
];

function getCleanTitle(title: string, url: string) {
  if (!title || title.toLowerCase().includes('just a moment')) {
    return domainOf(url);
  }
  const clean = title.split(/[-|•:]/)[0].trim();
  return clean || domainOf(url);
}

// 1. Top Sites Widget (Sering Diakses)
export function TopSitesWidget({ dragHandle }: { dragHandle?: React.ReactNode }) {
  const { t } = useTranslation();
  const [topSites, setTopSites] = React.useState<SiteItem[]>([]);
  const [loadingTop, setLoadingTop] = React.useState(true);

  React.useEffect(() => {
    const fetchTopSites = async () => {
      try {
        if (typeof browser !== 'undefined' && browser.topSites?.get) {
          const sites = await browser.topSites.get();
          if (sites && sites.length > 0) {
            setTopSites(sites.slice(0, 5));
            setLoadingTop(false);
            return;
          }
        } else if (typeof chrome !== 'undefined' && chrome.topSites?.get) {
          chrome.topSites.get((sites) => {
            if (sites && sites.length > 0) {
              setTopSites(sites.slice(0, 5));
            } else {
              setTopSites(FALLBACK_TOP_SITES);
            }
            setLoadingTop(false);
          });
          return;
        }
      } catch (err) {
        console.warn('Failed to get top sites:', err);
      }
      setTopSites(FALLBACK_TOP_SITES);
      setLoadingTop(false);
    };

    fetchTopSites();
  }, []);

  return (
    <DashboardCard
      title={t('topSitesTitle')}
      icon={<History className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] shrink-0" />}
      headerBadge={t('topSitesBadge')}
      headerAction={dragHandle}
      minHeight="h-[234px]"
    >
      <div className="pt-0 flex flex-col justify-between h-full">
        {loadingTop ? (
          <div className="space-y-2 py-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 rounded-md bg-[var(--color-background)]/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="card-inner-box divide-y divide-[var(--color-border)] overflow-hidden">
            {topSites.map((site, index) => {
              const displayTitle = getCleanTitle(site.title, site.url);
              const domain = domainOf(site.url);

              return (
                <a
                  key={index}
                  href={site.url}
                  className="flex items-center justify-between px-3 py-2 hover:bg-[var(--color-accent)]/40 transition-colors group text-xs select-none"
                  title={site.title || site.url}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <FaviconImage url={site.url} className="h-4 w-4 object-contain shrink-0" />
                    <span className="font-medium text-[var(--color-foreground)] truncate text-xs">
                      {displayTitle}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--color-muted-foreground)] font-mono group-hover:text-[var(--color-foreground)] transition-colors shrink-0 ml-2">
                    {domain}
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </DashboardCard>
  );
}

// 2. Favorite Sites Widget (Situs Favorit - 4 Kolom, 8 Items Per Page, Page Navigation)
export function FavoriteSitesWidget({ dragHandle }: { dragHandle?: React.ReactNode }) {
  const { t } = useTranslation();
  const [pinnedSites, setPinnedSites] = React.useState<SiteItem[]>(() => {
    const saved = localStorage.getItem('syncty.pinnedSites');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEFAULT_PINNED_SITES;
  });

  const [page, setPage] = React.useState(1);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newUrl, setNewUrl] = React.useState('');

  const ITEMS_PER_PAGE = 8;
  // Total pages: includes room for the "+ Tambah" tile at the end
  const totalSlots = pinnedSites.length + 1;
  const pageCount = Math.max(1, Math.ceil(totalSlots / ITEMS_PER_PAGE));

  React.useEffect(() => {
    if (page > pageCount && pageCount > 0) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  React.useEffect(() => {
    localStorage.setItem('syncty.pinnedSites', JSON.stringify(pinnedSites));
  }, [pinnedSites]);

  const handleAddPinned = () => {
    if (!newTitle.trim() || !newUrl.trim()) return;

    let url = newUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const newItem: SiteItem = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      url,
    };

    setPinnedSites((prev) => [...prev, newItem]);
    setNewTitle('');
    setNewUrl('');
    setShowAddModal(false);
  };

  const handleRemovePinned = (id?: string, url?: string) => {
    setPinnedSites((prev) => prev.filter((item) => (id ? item.id !== id : item.url !== url)));
  };

  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const pageSites = pinnedSites.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const showAddTileOnThisPage = pageSites.length < ITEMS_PER_PAGE;

  return (
    <DashboardCard
      title={t('favoriteSitesTitle')}
      icon={<Star className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] shrink-0" />}
      headerAction={
        <div className="flex items-center gap-1.5 shrink-0">
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          {dragHandle}
        </div>
      }
      minHeight="h-[234px]"
    >
      <div className="pt-0 flex flex-col justify-between h-full">
        {/* 4 Columns Grid Layout */}
        <div className="grid grid-cols-4 gap-2.5 items-center w-full">
          {pageSites.map((site) => {
            const displayTitle = getCleanTitle(site.title, site.url);

            return (
              <div
                key={site.id || site.url}
                className="card-inner-tile relative flex flex-col items-center justify-center h-18 p-1.5 group select-none"
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemovePinned(site.id, site.url);
                  }}
                  className="absolute top-1 right-1 h-4.5 w-4.5 rounded-full bg-[var(--color-card)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                  title={t('removeFavoriteTooltip')}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>

                <a
                  href={site.url}
                  className="flex flex-col items-center justify-center w-full h-full"
                  title={site.title || site.url}
                >
                  <FaviconImage
                    url={site.url}
                    className="h-5 w-5 object-contain shrink-0 mb-1"
                  />
                  <span className="text-[10px] font-medium text-[var(--color-foreground)] truncate w-full text-center px-0.5">
                    {displayTitle}
                  </span>
                </a>
              </div>
            );
          })}

          {showAddTileOnThisPage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex flex-col items-center justify-center h-18 p-1.5 rounded-md border border-dashed border-[var(--color-border)]/80 hover:border-[var(--color-ring)]/60 bg-[var(--color-background)]/20 hover:bg-[var(--color-accent)]/40 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-all cursor-pointer group"
              title={t('addFavoriteTooltip')}
            >
              <Plus className="h-4 w-4 mb-0.5 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-medium">{t('addFavoriteBtn', { count: '' }).split(' ')[0]}</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-foreground)]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{t('addFavoriteModalTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('titlePlaceholder')}
              className="text-xs"
            />
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder={t('urlPlaceholder')}
              className="text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
              {t('cancel')}
            </Button>
            <Button size="sm" onClick={handleAddPinned}>
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardCard>
  );
}

