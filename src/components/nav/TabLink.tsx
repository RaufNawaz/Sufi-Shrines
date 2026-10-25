import React, { useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { preloadBriefly, preloadRoute } from '../../lib/nav/routeModules';
import { withViewTransition } from '../../lib/nav/viewTransition';
import { prefersReducedMotion } from '../../lib/motionPreference';

/**
 * A link to one of the five tab destinations, shared by the phone tab bar and
 * the header capsule (which drew the same five links twice, each its own way).
 *
 * Two things a plain `Link` does not do:
 * - **Prefetch on intent.** Hover, focus or the start of a touch begins loading
 *   the page module, so by the click it is usually already in.
 * - **Arrive by View Transition.** A plain left click waits for that module
 *   (normally already resolved), then navigates inside `withViewTransition`, so
 *   the content crossfades under still chrome instead of flashing a loading
 *   state. Modified clicks (new tab, etc.) are left to the browser.
 */
export function TabLink({
  to,
  className,
  current,
  children,
}: {
  to: string;
  className: string;
  current: boolean;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const prefetch = useCallback(() => void preloadRoute(to), [to]);
  const onClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      /* The tab of the page you are on, tapped again: back to the top, as
         every platform's tab bar does. It did nothing (motion council,
         17 October 2026). A tab tapped from one of its detail pages is a
         different path, and goes to the index as before. */
      if (
        current &&
        !event.defaultPrevented &&
        event.button === 0 &&
        (pathname.replace(/^\/ur(?=\/|$)/, '') || '/') === to
      ) {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        return;
      }
      if (
        current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      void preloadBriefly(preloadRoute(to)).then(() => withViewTransition(() => navigate(to)));
    },
    [current, navigate, pathname, to],
  );

  return (
    <Link
      to={to}
      className={className}
      /* `page`, not `true`: this is the page the reader is on, and that
         distinction is what a screen reader announces. Absent entirely on a
         route no tab owns. */
      aria-current={current ? 'page' : undefined}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      onTouchStart={prefetch}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
