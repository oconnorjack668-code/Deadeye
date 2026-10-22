// src/components/search/AppSearch.tsx
// The search icon in the top bar, and the search it opens: full screen on a
// phone, a panel on a computer, where "/" opens it too. Things to do and
// places to go come from src/lib/search.ts on the phone; drills, exercises,
// IQ lessons, programmes and guides from /api/search. Recent picks stay on
// this phone only (deadeye-recent-searches); nothing typed is stored.
'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, Clock, Loader2, Search, X } from 'lucide-react';
import { cleanSearch, searchEntries, suggestedEntries, type SearchResult } from '@/lib/search';
import type { AppMode } from '@/lib/supabase/types';

const RECENT_KEY = 'deadeye-recent-searches';
const RECENT_MAX = 5;
const DEBOUNCE_MS = 250;

interface Section {
  id: string;
  title: string;
  results: SearchResult[];
}

function readRecent(): SearchResult[] {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as SearchResult[];
    return Array.isArray(list) ? list.filter((r) => r && typeof r.href === 'string' && typeof r.title === 'string').slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function remember(result: SearchResult) {
  try {
    const next = [result, ...readRecent().filter((r) => r.href !== result.href)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // storage blocked: nothing to remember on this phone
  }
}

/** Typing in a box should type a "/", not open search */
function typingSomewhere(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

export function AppSearch({ mode, isOwner }: { mode: AppMode; isOwner: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // The page it was opened on: moving to another page closes it
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<SearchResult[]>([]);
  // The content results, with the search they answer
  const [found, setFound] = useState<{ q: string; groups: Section[] } | null>(null);

  const openSearch = useCallback(() => {
    setQuery('');
    setActive(0);
    setRecent(readRecent());
    setOpenOn(pathname);
  }, [pathname]);
  const close = useCallback(() => setOpenOn(null), []);

  // "/" opens search on a computer, as on most sites
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && !open && !e.metaKey && !e.ctrlKey && !e.altKey && !typingSomewhere(e.target)) {
        e.preventDefault();
        openSearch();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, openSearch]);

  // While open: the page behind kept still
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  // Drills, exercises and the rest, a moment after typing stops
  const q = cleanSearch(query);
  const wantsContent = open && !!q && q.length >= 2;
  useEffect(() => {
    if (!wantsContent || !q) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&mode=${mode}`, { signal: controller.signal });
        const data = (await res.json().catch(() => ({}))) as { groups?: Section[] };
        setFound({ q, groups: res.ok ? data.groups ?? [] : [] });
      } catch {
        // Offline, or a newer search took over: the things-to-do half still works
        if (!controller.signal.aborted) setFound({ q, groups: [] });
      }
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [q, wantsContent, mode]);
  const content = useMemo(() => (wantsContent && found?.q === q ? found.groups : []), [wantsContent, found, q]);
  const loading = wantsContent && found?.q !== q;

  const sections: Section[] = useMemo(() => {
    if (!query.trim()) {
      const suggested = suggestedEntries(mode).map(({ title, hint, href }) => ({ title, hint, href }));
      return [
        ...(recent.length ? [{ id: 'recent', title: 'Recent', results: recent }] : []),
        { id: 'suggested', title: 'Suggestions', results: suggested },
      ];
    }
    const found = searchEntries(query, { mode, isOwner });
    const pick = (list: typeof found.do) => list.map(({ title, hint, href }) => ({ title, hint, href }));
    return [
      { id: 'do', title: 'Things to do', results: pick(found.do) },
      { id: 'go', title: 'In the app', results: pick(found.go) },
      ...content,
    ].filter((s) => s.results.length > 0);
  }, [query, mode, isOwner, content, recent]);

  const flat = useMemo(() => sections.flatMap((s) => s.results), [sections]);

  function choose(result: SearchResult) {
    remember(result);
    close();
    router.push(result.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (e.key === 'Enter' && flat[active]) {
      e.preventDefault();
      choose(flat[active]);
    }
  }

  const nothing = query.trim() !== '' && flat.length === 0 && !loading;
  let index = -1;

  return (
    <>
      <button
        type="button"
        onClick={openSearch}
        title="Search (/)"
        aria-label="Search"
        className="h-9 w-9 flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition-colors hover:text-white"
      >
        <Search className="h-4 w-4" />
      </button>

      {/* On the body, not inside the top bar: its backdrop blur would make
          "fixed inset-0" cover only the 64px bar instead of the screen */}
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search Deadeye"
            className="fixed inset-0 z-50 flex flex-col bg-zinc-950 md:items-center md:bg-black/70 md:p-4 md:pt-24"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <div className="flex h-full w-full flex-col pt-[env(safe-area-inset-top)] md:h-auto md:max-h-[70vh] md:max-w-xl md:overflow-hidden md:rounded-2xl md:border md:border-zinc-800 md:bg-zinc-950 md:pt-0 md:shadow-2xl">
              <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
                <Search className="h-5 w-5 flex-shrink-0 text-zinc-500" aria-hidden />
                <input
                  ref={inputRef}
                  type="search"
                  role="combobox"
                  aria-expanded={flat.length > 0}
                  aria-controls={listId}
                  aria-activedescendant={flat[active] ? `${listId}-${active}` : undefined}
                  aria-label="Search drills, sections and settings"
                  placeholder="Search drills, sections, settings…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onKeyDown}
                  autoComplete="off"
                  enterKeyHint="search"
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-zinc-500 focus:outline-none"
                />
                {loading && <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-zinc-500" aria-label="Searching" />}
                <button type="button" onClick={close} aria-label="Close search" className="flex-shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
                <ul id={listId} role="listbox" aria-label="Results">
                  {sections.map((section) => (
                    <li key={section.id} role="presentation" className="mb-2">
                      <div className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{section.title}</div>
                      <ul role="presentation">
                        {section.results.map((r) => {
                          index += 1;
                          const i = index;
                          return (
                            <li
                              key={`${section.id}-${r.href}`}
                              id={`${listId}-${i}`}
                              role="option"
                              aria-selected={i === active}
                              onMouseEnter={() => setActive(i)}
                              onClick={() => choose(r)}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${i === active ? 'bg-zinc-800/80' : ''}`}
                            >
                              {section.id === 'recent' && <Clock className="h-4 w-4 flex-shrink-0 text-zinc-500" aria-hidden />}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-white">{r.title}</span>
                                <span className="block truncate text-xs text-zinc-500">{r.hint}</span>
                              </span>
                              <ArrowRight className="h-4 w-4 flex-shrink-0 text-zinc-600" aria-hidden />
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
                {nothing && (
                  <p className="px-3 py-6 text-center text-sm text-zinc-400">
                    Nothing for &ldquo;{query.trim()}&rdquo;. Try a drill name, a skill like &ldquo;ball handling&rdquo;, or a section
                    like Streaks.
                  </p>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
