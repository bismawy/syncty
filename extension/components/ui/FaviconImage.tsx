import * as React from 'react';
import { Globe } from 'lucide-react';
import { cn, domainOf } from '@/lib/utils';

export interface FaviconImageProps {
  url?: string | null;
  alt?: string;
  className?: string;
  fallbackSize?: string;
}

// Localhost / loopback / bare IP hosts have no public favicon — don't hit
// remote favicon services for them (avoids noisy 404s and wasted requests).
const LOCAL_OR_IP = /^(localhost|::1|(?:0\.)?0\.0\.0\.0|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;

// ponytail: remember domains that exhausted every provider so re-renders skip
// straight to the fallback icon instead of re-firing the failed requests.
const failedDomains = new Set<string>();

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
  const [failedAll, setFailedAll] = React.useState(() => (domain ? failedDomains.has(domain) : false));

  React.useEffect(() => {
    setProviderIndex(0);
    setFailedAll(domain ? failedDomains.has(domain) : false);
  }, [domain]);

  const handleError = () => {
    if (providerIndex < providers.length - 1) {
      setProviderIndex((prev) => prev + 1);
    } else {
      if (domain) failedDomains.add(domain);
      setFailedAll(true);
    }
  };

  if (failedAll || !domain || providers.length === 0 || LOCAL_OR_IP.test(domain)) {
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
