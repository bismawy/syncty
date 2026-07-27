import * as React from 'react';
import { createAvatar } from '@dicebear/core';
import { glass } from '@dicebear/collection';
import {
  LayoutDashboard,
  Bookmark,
  Trash2,
  Sun,
  Moon,
  Laptop,
  Settings,
  RefreshCw,
  PanelLeftClose,
  FolderGit2,
} from 'lucide-react';
import { toolbarId } from '@/components/bookmark/useBookmarks';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { Header } from './Header';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { BookmarkView } from '@/components/bookmark/BookmarkView';
import { BookmarkManagementView } from '@/components/tools/BookmarkManagementView';
import { TrashView } from '@/components/trash/TrashView';
import { getTrashItems } from '@/lib/trash';
import type { SyncStatus } from '@/lib/types';
import { EMPTY_STATUS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { clearSession } from '@/lib/storage';
import { getDeviceLabel } from '@/lib/device';
import { cn } from '@/lib/utils';
import { loadThemeConfig, saveThemeConfig, applyThemeConfig, getEffectiveIsDark } from '@/lib/theme';
import { LanguageProvider, useTranslation } from '@/lib/i18n';

import { IconButton } from '@/components/ui/icon-button';

interface SidebarNavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  collapsed?: boolean;
  badge?: React.ReactNode;
  title?: string;
  className?: string;
}

function SidebarNavItem({
  icon,
  label,
  isActive = false,
  onClick,
  collapsed = false,
  badge,
  title,
  className,
}: SidebarNavItemProps) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title || label}
        className={cn(
          'relative flex items-center justify-center h-10 w-10 rounded-xl transition-colors cursor-pointer',
          isActive
            ? 'bg-[var(--color-accent)] text-[var(--color-foreground)] border border-[var(--color-border)]/50'
            : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/50',
          className
        )}
      >
        <span className="shrink-0">{icon}</span>
        {badge}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title || label}
      className={cn(
        'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer select-none',
        isActive
          ? 'bg-[var(--color-accent)] text-[var(--color-foreground)] border border-[var(--color-border)]/50'
          : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/50',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0 truncate">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      {badge && <span className="shrink-0 ml-2">{badge}</span>}
    </button>
  );
}

function SidebarHeader({
  collapsed,
  themeMode,
  onToggleCollapse,
}: {
  collapsed: boolean;
  themeMode: 'dark' | 'light' | 'system';
  onToggleCollapse: () => void;
}) {
  const { t } = useTranslation();
  const isDark = getEffectiveIsDark(themeMode);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-3 pt-1">
        <IconButton
          variant="outline"
          size="md"
          onClick={onToggleCollapse}
          title={t('expandSidebar')}
        >
          <img
            src={isDark ? '/icons/Syncty_Logo_Mark_Light.svg' : '/icons/Syncty_Logo_Mark_Dark.svg'}
            alt="Syncty"
            className="h-5 w-5 shrink-0 select-none"
          />
        </IconButton>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-1 pt-1">
      <img
        src={isDark ? '/icons/Syncty_Logo_Primary_Light.svg' : '/icons/Syncty_Logo_Primary_Dark.svg'}
        alt="Syncty"
        className="h-7 w-auto select-none shrink-0"
      />

      <IconButton
        variant="ghost"
        size="sm"
        onClick={onToggleCollapse}
        title={t('collapseSidebar')}
      >
        <PanelLeftClose className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

function SidebarProfileCard({
  collapsed,
  avatarDataUri,
  deviceLabel,
  lastSyncText,
  syncing,
  onSync,
}: {
  collapsed: boolean;
  avatarDataUri: string;
  deviceLabel: string;
  lastSyncText: string;
  syncing: boolean;
  onSync: () => void;
}) {
  const { t } = useTranslation();

  if (collapsed) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)]/60 p-2 flex flex-col items-center gap-2 shadow-xs w-full">
        <img
          src={avatarDataUri}
          alt="Avatar"
          className="h-8 w-8 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] shrink-0 shadow-xs object-cover"
          title={deviceLabel}
        />
        <IconButton
          variant="outline"
          size="sm"
          onClick={onSync}
          disabled={syncing}
          title={syncing ? t('syncingButton') : `${t('syncButton')} (${lastSyncText})`}
        >
          <RefreshCw className={cn('h-3.5 w-3.5 text-[var(--color-primary)]', syncing && 'animate-spin')} />
        </IconButton>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)]/60 p-3 space-y-3 shadow-xs">
      <div className="flex items-center gap-3">
        <img
          src={avatarDataUri}
          alt="Avatar"
          className="h-10 w-10 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] shrink-0 shadow-xs object-cover"
        />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-semibold text-[var(--color-foreground)] truncate">
            {deviceLabel}
          </span>
          <span className="text-[10px] text-[var(--color-muted-foreground)] font-mono truncate">
            {lastSyncText}
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs font-semibold rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-accent)] border-[var(--color-border)] text-[var(--color-foreground)] flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        onClick={onSync}
        disabled={syncing}
      >
        <RefreshCw className={cn('h-3.5 w-3.5 text-[var(--color-primary)]', syncing && 'animate-spin')} />
        <span>{syncing ? t('syncingButton') : t('syncButton')}</span>
      </Button>
    </div>
  );
}

function ThemeToggleButton({
  themeMode,
  onToggle,
}: {
  themeMode: 'dark' | 'light' | 'system';
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <IconButton
      variant="ghost"
      size="lg"
      onClick={onToggle}
      title={`${t('themeTitle')}: ${themeMode === 'light' ? t('themeLight') : themeMode === 'dark' ? t('themeDark') : t('themeSystem')}`}
    >
      {themeMode === 'light' ? (
        <Sun className="h-4.5 w-4.5" />
      ) : themeMode === 'dark' ? (
        <Moon className="h-4.5 w-4.5" />
      ) : (
        <Laptop className="h-4.5 w-4.5" />
      )}
    </IconButton>
  );
}

function SidebarFooter({
  collapsed,
  themeMode,
  onOpenSettings,
  onToggleTheme,
}: {
  collapsed: boolean;
  themeMode: 'dark' | 'light' | 'system';
  onOpenSettings: () => void;
  onToggleTheme: () => void;
}) {
  const { t } = useTranslation();

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 pt-2 border-t border-[var(--color-border)]/60 w-full">
        <SidebarNavItem
          icon={<Settings className="h-4.5 w-4.5" />}
          label={t('navSettings')}
          onClick={onOpenSettings}
          collapsed={true}
        />
        <ThemeToggleButton themeMode={themeMode} onToggle={onToggleTheme} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]/60">
      <SidebarNavItem
        icon={<Settings className="h-4.5 w-4.5" />}
        label={t('navSettings')}
        onClick={onOpenSettings}
        collapsed={false}
        className="flex-1"
      />
      <ThemeToggleButton themeMode={themeMode} onToggle={onToggleTheme} />
    </div>
  );
}

export function Dashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <LanguageProvider>
      <DashboardContent onLogout={onLogout} />
    </LanguageProvider>
  );
}

function DashboardContent({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'bookmark' | 'organize' | 'trash'>('dashboard');
  const [status, setStatus] = React.useState<SyncStatus>(EMPTY_STATUS);
  const [syncing, setSyncing] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showWidgetSettings, setShowWidgetSettings] = React.useState(false);
  const [deviceLabel, setDeviceLabel] = React.useState(() => getDeviceLabel());
  const [totalLocalCount, setTotalLocalCount] = React.useState<number>(0);
  const [totalFolderCount, setTotalFolderCount] = React.useState<number>(0);
  const [directLinksCount, setDirectLinksCount] = React.useState<number>(0);
  const [trashCount, setTrashCount] = React.useState<number>(0);
  const [themeMode, setThemeMode] = React.useState<'dark' | 'light' | 'system'>('system');

  // Sidebar collapsed state (persisted in localStorage)
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(() => {
    return localStorage.getItem('syncty.sidebarCollapsed') === 'true';
  });

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('syncty.sidebarCollapsed', String(next));
      return next;
    });
  };

  // Search & Filter state for Bookmark tab
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'folders' | 'bookmarks'>('all');

  const avatarDataUri = React.useMemo(() => {
    return createAvatar(glass, {
      seed: deviceLabel || 'SynctyUser',
    }).toDataUri();
  }, [deviceLabel]);

  const formatLastSync = (n: number | null) => {
    if (!n) return t('syncStatusNotSynced');
    const d = Date.now() - n;
    if (d < 60_000) return t('syncStatusSyncedJustNow');
    if (d < 3_600_000) return t('syncStatusSyncedAgo', { time: `${Math.floor(d / 60_000)}m` });
    return t('syncStatusSyncedAgo', { time: `${Math.floor(d / 3_600_000)}h` });
  };

  React.useEffect(() => {
    const onChange = (changes: Record<string, any>) => {
      if (changes['syncty.customDeviceLabel']) {
        setDeviceLabel(getDeviceLabel());
      }
    };
    browser.storage.onChanged.addListener(onChange);
    return () => browser.storage.onChanged.removeListener(onChange);
  }, []);

  const calculateTotalBookmarks = React.useCallback(async () => {
    try {
      const id = toolbarId();
      const nodes = await browser.bookmarks.getSubTree(id);

      let bCount = 0;
      let fCount = 0;
      let directCount = 0;

      if (nodes && nodes[0]) {
        (nodes[0].children ?? []).forEach((child) => {
          if (child.url) directCount++;
        });

        const traverse = (node: Browser.bookmarks.BookmarkTreeNode) => {
          if (node.url) {
            bCount++;
          } else {
            if (node.id !== id) fCount++;
            (node.children ?? []).forEach(traverse);
          }
        };

        traverse(nodes[0]);
        setTotalLocalCount(bCount);
        setTotalFolderCount(fCount);
        setDirectLinksCount(directCount);
      }
    } catch (err) {
      console.error('Failed to calculate total bookmarks & folders:', err);
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

  const reloadTrashCount = React.useCallback(async () => {
    try {
      const items = await getTrashItems();
      setTrashCount(items.length);
    } catch {
      setTrashCount(0);
    }
  }, []);

  React.useEffect(() => {
    reloadTrashCount();
  }, [reloadTrashCount, activeTab]);

  // Load and apply theme config
  React.useEffect(() => {
    loadThemeConfig().then((cfg) => {
      setThemeMode(cfg.mode);
      applyThemeConfig(cfg);
    });
  }, []);

  const handleToggleThemeMode = async () => {
    const nextMode: 'dark' | 'light' | 'system' =
      themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light';
    setThemeMode(nextMode);
    const cfg = await loadThemeConfig();
    cfg.mode = nextMode;
    await saveThemeConfig(cfg);
  };

  const send = (type: string) => browser.runtime.sendMessage({ type });

  React.useEffect(() => {
    send('status')
      .then((s: SyncStatus) => setStatus(s))
      .catch(() => {});
  }, []);

  const onSync = async () => {
    setSyncing(true);
    try {
      const res = await send('sync');
      setStatus(res as SyncStatus);
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

  return (
    <div className="flex h-screen w-full bg-[var(--color-background)] text-[var(--color-foreground)] overflow-hidden">
      {/* Left Sidebar */}
      <aside
        className={cn(
          'border-r border-[var(--color-border)] bg-[var(--color-card)] p-3.5 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none transition-all duration-300 z-20',
          sidebarCollapsed ? 'w-[68px] items-center px-2' : 'w-60'
        )}
      >
        <div className={cn('space-y-6 w-full flex flex-col', sidebarCollapsed && 'items-center')}>
          {/* Sidebar Top: Header Logo & Collapse Toggle */}
          <SidebarHeader
            collapsed={sidebarCollapsed}
            themeMode={themeMode}
            onToggleCollapse={toggleSidebarCollapse}
          />

          {/* Navigation Menu */}
          <nav className={cn('space-y-1 w-full flex flex-col', sidebarCollapsed && 'items-center')}>
            <SidebarNavItem
              icon={<LayoutDashboard className="h-4.5 w-4.5" />}
              label={t('navDashboard')}
              isActive={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
              collapsed={sidebarCollapsed}
            />
            <SidebarNavItem
              icon={<Bookmark className="h-4.5 w-4.5" />}
              label={t('navBookmark')}
              isActive={activeTab === 'bookmark'}
              onClick={() => setActiveTab('bookmark')}
              collapsed={sidebarCollapsed}
            />
            <SidebarNavItem
              icon={<FolderGit2 className="h-4.5 w-4.5" />}
              label={t('navOrganize')}
              isActive={activeTab === 'organize'}
              onClick={() => setActiveTab('organize')}
              collapsed={sidebarCollapsed}
            />
          </nav>
        </div>

        {/* Sidebar Profile & Sync Box */}
        <div className={cn('space-y-3 w-full flex flex-col', sidebarCollapsed && 'items-center')}>
          {/* Tong Sampah Button (Placed directly above Profile Box) */}
          <SidebarNavItem
            icon={<Trash2 className="h-4.5 w-4.5" />}
            label={t('navTrash')}
            isActive={activeTab === 'trash'}
            onClick={() => setActiveTab('trash')}
            collapsed={sidebarCollapsed}
            badge={
              trashCount > 0 ? (
                sidebarCollapsed ? (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                    {trashCount > 99 ? '99+' : trashCount}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[11px] font-mono font-bold">
                    {trashCount}
                  </span>
                )
              ) : undefined
            }
          />

          <SidebarProfileCard
            collapsed={sidebarCollapsed}
            avatarDataUri={avatarDataUri}
            deviceLabel={deviceLabel}
            lastSyncText={formatLastSync(status.lastSync)}
            syncing={syncing}
            onSync={onSync}
          />

          <SidebarFooter
            collapsed={sidebarCollapsed}
            themeMode={themeMode}
            onOpenSettings={() => setShowSettings(true)}
            onToggleTheme={handleToggleThemeMode}
          />
        </div>
      </aside>

      {/* Main Content Layout Panel */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Single Persistent Header Component Overlay */}
        <Header
          activeTab={activeTab}
          onOpenWidgetSettings={() => setShowWidgetSettings(true)}
        />

        {/* Tab View Container */}
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
          {activeTab === 'dashboard' ? (
            <DashboardView
              totalBookmarksCount={totalLocalCount}
              totalFoldersCount={totalFolderCount}
              directLinksCount={directLinksCount}
              syncStatus={status}
              manageWidgetModalOpen={showWidgetSettings}
              onManageWidgetModalChange={setShowWidgetSettings}
            />
          ) : activeTab === 'bookmark' ? (
            <BookmarkView
              query={query}
              setQuery={setQuery}
              filter={filter}
              setFilter={setFilter}
            />
          ) : activeTab === 'organize' ? (
            <BookmarkManagementView />
          ) : (
            <TrashView onTrashChange={reloadTrashCount} />
          )}
        </div>
      </div>

      <SettingsModal
        open={showSettings}
        onOpenChange={setShowSettings}
        onLabelChange={setDeviceLabel}
        onLogout={handleLogout}
      />
    </div>
  );
}
