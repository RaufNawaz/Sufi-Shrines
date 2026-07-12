import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

function sendMetric(metric: Metric): void {
  if (import.meta.env.DEV) {
    console.debug(`[vitals] ${metric.name}: ${Math.round(metric.value)} (${metric.rating})`);
  }
  const url = import.meta.env.VITE_BEACON_URL;
  if (url) {
    navigator.sendBeacon(
      url,
      JSON.stringify({
        type: 'cwv',
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
      }),
    );
  }
}

export function initTelemetry(): void {
  onCLS(sendMetric);
  onFCP(sendMetric);
  onINP(sendMetric);
  onLCP(sendMetric);
  onTTFB(sendMetric);

  const url = import.meta.env.VITE_BEACON_URL;

  window.addEventListener('error', (e: ErrorEvent) => {
    if (import.meta.env.DEV) console.error('[telemetry] error', e.message);
    if (url) {
      navigator.sendBeacon(
        url,
        JSON.stringify({
          type: 'error',
          message: e.message,
          filename: e.filename,
          lineno: e.lineno,
        }),
      );
    }
  });

  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const message = e.reason instanceof Error ? e.reason.message : String(e.reason);
    if (import.meta.env.DEV) console.error('[telemetry] rejection', message);
    if (url) {
      navigator.sendBeacon(url, JSON.stringify({ type: 'unhandledrejection', message }));
    }
  });
}
