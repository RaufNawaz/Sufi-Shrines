import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Shrine } from '../../types/shrine';
import { fetchPois, POI_CATEGORIES, type PoiItem } from '../../lib/poi/overpass';

interface Props {
  shrine: Shrine | null;
  enabledCategories: Set<string>;
}

function buildPoiIcon(categoryKey: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="poi-dot poi-dot--${categoryKey}"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

function buildPoiPopup(item: PoiItem): string {
  const cat = POI_CATEGORIES.find((c) => c.key === item.category);
  return `<div class="poi-popup"><strong>${item.name}</strong><br/><span class="poi-popup-cat">${cat?.label ?? item.category}</span></div>`;
}

export function PoiLayer({ shrine, enabledCategories }: Props) {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Clean up previous markers
    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();
    } else {
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    if (!shrine || enabledCategories.size === 0) {
      setLoading(false);
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    const { lat, lng } = shrine.latLng;
    const cats = Array.from(enabledCategories);

    Promise.allSettled(
      cats.map((catKey) => fetchPois(lat, lng, catKey, controller.signal)),
    ).then((results) => {
      if (controller.signal.aborted) return;
      const group = layerGroupRef.current;
      if (!group) return;

      results.forEach((result, i) => {
        if (result.status !== 'fulfilled') return;
        const catKey = cats[i];
        result.value.forEach((item) => {
          const marker = L.marker([item.lat, item.lng], { icon: buildPoiIcon(catKey) });
          marker.bindPopup(buildPoiPopup(item), { className: 'poi-popup-container' });
          marker.addTo(group);
        });
      });
      setLoading(false);
    });

    return () => {
      controller.abort();
    };
  }, [shrine, enabledCategories, map]);

  // Remove layer group on unmount
  useEffect(() => {
    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
    };
  }, [map]);

  return loading ? (
    <div className="poi-loading-badge" aria-live="polite" aria-atomic="true">
      Loading nearby places…
    </div>
  ) : null;
}
