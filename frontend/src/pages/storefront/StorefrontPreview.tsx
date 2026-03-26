import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { storefrontAPI } from '@/services/api';

type Store = {
  id: number;
  slug: string;
  display_name: string;
  logo_url?: string | null;
  banner_url?: string | null;
  theme_preset: string;
  primary_color: string;
  accent_color: string;
  about?: string;
  socials?: Record<string, string>;
  is_published?: boolean;
};

const StorefrontPreview: React.FC = () => {
  const { slug } = useParams();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const themeVars = useMemo(() => ({
    ['--store-primary' as any]: store?.primary_color || '#10B981',
    ['--store-accent' as any]: store?.accent_color || '#111827',
  }), [store]);

  useEffect(() => {
    let mounted = true;
    if (!slug) return;
    setLoading(true);
    setError(null);
    storefrontAPI.getPublicStorePreview(slug)
      .then(res => {
        if (!mounted) return;
        setStore(res.data?.store);
      })
      .catch(e => {
        console.error('Failed to load store draft preview:', e);
        setError(e?.response?.data?.detail || 'Failed to load preview');
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [slug]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-emerald-50" style={themeVars as React.CSSProperties}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Preview (Draft): {store?.display_name || slug}</h1>
          {store?.is_published ? (
            <Link to={`/store/${store.slug}`} className="text-sm text-emerald-700 underline">Go to live</Link>
          ) : (
            <span className="text-sm text-gray-500">Not published</span>
          )}
        </header>

        {loading && (
          <div className="rounded-xl border border-yellow-200 bg-white p-6 shadow-sm">Loading draft...</div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-red-200 bg-white p-6 text-red-700">{error}</div>
        )}

        {!loading && !error && (
          <div className="space-y-6">
            {store?.banner_url && (
              <div className="h-48 sm:h-60 w-full overflow-hidden rounded-2xl border border-gray-200 relative shadow-sm">
                <img src={store.banner_url} alt="Banner" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
              </div>
            )}
            <div className="rounded-xl border border-yellow-200 bg-white p-6 shadow-sm flex items-center gap-4">
              {store?.logo_url && (
                <img src={store.logo_url} alt="Logo" className="h-12 w-12 rounded object-cover border" />
              )}
              <div>
                <h2 className="text-xl font-semibold" style={{ color: 'var(--store-accent)' }}>{store?.display_name}</h2>
                {store?.about && <p className="text-gray-600 text-sm mt-1">{store.about}</p>}
              </div>
            </div>
            {!store?.is_published && (
              <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 p-4">
                This is a draft. Publish from the vendor wizard to make it live.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StorefrontPreview;
