"use client";

import * as React from 'react';

export type ToolkitMeta = {
  name: string;
  slug: string;
  logo?: string;
};

type ToolkitMap = Map<string, ToolkitMeta>; // key = UPPERCASE slug

let cached: ToolkitMap | null = null;

export function useToolkits() {
  const [toolkits, setToolkits] = React.useState<ToolkitMap | null>(cached);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (cached) {
          setToolkits(cached);
          return;
        }
        const res = await fetch('/api/toolkits', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const map: ToolkitMap = new Map();
        for (const t of data.toolkits ?? []) {
          if (t?.slug) {
            map.set(String(t.slug).toUpperCase(), {
              name: t.name ?? t.slug,
              slug: String(t.slug),
              logo: t.logo,
            });
          }
        }
        if (!cancelled) {
          cached = map;
          setToolkits(map);
        }
      } catch (_) {
        // ignore; optional enrichment only
      }
    }
    if (!toolkits) load();
    return () => {
      cancelled = true;
    };
  }, [toolkits]);

  const getBySlug = React.useCallback(
    (slug?: string | null) => {
      if (!slug || !toolkits) return undefined;
      return toolkits.get(slug.toUpperCase());
    },
    [toolkits],
  );

  return { toolkits, getBySlug };
}

