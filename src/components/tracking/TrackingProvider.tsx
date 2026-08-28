'use client';

import { useEffect } from 'react';
import { setAnalyticsProvider } from '@/lib/analytics';
import { createTrackingProvider, type IngestTransport } from '@/lib/tracking/provider';
import { persistAttribution, ensureFbc } from '@/lib/tracking/attribution';

type TrackingProviderProps = { transport?: IngestTransport };

export function TrackingProvider({ transport }: TrackingProviderProps) {
  useEffect(() => {
    persistAttribution(window.location.search);
    ensureFbc(window.location.search);
    setAnalyticsProvider(createTrackingProvider(transport ? { transport } : {}));
  }, [transport]);
  return null;
}
