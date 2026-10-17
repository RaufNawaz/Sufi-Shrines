import { flushSync } from 'react-dom';
import { prefersReducedMotion } from '../motionPreference';

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => unknown;
};

/**
 * Run a navigation inside a same-document View Transition where the browser
 * has one (Chromium 111+, Safari 18+), and plainly everywhere else or under
 * reduced motion. `flushSync` is what lets the browser capture the *new* page:
 * the callback must have committed the DOM by the time it returns.
 *
 * The transition itself is the root crossfade in global.css; the tab bar and
 * the header carry their own `view-transition-name`, so the chrome holds still
 * while the content changes under it — the native tab-switch idiom.
 */
export function withViewTransition(update: () => void): void {
  const doc = document as ViewTransitionDocument;
  const reduce = prefersReducedMotion();
  if (!doc.startViewTransition || reduce) {
    update();
    return;
  }
  const root = document.documentElement;
  root.classList.add('vt-nav');
  const transition = doc.startViewTransition(() => flushSync(update)) as
    { finished?: Promise<unknown> } | undefined;
  const done = () => root.classList.remove('vt-nav');
  if (transition?.finished) transition.finished.then(done, done);
  else done();
}
