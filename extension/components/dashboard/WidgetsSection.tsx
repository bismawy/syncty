import * as React from 'react';
import {
  FileText,
  Clock,
  BarChart3,
  Bookmark,
  Folder,
  Link as LinkIcon,
  RefreshCw,
  GripVertical,
  CheckSquare,
  Quote as QuoteIcon,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Globe,
  Settings2,
  Search,
  BookOpen,
  Radio,
  Volume2,
  VolumeX,
  Waves,
  Loader2,
  ChevronDown,
  Copy,
  Check,
  X,
} from 'lucide-react';

function playChimeSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch {}
}

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DashboardCard } from './DashboardCard';
import { TopSitesWidget, FavoriteSitesWidget } from './TopAndFavoriteSites';
import { HijriCalendarWidget } from './HijriCalendarWidget';
import { StatusBadge } from '@/components/ui/status-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatSyncAgo } from '@/lib/utils';
import type { SyncStatus } from '@/lib/types';
import { useTranslation, type TranslationKey, type Language } from '@/lib/i18n';

export interface WidgetConfig {
  id: string;
  nameKey: TranslationKey;
  enabled: boolean;
}

const DEFAULT_WIDGET_CONFIGS: WidgetConfig[] = [
  { id: 'topSites', nameKey: 'widgetTopSitesTitle', enabled: true },
  { id: 'favoriteSites', nameKey: 'widgetFavoriteSitesTitle', enabled: true },
  { id: 'clock', nameKey: 'widgetClockTitle', enabled: true },
  { id: 'stats', nameKey: 'widgetStatsTitle', enabled: true },
  { id: 'notes', nameKey: 'widgetNotesTitle', enabled: false },
  { id: 'todo', nameKey: 'widgetTodoTitle', enabled: false },
  { id: 'quote', nameKey: 'widgetQuoteTitle', enabled: false },
  { id: 'islamicQuote', nameKey: 'widgetIslamicQuoteTitle', enabled: false },
  { id: 'quranRadio', nameKey: 'widgetQuranRadioTitle', enabled: false },
  { id: 'natureRadio', nameKey: 'widgetNatureRadioTitle', enabled: false },
  { id: 'pomodoro', nameKey: 'widgetPomodoroTitle', enabled: false },
  { id: 'worldClock', nameKey: 'widgetWorldClockTitle', enabled: false },
  { id: 'hijriCalendar', nameKey: 'widgetHijriCalendarTitle', enabled: false },
];

const DEFAULT_ORDER = DEFAULT_WIDGET_CONFIGS.map((w) => w.id);
const DEFAULT_NAME_KEYS = new Map(DEFAULT_WIDGET_CONFIGS.map((w) => [w.id, w.nameKey]));

export type WidgetCategoryId = 'timeProductivity' | 'sitesNavigation' | 'islamicInspiration';

export interface WidgetCategoryDef {
  id: WidgetCategoryId;
  titleKey: TranslationKey;
  widgetIds: string[];
}

export const WIDGET_CATEGORIES: WidgetCategoryDef[] = [
  {
    id: 'timeProductivity',
    titleKey: 'catTimeProductivity',
    widgetIds: ['clock', 'worldClock', 'pomodoro', 'todo', 'notes'],
  },
  {
    id: 'sitesNavigation',
    titleKey: 'catSitesNavigation',
    widgetIds: ['topSites', 'favoriteSites', 'stats'],
  },
  {
    id: 'islamicInspiration',
    titleKey: 'catIslamicInspiration',
    widgetIds: ['hijriCalendar', 'islamicQuote', 'quranRadio', 'quote', 'natureRadio'],
  },
];

export function WidgetsSection({
  totalBookmarksCount,
  totalFoldersCount = 0,
  directLinksCount = 0,
  syncStatus,
  manageModalOpen = false,
  onManageModalChange,
}: {
  totalBookmarksCount: number;
  totalFoldersCount?: number;
  directLinksCount?: number;
  syncStatus: SyncStatus;
  manageModalOpen?: boolean;
  onManageModalChange?: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [configs, setConfigs] = React.useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem('syntive.widgetConfigs');
    if (saved) {
      try {
        const parsed: any[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map((w) => w.id));
        const merged = parsed
          .filter((w) => w.id !== 'quicklinks')
          .map((w) => {
            const nameKey = DEFAULT_NAME_KEYS.get(w.id);
            return nameKey ? { ...w, nameKey } : w;
          });

        DEFAULT_WIDGET_CONFIGS.forEach((def) => {
          if (!existingIds.has(def.id)) {
            merged.push(def);
          }
        });
        return merged;
      } catch {
        // fallback
      }
    }
    return DEFAULT_WIDGET_CONFIGS;
  });

  const [widgetOrder, setWidgetOrder] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('syntive.widgetOrder');
    if (saved) {
      try {
        const parsed: string[] = JSON.parse(saved);
        const filtered = parsed.filter((id) => id !== 'quicklinks');
        DEFAULT_ORDER.forEach((id) => {
          if (!filtered.includes(id)) filtered.push(id);
        });
        return filtered;
      } catch {
        // fallback
      }
    }
    return DEFAULT_ORDER;
  });

  const [localManageModal, setLocalManageModal] = React.useState(false);
  const showManageModal = manageModalOpen || localManageModal;
  const setShowManageModal = (val: boolean) => {
    setLocalManageModal(val);
    onManageModalChange?.(val);
  };

  const [searchQuery, setSearchQuery] = React.useState('');
  const [openCategories, setOpenCategories] = React.useState<Record<string, boolean>>({
    timeProductivity: true,
    sitesNavigation: true,
    islamicInspiration: true,
  });

  const toggleCategory = (catId: string) => {
    setOpenCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  React.useEffect(() => {
    localStorage.setItem('syntive.widgetConfigs', JSON.stringify(configs));
  }, [configs]);

  React.useEffect(() => {
    localStorage.setItem('syntive.widgetOrder', JSON.stringify(widgetOrder));
  }, [widgetOrder]);

  const toggleWidget = (id: string) => {
    setConfigs((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(String(active.id));
        const newIndex = items.indexOf(String(over.id));
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const isEnabled = (id: string) => configs.find((w) => w.id === id)?.enabled ?? false;

  const activeWidgetIds = widgetOrder.filter((id) => isEnabled(id));

  const renderWidgetContent = (
    id: string,
    dragHandleProps: { attributes: any; listeners: any }
  ) => {
    const dragHandle = (
      <button
        {...dragHandleProps.attributes}
        {...dragHandleProps.listeners}
        className="p-1 rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] cursor-grab active:cursor-grabbing shrink-0 transition-colors"
        title={t('dragWidgetTooltip')}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
    );

    switch (id) {
      case 'topSites':
        return <TopSitesWidget dragHandle={dragHandle} />;
      case 'favoriteSites':
        return <FavoriteSitesWidget dragHandle={dragHandle} />;
      case 'clock':
        return <ClockWidget dragHandle={dragHandle} />;
      case 'notes':
        return <NotesWidget dragHandle={dragHandle} />;
      case 'stats':
        return (
          <StatsWidget
            totalBookmarks={totalBookmarksCount}
            totalFolders={totalFoldersCount}
            directLinks={directLinksCount}
            syncStatus={syncStatus}
            dragHandle={dragHandle}
          />
        );
      case 'todo':
        return <TodoWidget dragHandle={dragHandle} />;
      case 'quote':
        return <QuoteWidget dragHandle={dragHandle} />;
      case 'islamicQuote':
        return <IslamicQuoteWidget dragHandle={dragHandle} />;
      case 'quranRadio':
        return <QuranRadioWidget dragHandle={dragHandle} />;
      case 'natureRadio':
        return <NatureRadioWidget dragHandle={dragHandle} />;
      case 'pomodoro':
        return <PomodoroWidget dragHandle={dragHandle} />;
      case 'worldClock':
        return <WorldClockWidget dragHandle={dragHandle} />;
      case 'hijriCalendar':
        return <HijriCalendarWidget dragHandle={dragHandle} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full mt-8 pt-2 mb-2">
      {activeWidgetIds.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={activeWidgetIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5 items-stretch">
              {activeWidgetIds.map((id) => (
                <SortableWidgetWrapper key={id} id={id}>
                  {({ attributes, listeners }) =>
                    renderWidgetContent(id, { attributes, listeners })
                  }
                </SortableWidgetWrapper>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center text-xs text-[var(--color-muted-foreground)]">
          {t('allWidgetsDisabled')}
        </div>
      )}

      {/* Modal Manage Widgets */}
      <Dialog open={showManageModal} onOpenChange={setShowManageModal}>
        <DialogContent className="sm:max-w-md bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-foreground)] p-6 space-y-4 rounded-2xl shadow-xl">
          <DialogHeader className="pb-0 space-y-1">
            <DialogTitle className="text-base font-semibold">{t('widgetSettingsModalTitle')}</DialogTitle>
            <p className="text-[11px] text-[var(--color-muted-foreground)]">
              {t('widgetSettingsModalDesc')}
            </p>
          </DialogHeader>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-muted-foreground)] pointer-events-none" />
            <Input
              type="text"
              placeholder={t('searchWidgetsPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 text-xs h-9 bg-[var(--color-card-inner)] border-[var(--color-border)] focus:ring-1 focus:ring-[var(--color-primary)] placeholder:text-[var(--color-muted-foreground)] rounded-lg"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[var(--color-accent)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Categorized Widgets Accordion List */}
          <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar py-1">
            {(() => {
              const query = searchQuery.trim().toLowerCase();
              let visibleCategoryCount = 0;

              const categoriesMarkup = WIDGET_CATEGORIES.map((category) => {
                const categoryWidgets = category.widgetIds
                  .map((id) => configs.find((w) => w.id === id))
                  .filter((w): w is WidgetConfig => Boolean(w))
                  .filter((w) => {
                    if (!query) return true;
                    return t(w.nameKey).toLowerCase().includes(query);
                  });

                if (categoryWidgets.length === 0) return null;
                visibleCategoryCount++;

                const isExpanded = query ? true : Boolean(openCategories[category.id]);
                const enabledCount = categoryWidgets.filter((w) => w.enabled).length;

                return (
                  <div
                    key={category.id}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-inner)] overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-[var(--color-card-inner)] hover:bg-[var(--color-accent)]/40 text-left transition-colors select-none"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          className={`h-4 w-4 text-[var(--color-muted-foreground)] transition-transform duration-200 ${
                            isExpanded ? 'rotate-0' : '-rotate-90'
                          }`}
                        />
                        <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--color-foreground)]">
                          {t(category.titleKey)}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--color-accent)] text-[var(--color-muted-foreground)]">
                        {enabledCount}/{categoryWidgets.length} aktif
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)] bg-[var(--color-card)]/50">
                        {categoryWidgets.map((widget) => (
                          <div
                            key={widget.id}
                            onClick={() => toggleWidget(widget.id)}
                            className="flex items-center justify-between px-4 py-2.5 text-xs select-none hover:bg-[var(--color-accent)]/30 transition-colors cursor-pointer"
                          >
                            <span className="font-medium text-xs text-[var(--color-foreground)] tracking-tight">
                              {t(widget.nameKey)}
                            </span>
                            <Checkbox
                              checked={widget.enabled}
                              onCheckedChange={() => toggleWidget(widget.id)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              });

              if (visibleCategoryCount === 0) {
                return (
                  <div className="p-8 text-center text-xs text-[var(--color-muted-foreground)] border border-dashed border-[var(--color-border)] rounded-xl">
                    {t('noWidgetsFound')}
                  </div>
                );
              }

              return categoriesMarkup;
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableWidgetWrapper({
  id,
  children,
}: {
  id: string;
  children: (props: { attributes: any; listeners: any }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="h-full">
      {children({ attributes, listeners })}
    </div>
  );
}

// 1. Clock Widget
function ClockWidget({ dragHandle }: { dragHandle: React.ReactNode }) {
  const { t, language } = useTranslation();
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hours = time.getHours();
    if (hours >= 5 && hours < 11) return t('greetingMorning');
    if (hours >= 11 && hours < 15) return t('greetingNoon');
    if (hours >= 15 && hours < 18) return t('greetingAfternoon');
    return t('greetingNight');
  };

  const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = time.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <DashboardCard
      title={t('widgetClockTitle')}
      icon={<Clock className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] shrink-0" />}
      headerAction={dragHandle}
      minHeight="h-[234px]"
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center py-2 h-full gap-4">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-[var(--color-accent)] border border-[var(--color-border)]/60 text-xs font-semibold text-[var(--color-foreground)] shadow-xs">
            {getGreeting()}
          </span>
        </div>
        <h3 className="text-4xl md:text-5xl font-extrabold text-[var(--color-foreground)] tracking-tight font-sans leading-none">
          {formattedTime}
        </h3>
        <p className="text-xs text-[var(--color-muted-foreground)] font-medium truncate leading-none">
          {formattedDate}
        </p>
      </div>
    </DashboardCard>
  );
}

// 2. Quick Notes Widget
function NotesWidget({ dragHandle }: { dragHandle: React.ReactNode }) {
  const { t } = useTranslation();
  const [notes, setNotes] = React.useState(() => {
    return localStorage.getItem('syntive.quickNotes') || '';
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    localStorage.setItem('syntive.quickNotes', val);
  };

  return (
    <DashboardCard
      title={t('widgetNotesTitle')}
      icon={<FileText className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] shrink-0" />}
      headerBadge={t('autoSavedBadge')}
      headerAction={dragHandle}
      minHeight="h-[234px]"
    >
      <div className="flex-1 flex flex-col pt-0 h-full">
        <textarea
          value={notes}
          onChange={handleChange}
          placeholder={t('notesPlaceholder')}
          className="card-inner-box w-full flex-1 p-3 text-xs text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)] focus:outline-none focus:border-[var(--color-ring)] resize-none min-h-[140px]"
        />
      </div>
    </DashboardCard>
  );
}

// 3. Stats Widget
function StatsWidget({
  totalBookmarks,
  totalFolders,
  directLinks,
  syncStatus,
  dragHandle,
}: {
  totalBookmarks: number;
  totalFolders: number;
  directLinks: number;
  syncStatus: SyncStatus;
  dragHandle: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <DashboardCard
      title={t('widgetStatsTitle')}
      icon={<BarChart3 className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] shrink-0" />}
      headerAction={dragHandle}
      minHeight="h-[234px]"
    >
      <div className="flex-1 pt-0 flex flex-col justify-between h-full">
        <div className="grid grid-cols-2 gap-2.5 w-full h-full">
          <div className="card-inner-box p-3 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted-foreground)]">
              <Bookmark className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] shrink-0" />
              <span className="truncate">{t('totalLabel')}</span>
            </div>
            <span className="text-xl font-bold text-[var(--color-foreground)] tracking-tight">
              {totalBookmarks}
            </span>
          </div>

          <div className="card-inner-box p-3 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted-foreground)]">
              <Folder className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] shrink-0" />
              <span className="truncate">{t('foldersLabel')}</span>
            </div>
            <span className="text-xl font-bold text-[var(--color-foreground)] tracking-tight">
              {totalFolders}
            </span>
          </div>

          <div className="card-inner-box p-3 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted-foreground)]">
              <LinkIcon className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] shrink-0" />
              <span className="truncate">{t('directLinksLabel')}</span>
            </div>
            <span className="text-xl font-bold text-[var(--color-foreground)] tracking-tight">
              {directLinks}
            </span>
          </div>

          <div className="card-inner-box p-3 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted-foreground)]">
              <RefreshCw className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] shrink-0" />
              <span className="truncate">{t('syncLabel')}</span>
            </div>
            <span className="text-xs font-semibold text-[var(--color-foreground)] truncate">
              {syncStatus.lastSync ? formatSyncAgo(t, syncStatus.lastSync) : t('syncNever')}
            </span>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

// 4. Todo List Widget
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

function TodoWidget({ dragHandle }: { dragHandle: React.ReactNode }) {
  const { t } = useTranslation();
  const [todos, setTodos] = React.useState<TodoItem[]>(() => {
    const saved = localStorage.getItem('syntive.todoItems');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [
      { id: '1', text: 'Periksa bookmark penting', completed: true },
      { id: '2', text: 'Singkronkan perangkat', completed: false },
    ];
  });
  const [inputText, setInputText] = React.useState('');

  React.useEffect(() => {
    localStorage.setItem('syntive.todoItems', JSON.stringify(todos));
  }, [todos]);

  const handleAdd = () => {
    if (!inputText.trim()) return;
    setTodos((prev) => [
      ...prev,
      { id: Date.now().toString(), text: inputText.trim(), completed: false },
    ]);
    setInputText('');
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const removeTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <DashboardCard
      title={t('widgetTodoTitle')}
      icon={<CheckSquare className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] shrink-0" />}
      headerBadge={`${completedCount}/${todos.length}`}
      headerAction={dragHandle}
      minHeight="h-[234px]"
    >
      <div className="flex-1 flex flex-col justify-between pt-0 h-full space-y-2">
        <div className="flex items-center gap-1.5">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={t('addTaskPlaceholder')}
            className="h-7 text-xs bg-[var(--color-background)] border-[var(--color-border)] focus:border-[var(--color-ring)]"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="h-7 px-2.5 rounded-lg bg-[var(--color-accent)] border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/80 transition-colors flex items-center justify-center shrink-0 cursor-pointer text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5 text-[var(--color-foreground)]" />
          </button>
        </div>

        <div className="card-inner-box flex-1 overflow-y-auto max-h-[125px] p-2 divide-y divide-[var(--color-border)]/60">
          {todos.length === 0 ? (
            <p className="text-[11px] text-[var(--color-muted-foreground)] text-center py-4">
              {t('noTasks')}
            </p>
          ) : (
            todos.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-1.5 px-1 group text-xs select-none"
              >
                <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => toggleTodo(item.id)}
                  />
                  <span
                    className={`truncate text-xs ${
                      item.completed
                        ? 'line-through text-[var(--color-muted-foreground)]'
                        : 'text-[var(--color-foreground)] font-medium'
                    }`}
                  >
                    {item.text}
                  </span>
                </label>
                <button
                  onClick={() => removeTodo(item.id)}
                  className="text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 ml-1 shrink-0 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardCard>
  );
}

// 5. Motivational Quote Widget
const MOTIVATIONAL_QUOTES: Record<Language, { text: string; author: string }[]> = {
  id: [
    { text: 'Cara terbaik untuk memprediksi masa depan adalah dengan menciptakannya.', author: 'Peter Drucker' },
    { text: 'Kreativitas adalah kecerdasan yang sedang bersenang-senang.', author: 'Albert Einstein' },
    { text: 'Kesederhanaan adalah kunci dari segala keanggunan sejati.', author: 'Coco Chanel' },
    { text: 'Fokus pada proses, bukan sekadar hasil akhir.', author: 'Anonim' },
    { text: 'Rahasia untuk maju adalah dengan memulai.', author: 'Mark Twain' },
    { text: 'Setiap perjalanan ribuan mil selalu dimulai dengan satu langkah pertama.', author: 'Lao Tzu' },
    { text: 'Kegagalan adalah satu-satunya kesempatan untuk memulai lagi dengan lebih cerdas.', author: 'Henry Ford' },
    { text: 'Investasi terbaik yang bisa kamu lakukan adalah investasi pada dirimu sendiri.', author: 'Warren Buffett' },
    { text: 'Jangan menunggu kesempatan, ciptakanlah kesempatan itu.', author: 'George Bernard Shaw' },
  ],
  en: [
    { text: 'The best way to predict the future is to create it.', author: 'Peter Drucker' },
    { text: 'Creativity is intelligence having fun.', author: 'Albert Einstein' },
    { text: 'Simplicity is the keynote of all true elegance.', author: 'Coco Chanel' },
    { text: 'Focus on the process, not just the outcome.', author: 'Anonymous' },
    { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
    { text: 'A journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
    { text: 'Failure is simply the opportunity to begin again, this time more intelligently.', author: 'Henry Ford' },
    { text: 'The best investment you can make is an investment in yourself.', author: 'Warren Buffett' },
    { text: 'Do not wait for opportunity, create it.', author: 'George Bernard Shaw' },
  ],
};

async function fetchMotivationalQuoteApi(lang: Language): Promise<{ text: string; author: string } | null> {
  if (lang === 'id') {
    try {
      const url = `https://quotes.liupurnomo.com/api/quotes/random?_t=${Date.now()}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(2200) });

      if (!res.ok) return null;
      const json = await res.json();
      if (json.status === 'SUCCESS' && json.data?.text && json.data?.author) {
        return {
          text: json.data.text,
          author: json.data.author,
        };
      }
    } catch {
      // fallback
    }
  }
  return null;
}

// 6. Islamic Wisdom Widget
const ISLAMIC_QUOTES: Record<Language, { text: string; author: string; source: string }[]> = {
  id: [
    {
      text: 'Barangsiapa menempuh jalan untuk menuntut ilmu, maka Allah akan mudahkan baginya jalan menuju surga.',
      author: 'Rasulullah ﷺ',
      source: 'HR. Muslim no. 2699',
    },
    {
      text: 'Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lainnya.',
      author: 'Rasulullah ﷺ',
      source: 'HR. Thabrani, Shahihul Jami’ no. 3289',
    },
    {
      text: 'Senyummu di hadapan saudaramu adalah sedekah bagimu.',
      author: 'Rasulullah ﷺ',
      source: 'HR. Tirmidzi no. 1956',
    },
    {
      text: 'Perbaikilah rahasiamu (hatimu), niscaya Allah akan memperbaiki terang-teranganmu (amalan lahiriahmu).',
      author: 'Umar bin Khattab RA',
      source: 'Hilyatul Auliya 1/54',
    },
    {
      text: 'Ilmu itu lebih baik daripada harta. Ilmu menjagamu, sedangkan engkau menjaga harta.',
      author: 'Ali bin Abi Thalib RA',
      source: 'Jami’ Bayanul ‘Ilmi 1/61',
    },
    {
      text: 'Jika engkau merasa hatimu keras, maka beri makanlah orang miskin dan usaplah kepala anak yatim.',
      author: 'Hasan al-Basri',
      source: 'Al-Zuhd karya Ahmad no. 1530',
    },
    {
      text: 'Barangsiapa yang menginginkan dunia hendaklah dengan ilmu, dan barangsiapa menginginkan akhirat hendaklah dengan ilmu.',
      author: 'Imam Syafi’i',
      source: 'Diwan Asy-Syafi’i',
    },
    {
      text: 'Waktu yang paling sia-sia adalah waktu yang tidak digunakan untuk mengingat Allah atau menuntut ilmu.',
      author: 'Ibnul Qayyim Al-Jauziyyah',
      source: 'Al-Fawaid hal. 44',
    },
  ],
  en: [
    {
      text: 'Whoever travels a path in search of knowledge, Allah will make easy for him a path to Paradise.',
      author: 'Prophet Muhammad ﷺ',
      source: 'Sahih Muslim no. 2699',
    },
    {
      text: 'The best of people are those who are most beneficial to others.',
      author: 'Prophet Muhammad ﷺ',
      source: 'Narrated by At-Tabarani',
    },
    {
      text: 'Your smile for your brother is charity for you.',
      author: 'Prophet Muhammad ﷺ',
      source: 'Sunan at-Tirmidhi no. 1956',
    },
    {
      text: 'Purify your private life, and Allah will purify your public life.',
      author: 'Umar bin Al-Khattab',
      source: 'Hilyatul Auliya 1/54',
    },
    {
      text: 'Knowledge is better than wealth. Knowledge protects you, while you protect wealth.',
      author: 'Ali bin Abi Talib',
      source: 'Jami’ Bayanul ‘Ilmi 1/61',
    },
    {
      text: 'If you feel your heart is hard, feed the poor and stroke the head of an orphan.',
      author: 'Hasan al-Basri',
      source: 'Al-Zuhd by Ahmad no. 1530',
    },
    {
      text: 'Whoever desires this world must seek knowledge, and whoever desires the hereafter must seek knowledge.',
      author: 'Imam Ash-Shafi’i',
      source: 'Diwan Ash-Shafi’i',
    },
    {
      text: 'The most wasted time is that which is not spent in remembering Allah or seeking knowledge.',
      author: 'Ibn al-Qayyim',
      source: 'Al-Fawaid p. 44',
    },
  ],
};

async function fetchShortHadithApi(lang: Language): Promise<{ text: string; author: string; source: string } | null> {
  if (lang !== 'id') return null;

  const MAX_ATTEMPTS = 3;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const url = `https://api.myquran.com/v3/hadis/enc/random?_t=${Date.now()}_${attempt}`;

      const res = await fetch(url, { signal: AbortSignal.timeout(2200) });

      if (!res.ok) continue;
      const json = await res.json();
      const item = json?.data;
      const rawText = item?.text?.id;
      if (!rawText) continue;

      let cleanText = rawText
        .replace(/\[.*?\]/g, '')
        .replace(/^[;\s:,"'\-\.\u201c\u201d\u2018\u2019]+/g, '')
        .replace(/[;\s,"'\-\.\u201c\u201d\u2018\u2019]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanText.length > 0) {
        cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
      }

      if (cleanText.length >= 15) {
        let takhrij = item?.takhrij || 'Hadits Riwayat';
        takhrij = takhrij
          .replace(/^رواه\s*/i, 'HR. ')
          .replace(/Diriwayatkan oleh\s*/gi, 'HR. ')
          .replace(/\s*dengan\s+(dua\s+)?riwayatnya.*/gi, '')
          .replace(/\s*dan\s+lafaz.*$/gi, '')
          .replace(/\s*-\s*HR\.\s*/gi, ', ')
          .replace(/\s*-\s*/g, ', ')
          .replace(/HR\.\s*HR\./g, 'HR.')
          .trim();

        return {
          text: cleanText,
          author: 'Rasulullah ﷺ',
          source: takhrij,
        };
      }
    } catch {
      // fallback
    }
  }
  return null;
}

// Shared Base Quote Widget Component (Center-aligned layout for Quotes & Hadiths)
interface BaseQuoteWidgetProps {
  title: React.ReactNode;
  icon: React.ReactNode;
  dragHandle: React.ReactNode;
  onRefresh: () => void;
  isLoading: boolean;
  text: string;
  author: string;
  source?: string;
  category?: string;
  showQuotes?: boolean;
}

function BaseQuoteWidget({
  title,
  icon,
  dragHandle,
  onRefresh,
  isLoading,
  text,
  author,
  source,
  category,
  showQuotes = false,
}: BaseQuoteWidgetProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    const fullText = showQuotes
      ? `"${text}" — ${author}${source ? ` | ${source}` : ''}`
      : `${text} — ${author}${source ? ` | ${source}` : ''}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardCard
      title={title}
      icon={icon}
      headerAction={
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className="p-1 rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors cursor-pointer"
            title="Salin Teks"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1 rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors cursor-pointer"
            title={t('nextQuote')}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {dragHandle}
        </div>
      }
      minHeight="h-[234px]"
      contentClassName="p-3.5 pt-2 flex flex-col justify-between h-full min-h-0 relative"
    >
      {/* Quote Content with Skeleton Loader */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-2.5 animate-pulse w-full px-4 my-auto py-4">
          <div className="h-3.5 bg-[var(--color-muted)]/50 rounded-full w-11/12"></div>
          <div className="h-3.5 bg-[var(--color-muted)]/50 rounded-full w-9/12"></div>
          <div className="h-3.5 bg-[var(--color-muted)]/50 rounded-full w-7/12"></div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center min-h-0 relative my-auto">
          <div className="overflow-y-auto max-h-[145px] w-full px-1 custom-scrollbar my-auto">
            <p className="text-[13px] md:text-[13.5px] text-[var(--color-foreground)] leading-relaxed select-text tracking-wide text-center py-1 font-normal">
              {showQuotes ? `"${text}"` : text}
            </p>
          </div>
          {/* Bottom Inset Shadow / Gradient Fade */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[var(--color-card)] to-transparent opacity-80" />
        </div>
      )}

      {/* Footer Meta Details - Single Centered Line with | separator */}
      <div className="flex items-center justify-center gap-1.5 pt-1 mt-0.5 w-full shrink-0 relative z-10 text-center flex-wrap">
        <span className="text-[11px] font-semibold text-[var(--color-foreground)] tracking-wide">
          {author}
        </span>

        {category && (
          <>
            <span className="text-[11px] text-[var(--color-muted-foreground)]/60">|</span>
            <span className="text-[9.5px] text-[var(--color-muted-foreground)] font-mono bg-[var(--color-secondary)]/80 border border-[var(--color-border)]/40 px-1.5 py-0.5 rounded capitalize">
              {category}
            </span>
          </>
        )}

        {source && (
          <>
            <span className="text-[11px] text-[var(--color-muted-foreground)]/60">|</span>
            <span className="text-[10px] text-[var(--color-muted-foreground)] font-mono truncate max-w-[180px]" title={source}>
              {source}
            </span>
          </>
        )}
      </div>
    </DashboardCard>
  );
}

// Shared quote-loading hook: try the live API, fall back to a random local quote.
// Auto-loads on mount and refreshes every 5 minutes.
function useRandomQuote<T>(fetcher: (lang: Language) => Promise<T | null>, list: T[], language: Language) {
  const [current, setCurrent] = React.useState<T>(() => list[Math.floor(Math.random() * list.length)]);
  const [loading, setLoading] = React.useState(false);

  const loadNext = React.useCallback(async () => {
    setLoading(true);
    const apiQuote = await fetcher(language);
    setCurrent(apiQuote ?? list[Math.floor(Math.random() * list.length)]);
    setLoading(false);
  }, [fetcher, language, list]);

  React.useEffect(() => {
    loadNext();
  }, [loadNext]);

  React.useEffect(() => {
    const timer = setInterval(loadNext, 300000); // 5 minutes
    return () => clearInterval(timer);
  }, [loadNext]);

  return { current, loading, loadNext };
}

function QuoteWidget({ dragHandle }: { dragHandle: React.ReactNode }) {
  const { t, language } = useTranslation();
  const fallbackList = MOTIVATIONAL_QUOTES[language] || MOTIVATIONAL_QUOTES.id;
  const { current, loading, loadNext } = useRandomQuote(fetchMotivationalQuoteApi, fallbackList, language);

  return (
    <BaseQuoteWidget
      title={t('widgetQuoteTitle')}
      icon={<QuoteIcon className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] shrink-0" />}
      dragHandle={dragHandle}
      onRefresh={loadNext}
      isLoading={loading}
      text={current.text}
      author={current.author}
      category={(current as { category?: string }).category}
      showQuotes={true}
    />
  );
}

function IslamicQuoteWidget({ dragHandle }: { dragHandle: React.ReactNode }) {
  const { t, language } = useTranslation();
  const fallbackList = ISLAMIC_QUOTES[language] || ISLAMIC_QUOTES.id;
  const { current, loading, loadNext } = useRandomQuote(fetchShortHadithApi, fallbackList, language);

  return (
    <BaseQuoteWidget
      title={t('widgetIslamicQuoteTitle')}
      icon={<BookOpen className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] shrink-0" />}
      dragHandle={dragHandle}
      onRefresh={loadNext}
      isLoading={loading}
      text={current.text}
      author={current.author}
      source={current.source}
      showQuotes={false}
    />
  );
}

// Dot Linear Spectrum Audio Visualizer Component (Matching Wireframe)
function DotLinearSpectrum({ isPlaying, color = 'emerald' }: { isPlaying: boolean; color?: 'emerald' | 'sky' }) {
  const bars = [40, 75, 30, 90, 50, 100, 60, 85, 45, 95, 35, 70, 55, 90, 40, 80, 60, 30];
  const activeBg = color === 'emerald' ? 'bg-emerald-500' : 'bg-sky-500';

  return (
    <div className="flex-1 flex items-center justify-between gap-[3px] h-6 px-2 overflow-hidden">
      {bars.map((h, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all duration-300 ${
            isPlaying ? `${activeBg} animate-pulse` : 'bg-[var(--color-muted-foreground)] opacity-25'
          }`}
          style={{
            height: isPlaying ? `${h}%` : '15%',
            animationDelay: isPlaying ? `${(i % 5) * 0.15}s` : '0s',
            animationDuration: isPlaying ? `${0.4 + (i % 4) * 0.2}s` : '0s',
          }}
        />
      ))}
    </div>
  );
}

// 7. Quran Radio Widget (Nama Lengkap dengan Gelar Syaikh + Wireframe Audio Pill & Dot Linear Spectrum)
const QURAN_QARIS = [
  { id: 'afasy', name: 'Syaikh Mishary Rashid Al-Afasy', stream: 'https://backup.qurango.net/radio/mishary_alafasi' },
  { id: 'sudais', name: 'Syaikh Abdul Rahman Al-Sudais', stream: 'https://backup.qurango.net/radio/abdulrahman_alsudaes' },
  { id: 'ghamdi', name: 'Syaikh Saad Al-Ghamdi', stream: 'https://backup.qurango.net/radio/saad_alghamdi' },
  { id: 'maher', name: 'Syaikh Maher Al-Muaiqly', stream: 'https://backup.qurango.net/radio/maher' },
  { id: 'dosari', name: 'Syaikh Yasser Al-Dosari', stream: 'https://backup.qurango.net/radio/yasser_aldosari' },
  { id: 'bin_taleb', name: 'Syaikh Ahmad bin Taleb', stream: 'https://backup.qurango.net/radio/a_binhameed' },
  { id: 'baleela', name: 'Syaikh Bandar Baleela', stream: 'https://backup.qurango.net/radio/bandar_balilah' },
  { id: 'cairo', name: 'Radio Al-Quran Utama 24/7', stream: 'https://backup.qurango.net/radio/mix' },
];

const QURAN_RADIO_STORAGE_KEY = 'syntive.quranRadioQari';

// Persistent Module-Level Audio Singleton for Quran Radio
let globalQuranAudio: HTMLAudioElement | null = null;
let globalQuranIsPlaying = false;
let globalQuranIsLoading = false;
let globalQuranVolume = 0.2;
let globalQuranIsMuted = false;
let globalQuranSelectedId = (() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(QURAN_RADIO_STORAGE_KEY);
    if (saved && QURAN_QARIS.some((q) => q.id === saved)) {
      return saved;
    }
  }
  return 'afasy';
})();

// Exactly one widget instance exists at a time — a single listener slot suffices.
let onQuranChange: (() => void) | null = null;
function notifyQuranSubscribers() {
  onQuranChange?.();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (globalQuranAudio) {
      globalQuranAudio.pause();
      globalQuranAudio.removeAttribute('src');
      globalQuranAudio.load();
      globalQuranAudio = null;
    }
  });
}

function stopGlobalQuranAudio() {
  if (globalQuranAudio) {
    globalQuranAudio.pause();
    globalQuranAudio.removeAttribute('src');
    globalQuranAudio.load();
    globalQuranAudio = null;
  }
  globalQuranIsPlaying = false;
  globalQuranIsLoading = false;
  notifyQuranSubscribers();
}

function playGlobalQuranStream(streamUrl: string) {
  stopGlobalQuranAudio();
  globalQuranIsLoading = true;
  notifyQuranSubscribers();

  const audio = new Audio(streamUrl);
  globalQuranAudio = audio;
  audio.volume = globalQuranIsMuted ? 0 : globalQuranVolume;

  audio.onerror = (e) => {
    console.warn('Audio stream error:', e);
    globalQuranIsPlaying = false;
    globalQuranIsLoading = false;
    notifyQuranSubscribers();
  };

  audio
    .play()
    .then(() => {
      globalQuranIsPlaying = true;
      globalQuranIsLoading = false;
      notifyQuranSubscribers();
    })
    .catch((err) => {
      console.warn('Playback error:', err);
      globalQuranIsPlaying = false;
      globalQuranIsLoading = false;
      notifyQuranSubscribers();
    });
}

function QuranRadioWidget({ dragHandle }: { dragHandle: React.ReactNode }) {
  const { t } = useTranslation();
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    const handler = () => forceUpdate();
    onQuranChange = handler;
    return () => {
      if (onQuranChange === handler) onQuranChange = null;
    };
  }, []);

  React.useEffect(() => {
    if (typeof browser !== 'undefined' && browser.storage?.local) {
      browser.storage.local.get(QURAN_RADIO_STORAGE_KEY).then((data) => {
        const val = data[QURAN_RADIO_STORAGE_KEY];
        if (val && QURAN_QARIS.some((q) => q.id === val) && val !== globalQuranSelectedId) {
          globalQuranSelectedId = val as string;
          notifyQuranSubscribers();
        }
      }).catch(() => {});
    }
  }, []);

  const activeQari = QURAN_QARIS.find((q) => q.id === globalQuranSelectedId) || QURAN_QARIS[0];
  const qariOptions = React.useMemo(() => QURAN_QARIS.map((q) => ({ value: q.id, label: q.name })), []);

  const togglePlay = () => {
    if (globalQuranIsPlaying) {
      stopGlobalQuranAudio();
    } else {
      playGlobalQuranStream(activeQari.stream);
    }
  };

  const changeQari = (id: string) => {
    globalQuranSelectedId = id;
    if (typeof window !== 'undefined') {
      localStorage.setItem(QURAN_RADIO_STORAGE_KEY, id);
    }
    if (typeof browser !== 'undefined' && browser.storage?.local) {
      browser.storage.local.set({ [QURAN_RADIO_STORAGE_KEY]: id }).catch(() => {});
    }
    const newQari = QURAN_QARIS.find((q) => q.id === id);
    if (!newQari) return;

    if (globalQuranIsPlaying) {
      playGlobalQuranStream(newQari.stream);
    } else {
      stopGlobalQuranAudio();
    }
  };

  const handleVolumeChange = (val: number) => {
    globalQuranVolume = val;
    if (globalQuranIsMuted) globalQuranIsMuted = false;
    if (globalQuranAudio) {
      globalQuranAudio.volume = val;
    }
    notifyQuranSubscribers();
  };

  const toggleMute = () => {
    globalQuranIsMuted = !globalQuranIsMuted;
    if (globalQuranAudio) {
      globalQuranAudio.volume = globalQuranIsMuted ? 0 : globalQuranVolume;
    }
    notifyQuranSubscribers();
  };

  return (
    <DashboardCard
      title={t('widgetQuranRadioTitle')}
      icon={<Radio className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] shrink-0" />}
      headerBadge={globalQuranIsPlaying ? <StatusBadge status="live" showDot pulseDot compact>24/7 LIVE</StatusBadge> : undefined}
      headerAction={dragHandle}
      minHeight="h-[234px]"
    >
      <div className="flex-1 flex flex-col justify-between pt-0 h-full space-y-2.5">
        {/* Top Dropdown: Full Qari Name with Syaikh Prefix */}
        <Select
          options={qariOptions}
          value={globalQuranSelectedId}
          onValueChange={changeQari}
          className="h-9 text-xs font-semibold"
        />

        {/* Middle Audio Pill Box with Play Button & Dot Linear Spectrum (Wireframe Layout) */}
        <div className="card-inner-box p-2.5 flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)]">
          <button
            type="button"
            onClick={togglePlay}
            className={`h-9 w-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-md ${
              globalQuranIsPlaying
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20 ring-2 ring-emerald-500/20'
                : 'bg-[var(--color-foreground)] text-[var(--color-background)] hover:opacity-90'
            }`}
          >
            {globalQuranIsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : globalQuranIsPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current ml-0.5" />
            )}
          </button>

          <DotLinearSpectrum isPlaying={globalQuranIsPlaying} color="emerald" />
        </div>

        {/* Bottom Volume Control Slider */}
        <div className="flex items-center gap-2.5 px-1">
          <button
            type="button"
            onClick={toggleMute}
            className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
          >
            {globalQuranIsMuted || globalQuranVolume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          <Slider
            value={globalQuranIsMuted ? 0 : globalQuranVolume}
            onValueChange={handleVolumeChange}
            className="flex-1"
          />
        </div>
      </div>
    </DashboardCard>
  );
}

// 8. Nature Radio Widget (Noisekun Official Audio CDN Streams + Multi-Select Dropdown with Checkbox)
const NOISEKUN_SOUNDS = [
  { id: 'rain', shortName: 'Rain', fullName: '🌧️ Hujan (Rain)', stream: 'https://cdn.noisekun.com/sounds/rain.ogg' },
  { id: 'storm', shortName: 'Storm', fullName: '⚡ Badai Petir (Storm)', stream: 'https://cdn.noisekun.com/sounds/storm.ogg' },
  { id: 'drops', shortName: 'Drops', fullName: '💧 Tetesan Air (Drops)', stream: 'https://cdn.noisekun.com/sounds/drops.ogg' },
  { id: 'wind', shortName: 'Wind', fullName: '💨 Angin (Wind)', stream: 'https://cdn.noisekun.com/sounds/wind.ogg' },
  { id: 'waves', shortName: 'Waves', fullName: '🌊 Ombak (Waves)', stream: 'https://cdn.noisekun.com/sounds/waves.ogg' },
  { id: 'underwater', shortName: 'Underwater', fullName: '🥽 Bawah Air (Underwater)', stream: 'https://cdn.noisekun.com/sounds/underwater.ogg' },
  { id: 'stream', shortName: 'Stream', fullName: '🏞️ Aliran Sungai (Stream)', stream: 'https://cdn.noisekun.com/sounds/stream-water.ogg' },
  { id: 'waterfall', shortName: 'Waterfall', fullName: '⛲ Air Terjun (Waterfall)', stream: 'https://cdn.noisekun.com/sounds/waterfall.ogg' },
  { id: 'bird', shortName: 'Birds', fullName: '🌲 Kicau Burung (Birds)', stream: 'https://cdn.noisekun.com/sounds/birds-tree.ogg' },
  { id: 'leaves', shortName: 'Leaves', fullName: '🍃 Gugur Daun (Leaves)', stream: 'https://cdn.noisekun.com/sounds/leaves.ogg' },
  { id: 'fire', shortName: 'Fire', fullName: '🔥 Api Unggun (Bonfire)', stream: 'https://cdn.noisekun.com/sounds/fire.ogg' },
  { id: 'cave', shortName: 'Cave', fullName: '🦇 Gua (Cave Drops)', stream: 'https://cdn.noisekun.com/sounds/cave-drops.ogg' },
  { id: 'night', shortName: 'Night', fullName: '🦗 Jangkrik Malam (Night)', stream: 'https://cdn.noisekun.com/sounds/night.ogg' },
  { id: 'cafe', shortName: 'Cafe', fullName: '☕ Atmosphere Kafe (Coffee)', stream: 'https://cdn.noisekun.com/sounds/coffee.ogg' },
  { id: 'train', shortName: 'Train', fullName: '🚂 Kereta Api (Train)', stream: 'https://cdn.noisekun.com/sounds/train.ogg' },
  { id: 'airplane', shortName: 'Airplane', fullName: '✈️ Pesawat (Airplane)', stream: 'https://cdn.noisekun.com/sounds/air-plane.ogg' },
];

// Persistent Module-Level Audio Singleton for Nature Radio
const globalNatureAudioMap = new Map<string, HTMLAudioElement>();
let globalNatureIsPlaying = false;
let globalNatureVolume = 0.2;
let globalNatureIsMuted = false;
let globalNatureActiveSoundIds: string[] = ['storm', 'bird'];

// Exactly one widget instance exists at a time — a single listener slot suffices.
let onNatureChange: (() => void) | null = null;
function notifyNatureSubscribers() {
  onNatureChange?.();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    globalNatureAudioMap.forEach((audio) => {
      audio.pause();
      audio.src = '';
    });
    globalNatureAudioMap.clear();
  });
}

function NatureRadioWidget({ dragHandle }: { dragHandle: React.ReactNode }) {
  const { t } = useTranslation();
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    const handler = () => forceUpdate();
    onNatureChange = handler;
    return () => {
      if (onNatureChange === handler) onNatureChange = null;
    };
  }, []);

  const toggleSoundChip = (id: string) => {
    let nextIds: string[];
    if (globalNatureActiveSoundIds.includes(id)) {
      if (globalNatureActiveSoundIds.length <= 1) return;
      nextIds = globalNatureActiveSoundIds.filter((s) => s !== id);
      const existing = globalNatureAudioMap.get(id);
      if (existing) {
        existing.pause();
        existing.src = '';
        globalNatureAudioMap.delete(id);
      }
    } else {
      nextIds = [...globalNatureActiveSoundIds, id];
      if (globalNatureIsPlaying) {
        const item = NOISEKUN_SOUNDS.find((s) => s.id === id);
        if (item) {
          const audio = new Audio(item.stream);
          audio.loop = true;
          audio.volume = globalNatureIsMuted ? 0 : globalNatureVolume;
          audio.play().catch(() => {});
          globalNatureAudioMap.set(id, audio);
        }
      }
    }
    globalNatureActiveSoundIds = nextIds;
    notifyNatureSubscribers();
  };

  const togglePlayMaster = () => {
    if (globalNatureIsPlaying) {
      globalNatureAudioMap.forEach((audio) => audio.pause());
      globalNatureIsPlaying = false;
    } else {
      globalNatureActiveSoundIds.forEach((id) => {
        const item = NOISEKUN_SOUNDS.find((s) => s.id === id);
        if (!item) return;
        let audio = globalNatureAudioMap.get(id);
        if (!audio) {
          audio = new Audio(item.stream);
          audio.loop = true;
          globalNatureAudioMap.set(id, audio);
        }
        audio.volume = globalNatureIsMuted ? 0 : globalNatureVolume;
        audio.play().catch(() => {});
      });
      globalNatureIsPlaying = true;
    }
    notifyNatureSubscribers();
  };

  const handleVolumeChange = (val: number) => {
    globalNatureVolume = val;
    if (globalNatureIsMuted) globalNatureIsMuted = false;
    const currentVol = globalNatureIsMuted ? 0 : val;
    globalNatureAudioMap.forEach((audio) => {
      audio.volume = currentVol;
    });
    notifyNatureSubscribers();
  };

  const toggleMute = () => {
    globalNatureIsMuted = !globalNatureIsMuted;
    const currentVol = globalNatureIsMuted ? 0 : globalNatureVolume;
    globalNatureAudioMap.forEach((audio) => {
      audio.volume = currentVol;
    });
    notifyNatureSubscribers();
  };

  const dropdownLabelText = React.useMemo(() => {
    if (globalNatureActiveSoundIds.length === 0) return 'Pilih Suara Alam…';
    const names = globalNatureActiveSoundIds
      .map((id) => NOISEKUN_SOUNDS.find((s) => s.id === id)?.shortName)
      .filter(Boolean);
    return names.join(' + ');
  }, []);

  return (
    <DashboardCard
      title={t('widgetNatureRadioTitle')}
      icon={<Waves className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] shrink-0" />}
      headerBadge={globalNatureIsPlaying ? <StatusBadge status="info" showDot compact>{globalNatureActiveSoundIds.length} MIX</StatusBadge> : undefined}
      headerAction={dragHandle}
      minHeight="h-[234px]"
    >
      <div className="flex-1 flex flex-col justify-between pt-0 h-full space-y-2.5">
        {/* Top Dropdown: Real-time Audio Combination Label + Multi-Select Checkbox Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] outline-none transition-all hover:bg-[var(--color-accent)]/30 focus:ring-1 focus:ring-[var(--color-primary)] cursor-pointer select-none"
            >
              <span className="truncate font-semibold text-xs text-[var(--color-foreground)]">
                {dropdownLabelText}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] opacity-70 ml-2" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto bg-[var(--color-card)] border-[var(--color-border)] rounded-xl p-1 shadow-xl z-[100]"
          >
            {NOISEKUN_SOUNDS.map((sound) => {
              const isSelected = globalNatureActiveSoundIds.includes(sound.id);
              return (
                <div
                  key={sound.id}
                  onClick={(e) => {
                    e.preventDefault();
                    toggleSoundChip(sound.id);
                  }}
                  className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors select-none ${
                    isSelected
                      ? 'bg-[var(--color-accent)] text-[var(--color-foreground)] font-semibold'
                      : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/50'
                  }`}
                >
                  <span className="truncate">{sound.fullName}</span>
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleSoundChip(sound.id)} />
                </div>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Middle Audio Pill Box with Play Button & Dot Linear Spectrum (Wireframe Layout) */}
        <div className="card-inner-box p-2.5 flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)]">
          <button
            type="button"
            onClick={togglePlayMaster}
            className={`h-9 w-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-md ${
              globalNatureIsPlaying
                ? 'bg-sky-500 text-white hover:bg-sky-600 shadow-sky-500/20 ring-2 ring-sky-500/20'
                : 'bg-[var(--color-foreground)] text-[var(--color-background)] hover:opacity-90'
            }`}
          >
            {globalNatureIsPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current ml-0.5" />
            )}
          </button>

          <DotLinearSpectrum isPlaying={globalNatureIsPlaying} color="sky" />
        </div>

        {/* Bottom Volume Control Slider */}
        <div className="flex items-center gap-2.5 px-1">
          <button
            type="button"
            onClick={toggleMute}
            className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
          >
            {globalNatureIsMuted || globalNatureVolume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          <Slider
            value={globalNatureIsMuted ? 0 : globalNatureVolume}
            onValueChange={handleVolumeChange}
            className="flex-1"
          />
        </div>
      </div>
    </DashboardCard>
  );
}

// 9. Pomodoro Focus Timer Widget
interface PomodoroState {
  mode: 'focus' | 'break';
  endTimestamp: number | null;
  remainingSeconds: number;
  isRunning: boolean;
}

function PomodoroWidget({ dragHandle }: { dragHandle: React.ReactNode }) {
  const { t } = useTranslation();

  const [timerState, setTimerState] = React.useState<PomodoroState>(() => {
    const saved = localStorage.getItem('syntive.pomodoroState');
    if (saved) {
      try {
        const parsed: PomodoroState = JSON.parse(saved);
        if (parsed.isRunning && parsed.endTimestamp) {
          const now = Date.now();
          const rem = Math.max(0, Math.ceil((parsed.endTimestamp - now) / 1000));
          return {
            ...parsed,
            remainingSeconds: rem,
            isRunning: rem > 0,
            endTimestamp: rem > 0 ? parsed.endTimestamp : null,
          };
        }
        return parsed;
      } catch {
        // fallback
      }
    }
    return { mode: 'focus', endTimestamp: null, remainingSeconds: 25 * 60, isRunning: false };
  });

  const { mode, endTimestamp, remainingSeconds, isRunning } = timerState;

  React.useEffect(() => {
    localStorage.setItem('syntive.pomodoroState', JSON.stringify(timerState));
  }, [timerState]);

  React.useEffect(() => {
    let interval: any = null;

    if (isRunning) {
      interval = setInterval(() => {
        if (!endTimestamp) return;
        const now = Date.now();
        const rem = Math.max(0, Math.ceil((endTimestamp - now) / 1000));

        if (rem <= 0) {
          clearInterval(interval);
          playChimeSound();

          if (mode === 'focus') {
            const nextRemaining = 5 * 60;
            setTimerState({
              mode: 'break',
              endTimestamp: null,
              remainingSeconds: nextRemaining,
              isRunning: false,
            });
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(t('focusCompletedTitle'), { body: t('focusCompletedBody') });
            }
          } else {
            const nextRemaining = 25 * 60;
            setTimerState({
              mode: 'focus',
              endTimestamp: null,
              remainingSeconds: nextRemaining,
              isRunning: false,
            });
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(t('breakCompletedTitle'), { body: t('breakCompletedBody') });
            }
          }
        } else {
          setTimerState((prev) => ({ ...prev, remainingSeconds: rem }));
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, endTimestamp, mode, t]);

  const toggleTimer = () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    if (isRunning) {
      setTimerState((prev) => ({
        ...prev,
        isRunning: false,
        endTimestamp: null,
      }));
    } else {
      const targetEnd = Date.now() + remainingSeconds * 1000;
      setTimerState((prev) => ({
        ...prev,
        isRunning: true,
        endTimestamp: targetEnd,
      }));
    }
  };

  const resetTimer = () => {
    const duration = mode === 'focus' ? 25 * 60 : 5 * 60;
    setTimerState({
      mode,
      endTimestamp: null,
      remainingSeconds: duration,
      isRunning: false,
    });
  };

  const switchMode = (newMode: 'focus' | 'break') => {
    const duration = newMode === 'focus' ? 25 * 60 : 5 * 60;
    setTimerState({
      mode: newMode,
      endTimestamp: null,
      remainingSeconds: duration,
      isRunning: false,
    });
  };

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <DashboardCard
      title={t('widgetPomodoroTitle')}
      icon={<Timer className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] shrink-0" />}
      headerBadge={mode === 'focus' ? t('focusMode') : t('breakMode')}
      headerAction={dragHandle}
      minHeight="h-[234px]"
    >
      <div className="flex-1 flex flex-col justify-between items-center text-center py-2 h-full space-y-2">
        <div className="flex items-center gap-1 p-0.5 bg-[var(--color-background)] border border-[var(--color-border)]/60 rounded-xl">
          <button
            type="button"
            onClick={() => switchMode('focus')}
            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
              mode === 'focus'
                ? 'bg-[var(--color-accent)] text-[var(--color-foreground)] border border-[var(--color-border)]/50 shadow-xs'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            }`}
          >
            {t('focusMode')}
          </button>
          <button
            type="button"
            onClick={() => switchMode('break')}
            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
              mode === 'break'
                ? 'bg-[var(--color-accent)] text-[var(--color-foreground)] border border-[var(--color-border)]/50 shadow-xs'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            }`}
          >
            {t('breakMode')}
          </button>
        </div>

        <h3 className="text-4xl font-extrabold text-[var(--color-foreground)] tracking-tight my-0.5">
          {formattedTime}
        </h3>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTimer}
            className="h-7 text-xs px-3.5 gap-1.5 rounded-lg bg-[var(--color-foreground)] text-[var(--color-background)] hover:opacity-90 transition-opacity flex items-center justify-center font-semibold cursor-pointer shadow-xs"
          >
            {isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            <span>{isRunning ? t('pauseTimer') : t('startTimer')}</span>
          </button>
          <button
            type="button"
            onClick={resetTimer}
            className="h-7 w-7 rounded-lg bg-[var(--color-card)] hover:bg-[var(--color-accent)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors flex items-center justify-center cursor-pointer"
            title={t('resetTimer')}
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>
    </DashboardCard>
  );
}

// 10. World Clock Widget
interface WorldCity {
  city: string;
  country: string;
  timezone: string;
  flag: string;
}

const AVAILABLE_WORLD_CITIES: WorldCity[] = [
  // Asia & Pasifik
  { city: 'Jakarta', country: 'Indonesia (WIB)', timezone: 'Asia/Jakarta', flag: '🇮🇩' },
  { city: 'Makassar', country: 'Indonesia (WITA)', timezone: 'Asia/Makassar', flag: '🇮🇩' },
  { city: 'Jayapura', country: 'Indonesia (WIT)', timezone: 'Asia/Jayapura', flag: '🇮🇩' },
  { city: 'Singapura', country: 'Singapura', timezone: 'Asia/Singapore', flag: '🇸🇬' },
  { city: 'Kuala Lumpur', country: 'Malaysia', timezone: 'Asia/Kuala_Lumpur', flag: '🇲🇾' },
  { city: 'Bangkok', country: 'Thailand', timezone: 'Asia/Bangkok', flag: '🇹🇭' },
  { city: 'Manila', country: 'Filipina', timezone: 'Asia/Manila', flag: '🇵🇭' },
  { city: 'Hanoi', country: 'Vietnam', timezone: 'Asia/Ho_Chi_Minh', flag: '🇻🇳' },
  { city: 'Beijing', country: 'China', timezone: 'Asia/Shanghai', flag: '🇨🇳' },
  { city: 'Hong Kong', country: 'Hong Kong', timezone: 'Asia/Hong_Kong', flag: '🇭🇰' },
  { city: 'Taipei', country: 'Taiwan', timezone: 'Asia/Taipei', flag: '🇹🇼' },
  { city: 'Tokyo', country: 'Jepang', timezone: 'Asia/Tokyo', flag: '🇯🇵' },
  { city: 'Seoul', country: 'Korea Selatan', timezone: 'Asia/Seoul', flag: '🇰🇷' },
  { city: 'New Delhi', country: 'India', timezone: 'Asia/Kolkata', flag: '🇮🇳' },
  { city: 'Dubai', country: 'UEA', timezone: 'Asia/Dubai', flag: '🇦🇪' },
  { city: 'Riyadh', country: 'Arab Saudi', timezone: 'Asia/Riyadh', flag: '🇸🇦' },
  { city: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney', flag: '🇦🇺' },
  { city: 'Auckland', country: 'Selandia Baru', timezone: 'Pacific/Auckland', flag: '🇳🇿' },

  // Eropa
  { city: 'London', country: 'Inggris / UK', timezone: 'Europe/London', flag: '🇬🇧' },
  { city: 'Paris', country: 'Prancis', timezone: 'Europe/Paris', flag: '🇫🇷' },
  { city: 'Berlin', country: 'Jerman', timezone: 'Europe/Berlin', flag: '🇩🇪' },
  { city: 'Amsterdam', country: 'Belanda', timezone: 'Europe/Amsterdam', flag: '🇳🇱' },
  { city: 'Zurich', country: 'Swiss', timezone: 'Europe/Zurich', flag: '🇨🇭' },
  { city: 'Vienna', country: 'Austria', timezone: 'Europe/Vienna', flag: '🇦🇹' },
  { city: 'Stockholm', country: 'Swedia', timezone: 'Europe/Stockholm', flag: '🇸🇪' },
  { city: 'Rome', country: 'Italia', timezone: 'Europe/Rome', flag: '🇮🇹' },
  { city: 'Madrid', country: 'Spanyol', timezone: 'Europe/Madrid', flag: '🇪🇸' },
  { city: 'Istanbul', country: 'Turki', timezone: 'Europe/Istanbul', flag: '🇹🇷' },
  { city: 'Moscow', country: 'Rusia', timezone: 'Europe/Moscow', flag: '🇷🇺' },

  // Amerika
  { city: 'New York', country: 'Amerika Serikat (EST)', timezone: 'America/New_York', flag: '🇺🇸' },
  { city: 'Chicago', country: 'Amerika Serikat (CST)', timezone: 'America/Chicago', flag: '🇺🇸' },
  { city: 'Denver', country: 'Amerika Serikat (MST)', timezone: 'America/Denver', flag: '🇺🇸' },
  { city: 'Los Angeles', country: 'Amerika Serikat (PST)', timezone: 'America/Los_Angeles', flag: '🇺🇸' },
  { city: 'Toronto', country: 'Kanada', timezone: 'America/Toronto', flag: '🇨🇦' },
  { city: 'Vancouver', country: 'Kanada', timezone: 'America/Vancouver', flag: '🇨🇦' },
  { city: 'Mexico City', country: 'Meksiko', timezone: 'America/Mexico_City', flag: '🇲🇽' },
  { city: 'Sao Paulo', country: 'Brasil', timezone: 'America/Sao_Paulo', flag: '🇧🇷' },
  { city: 'Buenos Aires', country: 'Argentina', timezone: 'America/Buenos_Aires', flag: '🇦🇷' },

  // Afrika
  { city: 'Cairo', country: 'Mesir', timezone: 'Africa/Cairo', flag: '🇪🇬' },
  { city: 'Johannesburg', country: 'Afrika Selatan', timezone: 'Africa/Johannesburg', flag: '🇿🇦' },
];

function WorldClockWidget({ dragHandle }: { dragHandle: React.ReactNode }) {
  const { t } = useTranslation();
  const [selectedZones, setSelectedZones] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('syntive.worldClockZones');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return ['Asia/Tokyo', 'Europe/London', 'America/New_York'];
  });

  const [now, setNow] = React.useState(new Date());
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    localStorage.setItem('syntive.worldClockZones', JSON.stringify(selectedZones));
  }, [selectedZones]);

  const toggleZone = (tz: string) => {
    setSelectedZones((prev) => {
      if (prev.includes(tz)) {
        if (prev.length <= 1) return prev;
        return prev.filter((z) => z !== tz);
      }
      if (prev.length >= 3) return prev;
      return [...prev, tz];
    });
  };

  const getCityTime = (tz: string) => {
    try {
      return now.toLocaleTimeString([], {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  const getCityDate = (tz: string) => {
    try {
      return now.toLocaleDateString([], {
        timeZone: tz,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return '';
    }
  };

  const filteredCities = React.useMemo(() => {
    if (!searchQuery.trim()) return AVAILABLE_WORLD_CITIES;
    const q = searchQuery.toLowerCase().trim();
    return AVAILABLE_WORLD_CITIES.filter(
      (c) =>
        c.city.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.timezone.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <DashboardCard
      title={t('widgetWorldClockTitle')}
      icon={<Globe className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] shrink-0" />}
      headerAction={
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowEditModal(true)}
            className="p-1 rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors cursor-pointer"
            title={t('editLocations')}
          >
            <Settings2 className="h-3 w-3" />
          </button>
          {dragHandle}
        </div>
      }
      minHeight="h-[234px]"
    >
      <div className="flex-1 flex flex-col justify-between pt-0 h-full">
        <div className="card-inner-box divide-y divide-[var(--color-border)] overflow-hidden">
          {selectedZones.map((tz) => {
            const cityObj = AVAILABLE_WORLD_CITIES.find((c) => c.timezone === tz) || {
              city: tz.split('/')[1] || tz,
              country: '',
              timezone: tz,
              flag: '🌐',
            };
            const timeStr = getCityTime(tz);
            const dateStr = getCityDate(tz);

            return (
              <div
                key={tz}
                className="flex items-center justify-between px-3 py-2.5 text-xs select-none hover:bg-[var(--color-accent)]/30 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">{cityObj.flag}</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-xs text-[var(--color-foreground)] truncate">
                      {cityObj.city}
                    </span>
                    <span className="text-[10px] text-[var(--color-muted-foreground)] truncate font-mono">
                      {dateStr}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-sm font-bold text-[var(--color-foreground)] tracking-tight shrink-0 ml-2">
                  {timeStr}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-foreground)]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{t('editLocations')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-[var(--color-muted-foreground)]">
              {t('selectCity')} (Max 3):
            </p>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kota atau negara (misal: Beijing, China, London…)"
                className="pl-8 h-8 text-xs bg-[var(--color-background)] border-[var(--color-border)] focus:border-[var(--color-ring)]"
              />
            </div>

            <div className="card-inner-box divide-y divide-[var(--color-border)] overflow-hidden max-h-[220px] overflow-y-auto">
              {filteredCities.length === 0 ? (
                <p className="text-[11px] text-[var(--color-muted-foreground)] text-center py-4">
                  Kota / negara tidak ditemukan.
                </p>
              ) : (
                filteredCities.map((c) => {
                  const isSelected = selectedZones.includes(c.timezone);
                  return (
                    <label
                      key={`${c.city}-${c.timezone}`}
                      className="flex items-center justify-between px-3.5 py-2.5 hover:bg-[var(--color-accent)]/50 transition-colors cursor-pointer text-xs select-none"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{c.flag}</span>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-[var(--color-foreground)]">
                            {c.city}
                          </span>
                          <span className="text-[10px] text-[var(--color-muted-foreground)]">
                            {c.country}
                          </span>
                        </div>
                      </div>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleZone(c.timezone)}
                      />
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardCard>
  );
}
