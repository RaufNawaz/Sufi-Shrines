import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Tour } from '../../lib/tours/tours';
import type { Shrine } from '../../types/shrine';
import { resolveTourStops, computeBounds } from '../../lib/tours/tourRoute';
import { SIDEBAR_WIDTH } from '../../lib/data/constants';
import { flyToOrSetView } from './mapMotion';

interface Props {
  tour: Tour;
  stopIdx: number;
  shrines: Shrine[];
  sidebarOpen: boolean;
  isRTL: boolean;
}

interface StopMarkerEntry {
  marker: L.Marker;
  stopIndex: number;
  displayNumber: number;
}

function buildStopIcon(displayNumber: number, isActive: boolean): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="tour-stop-marker${isActive ? ' tour-stop-marker--active' : ''}">${displayNumber}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/**
 * Renders the active tour as a route on the map: a dashed line through the
 * stops in order, plus a numbered marker per stop with the active one
 * highlighted. Mounted only while a tour is running (parent uses
 * key={tour.id} so switching tours gets a fresh instance).
 */
export function TourRoute({ tour, stopIdx, shrines, sidebarOpen, isRTL }: Props) {
  const map = useMap();
  const isInitialStopRef = useRef(true);
  const markerEntriesRef = useRef<StopMarkerEntry[]>([]);

  const points = resolveTourStops(tour, shrines);
  // Stable key so the layer-build effect only reruns when the resolved set
  // of stops actually changes (not on every parent render).
  const pointsKey = points.map((p) => p.shrine.id).join(',');

  // Build the polyline + numbered markers, and fit the whole route in view.
  useEffect(() => {
    if (points.length === 0) return;

    const group = L.layerGroup();
    const entries: StopMarkerEntry[] = [];

    if (points.length > 1) {
      L.polyline(
        points.map((p) => [p.shrine.latLng.lat, p.shrine.latLng.lng] as L.LatLngTuple),
        { className: 'tour-route-line', interactive: false },
      ).addTo(group);
    }

    points.forEach((p, i) => {
      const displayNumber = i + 1;
      const marker = L.marker([p.shrine.latLng.lat, p.shrine.latLng.lng], {
        icon: buildStopIcon(displayNumber, p.stopIndex === stopIdx),
        interactive: false,
        keyboard: false,
        alt: '',
      });
      marker.addTo(group);
      entries.push({ marker, stopIndex: p.stopIndex, displayNumber });
    });

    group.addTo(map);
    markerEntriesRef.current = entries;

    const bounds = computeBounds(points.map((p) => p.shrine.latLng));
    if (bounds) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isDesktop = window.innerWidth > 768;
      const basePad: [number, number] = [40, 40];
      const padSidebarSide: [number, number] =
        isDesktop && sidebarOpen ? [SIDEBAR_WIDTH + 40, 40] : basePad;

      map.fitBounds(L.latLngBounds([bounds.south, bounds.west], [bounds.north, bounds.east]), {
        paddingTopLeft: isRTL ? basePad : padSidebarSide,
        paddingBottomRight: isRTL ? padSidebarSide : basePad,
        maxZoom: 15,
        animate: !reduced,
      });
    }

    return () => {
      map.removeLayer(group);
      markerEntriesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pointsKey]);

  // Re-highlight the active stop marker whenever the stop changes (also
  // covers the initial render, redundantly but harmlessly re-marking stop 0).
  useEffect(() => {
    for (const entry of markerEntriesRef.current) {
      entry.marker.setIcon(buildStopIcon(entry.displayNumber, entry.stopIndex === stopIdx));
    }
  }, [stopIdx, pointsKey]);

  // Fly to the active stop when it changes — skip the very first render,
  // since the fitBounds effect above already sets the initial view.
  useEffect(() => {
    if (isInitialStopRef.current) {
      isInitialStopRef.current = false;
      return;
    }
    const point = points.find((p) => p.stopIndex === stopIdx);
    if (!point) return;
    const targetZoom = Math.max(map.getZoom(), 13);
    flyToOrSetView(map, [point.shrine.latLng.lat, point.shrine.latLng.lng], targetZoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopIdx]);

  return null;
}
