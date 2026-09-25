import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useDocumentTitle(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    const setMeta = (selector: string, attr: 'name' | 'property', key: string, value: string) => {
      let tag = document.querySelector(selector);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', value);
    };
    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description);
      setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    }
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    window.scrollTo({ top: 0 });
  }, [title, description]);
}

export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

export type ViewMode = 'grid' | 'list';

export function useViewMode(): [ViewMode, (m: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem('cursedrock:view') === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });
  const change = (m: ViewMode) => {
    setMode(m);
    try {
      localStorage.setItem('cursedrock:view', m);
    } catch {
      /* ignora */
    }
  };
  return [mode, change];
}
