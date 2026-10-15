import React, { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { preloadRoute } from '../../lib/nav/routeModules';
import { withViewTransition } from '../../lib/nav/viewTransition';

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
  const prefetch = useCallback(() => void preloadRoute(to), [to]);
  const onClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
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
      void preloadRoute(to).then(() => withViewTransition(() => navigate(to)));
    },
    [current, navigate, to],
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
