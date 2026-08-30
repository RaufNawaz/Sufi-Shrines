import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import { renderInlineBold } from '../shrine/inlineFormat';
import { langAttr } from '../../lib/i18n/languages';

/** One passage, with its entry already resolved to a display label — the page
 * has the loaded shrine rows and this component does not, which is the same
 * split every other shrine reference on OrderPage uses. */
export interface OrderProseRow {
  shrineSlug: string;
  shrineLabel: string;
  /** Already picked for the reader's language by the page. */
  quote: string;
  /** True when `quote` is the English passage — the reader is in English, or a
   * passage somehow reached the page without its Urdu half (the build refuses
   * to ship one, so this is a belt-and-braces flag rather than a live case). */
  isLatin: boolean;
}

/**
 * What the archive says about an order, in the archive's own words.
 *
 * The order pages carried a one-line summary written for this site and nothing
 * else — and four of the nine carried not even that. Meanwhile the corpus held
 * whole authored sections on the same orders: "The Suhrawardi Way", "The Way of
 * Blame", "The Azeemia Order", "The Naqshbandi-Mujaddidi Way", "The Qalandar and
 * His Order". No page could reach any of them.
 *
 * Each passage keeps the entry it came from, linked, for the same reason the
 * kinship and lineage rows keep their quote: an archive whose distinguishing
 * claim is provenance has to leave the reader the exact place to check.
 */
export function OrderProse({ rows }: { rows: OrderProseRow[] }) {
  const { lang, t } = useLang();
  if (rows.length === 0) return null;

  return (
    <section className="kg-section">
      <h2 className="kg-section-heading">{t('orderProseHeading')}</h2>
      <p className="kg-section-note">{t('orderProseNote')}</p>
      <ul className="order-prose-list">
        {rows.map((row) => (
          <li key={`${row.shrineSlug}:${row.quote.slice(0, 40)}`} className="order-prose-item">
            {/* The Urdu reader gets the Urdu article's own words, not the
                English ones.

                This is the whole reason `quoteUr` is required. A quotation may
                be Latin where it is evidence for a claim (i18n rule 7, and how
                LineageView shows a lineage quote) — but here the passage IS the
                page's account of the order, on four of these pages the only one
                there is, and a paragraph of English standing in that position is
                an untranslated sentence, not a citation. The no-leak guard said
                so on seven routes.

                Rendered through `renderInlineBold` in both languages because the
                archive's Descriptions are markdown on both sides — a *sama* or a
                *لطائفِ غیبیہ* left raw shows its asterisks. */}
            <blockquote
              className="order-prose-quote"
              {...(row.isLatin ? { lang: 'en', dir: 'ltr' as const, 'data-latin': true } : {})}
            >
              {renderInlineBold(row.quote)}
            </blockquote>
            <p className="order-prose-cite">
              {t('orderProseFrom')}{' '}
              <Link to={`/shrine/${row.shrineSlug}`} lang={langAttr(lang)} data-latin>
                <bdi>{row.shrineLabel}</bdi>
              </Link>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
