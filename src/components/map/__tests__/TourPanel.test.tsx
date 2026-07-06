import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TourList } from '../TourPanel';
import { TOURS } from '../../../lib/tours/tours';

describe('TourList', () => {
  it('hides tour cards and hint when disabled', () => {
    render(<TourList lang="en" enabled={false} onToggle={() => {}} onStart={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByText(TOURS[0].title)).not.toBeInTheDocument();
    expect(screen.queryByText('Follow a curated route through related shrines')).not.toBeInTheDocument();
  });

  it('shows all tour cards when enabled', () => {
    render(<TourList lang="en" enabled={true} onToggle={() => {}} onStart={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    for (const tour of TOURS) {
      expect(screen.getByText(tour.title)).toBeInTheDocument();
    }
  });

  it('calls onToggle with the flipped value when the switch is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { rerender } = render(
      <TourList lang="en" enabled={false} onToggle={onToggle} onStart={() => {}} />,
    );
    await user.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(true);

    rerender(<TourList lang="en" enabled={true} onToggle={onToggle} onStart={() => {}} />);
    await user.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('starts a tour from its card when enabled', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<TourList lang="en" enabled={true} onToggle={() => {}} onStart={onStart} />);
    await user.click(screen.getByText(TOURS[0].title));
    expect(onStart).toHaveBeenCalledWith(TOURS[0].id);
  });
});
