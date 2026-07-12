/**
 * Shared unit-test helpers. Everything here used to exist as diverged copies
 * inside individual test files — add to this module rather than re-inlining.
 */
import React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../lib/i18n/LanguageContext';
import { ThemeProvider } from '../lib/i18n/ThemeContext';
import { LANGUAGE_STORAGE_KEY } from '../lib/storageKeys';
import type { Lang, ShrineRow } from '../types/shrine';

interface RenderWithProvidersOptions {
  /** UI language to persist before mounting (LanguageContext reads it). */
  lang?: Lang;
  /** When set, wraps `ui` in a MemoryRouter starting at this route — pass '/'
   * for components that merely need router context (Link, useNavigate). */
  route?: string;
}

/**
 * Renders `ui` inside the app's real providers (ThemeProvider > LanguageProvider),
 * seeding the persisted language first so LanguageContext initializes to it.
 * Replaces the per-file `renderInUrdu` helpers.
 */
export function renderWithProviders(
  ui: React.ReactNode,
  { lang = 'en', route }: RenderWithProvidersOptions = {},
): RenderResult {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  const content =
    route === undefined ? ui : <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>;
  return render(
    <ThemeProvider>
      <LanguageProvider>{content}</LanguageProvider>
    </ThemeProvider>,
  );
}

interface FindLatinLeaksOptions {
  /** Extra `closest()` selector for sanctioned Latin (joined onto the default
   * coordinate/link/bdi/data-latin exceptions). */
  allowClosest?: string;
}

/**
 * Walks every text node in `root` and flags any that contain a Latin letter,
 * skipping the sanctioned exceptions: coordinates, links, and explicitly
 * bidi-isolated Latin (<bdi> / [data-latin]). Mirrors
 * URDU_IMPLEMENTATION_PLAN.md §9's "no English leaks" guard.
 */
export function findLatinLeaks(root: HTMLElement, options: FindLatinLeaksOptions = {}): string[] {
  const allowed = ['.coords', 'a', 'bdi', '[data-latin]'];
  if (options.allowClosest) allowed.push(options.allowClosest);
  const allowedSelector = allowed.join(', ');

  const leaks: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = (node.textContent || '').trim();
    if (!text || !/[A-Za-z]/.test(text)) continue;
    const el = node.parentElement;
    if (el?.closest(allowedSelector)) continue;
    leaks.push(text);
  }
  return leaks;
}

/**
 * A minimal valid ShrineRow (name + parseable coordinates + category) that
 * `buildShrine` accepts — override or extend per test. Replaces the ad-hoc
 * row literals that used to live in each lib/data test.
 */
export function makeShrineRow(overrides: Partial<ShrineRow> = {}): ShrineRow {
  return {
    Name: 'Data Darbar',
    Latitude: '31.5564',
    Longitude: '74.3093',
    Category: 'Muslim Shrine',
    ...overrides,
  };
}

/**
 * vi.mock factory for ShrineGallery (it uses IntersectionObserver, which
 * jsdom lacks). vi.mock calls are file-scoped and hoisted above imports, so
 * each test file still declares its own mock and must reach this helper via
 * a dynamic import (a hoisted factory can't touch static import bindings):
 *
 *   vi.mock('../shrine/ShrineGallery', async () =>
 *     (await import('../../test/utils')).shrineGalleryMockFactory());
 */
export const shrineGalleryMockFactory = () => ({ ShrineGallery: () => null });
