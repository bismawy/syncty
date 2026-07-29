import * as React from 'react';
import { Globe } from 'lucide-react';
import { cn, domainOf } from '@/lib/utils';

export interface FaviconImageProps {
  url?: string | null;
  alt?: string;
  className?: string;
  fallbackSize?: string;
}

/**
 * Smart Favicon component with multi-tier auto-fallback.
 * Tries Google Favicon API -> IconHorse -> DuckDuckGo -> Favicon.im -> Globe Icon.
 */
export function FaviconImage({
  url,
  alt = '',
  className = 'h-4 w-4 object-contain shrink-0',
}: FaviconImageProps) {
  const domain = React.useMemo(() => domainOf(url), [url]);

  const providers = React.useMemo(() => {
    if (!domain) return [];
    return [
      `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
      `https://icon.horse/icon/${encodeURIComponent(domain)}`,
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
      `https://favicon.im/${encodeURIComponent(domain)}`,
    ];
  }, [domain]);

  const [providerIndex, setProviderIndex] = React.useState(0);
  const [failedAll, setFailedAll] = React.useState(false);

  React.useEffect(() => {
    setProviderIndex(0);
    setFailedAll(false);
  }, [url]);

  const handleError = () => {
    if (providerIndex < providers.length - 1) {
      setProviderIndex((prev) => prev + 1);
    } else {
      setFailedAll(true);
    }
  };

  if (failedAll || !domain || providers.length === 0) {
    return <Globe className={cn('text-[var(--color-muted-foreground)]', className)} />;
  }

  return (
    <img
      src={providers[providerIndex]}
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
    />
  );
}
