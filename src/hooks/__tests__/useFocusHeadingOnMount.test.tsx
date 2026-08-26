import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { useFocusHeadingOnMount } from '../useFocusHeadingOnMount';

function Heading() {
  const ref = useFocusHeadingOnMount<HTMLHeadingElement>();
  return <h1 ref={ref}>Data Darbar</h1>;
}

describe('useFocusHeadingOnMount', () => {
  it('focuses the heading on mount so the navigation is announced', () => {
    const { getByRole } = render(<Heading />);
    expect(document.activeElement).toBe(getByRole('heading'));
  });

  /* The regression this guards: a page's content mounts *after* its route when
     the data lands late, and a reader who had already opened the ⌘K palette in
     that gap had the caret pulled out of the search input by the arriving
     heading. Navigation announcement is for navigation; focus inside an
     aria-modal dialog means none happened. */
  it('leaves focus alone while it sits inside an aria-modal dialog', () => {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const input = document.createElement('input');
    dialog.appendChild(input);
    document.body.appendChild(dialog);
    input.focus();

    const { getByRole } = render(<Heading />);

    expect(document.activeElement).toBe(input);
    expect(getByRole('heading')).not.toBe(document.activeElement);
    dialog.remove();
  });
});
