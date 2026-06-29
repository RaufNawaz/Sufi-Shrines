export interface PoiCategory {
  key: string;
  label: string;
  labelUr: string;
  query: string;
  icon: string; // single-char emoji for now; replaced by SVG in PoiLayer
  color: string; // CSS class suffix
}

export const POI_CATEGORIES: PoiCategory[] = [
  {
    key: 'restaurant',
    label: 'Restaurants',
    labelUr: 'ریستوران',
    query: 'node["amenity"~"restaurant|cafe|fast_food|food_court"]',
    icon: '🍽',
    color: 'orange',
  },
  {
    key: 'hotel',
    label: 'Hotels',
    labelUr: 'ہوٹل',
    query: 'node["tourism"~"hotel|guest_house|hostel|motel"]',
    icon: '🏨',
    color: 'blue',
  },
  {
    key: 'transport',
    label: 'Transport',
    labelUr: 'ٹرانسپورٹ',
    query: 'node["amenity"~"bus_station|ferry_terminal"]["public_transport"~"stop_position|station"]',
    icon: '🚌',
    color: 'teal',
  },
  {
    key: 'atm',
    label: 'ATMs & Banks',
    labelUr: 'اے ٹی ایم',
    query: 'node["amenity"~"atm|bank"]',
    icon: '🏧',
    color: 'green',
  },
  {
    key: 'pharmacy',
    label: 'Pharmacies',
    labelUr: 'دوا خانہ',
    query: 'node["amenity"~"pharmacy|hospital|clinic"]',
    icon: '💊',
    color: 'red',
  },
];

export interface PoiItem {
  id: number;
  lat: number;
  lng: number;
  name: string;
  category: string;
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const RADIUS_M = 1500;

function cacheKey(lat: number, lng: number, categoryKey: string): string {
  return `poi_${lat.toFixed(3)}_${lng.toFixed(3)}_${categoryKey}`;
}

function cachedGet(key: string): PoiItem[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { items, ts } = JSON.parse(raw) as { items: PoiItem[]; ts: number };
    // 24h TTL
    if (Date.now() - ts > 86_400_000) { localStorage.removeItem(key); return null; }
    return items;
  } catch {
    return null;
  }
}

function cachedSet(key: string, items: PoiItem[]): void {
  try {
    localStorage.setItem(key, JSON.stringify({ items, ts: Date.now() }));
  } catch { /* quota exceeded — skip */ }
}

export async function fetchPois(
  lat: number,
  lng: number,
  categoryKey: string,
  signal?: AbortSignal,
): Promise<PoiItem[]> {
  const key = cacheKey(lat, lng, categoryKey);
  const cached = cachedGet(key);
  if (cached) return cached;

  const cat = POI_CATEGORIES.find((c) => c.key === categoryKey);
  if (!cat) return [];

  const query = `[out:json][timeout:10];(${cat.query}(around:${RADIUS_M},${lat},${lng}););out body;`;
  const resp = await fetch(
    `${OVERPASS_URL}?data=${encodeURIComponent(query)}`,
    { signal },
  );
  if (!resp.ok) throw new Error(`Overpass ${resp.status}`);
  const data = await resp.json() as { elements: Array<{ id: number; lat: number; lon: number; tags?: Record<string, string> }> };

  const items: PoiItem[] = data.elements
    .filter((el) => el.lat !== undefined && el.lon !== undefined)
    .map((el) => ({
      id: el.id,
      lat: el.lat,
      lng: el.lon,
      name: el.tags?.name || el.tags?.['name:en'] || cat.label,
      category: categoryKey,
    }));

  cachedSet(key, items);
  return items;
}
