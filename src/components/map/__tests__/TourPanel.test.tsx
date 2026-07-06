import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TourList } from '../TourPanel';
import { TOURS } from '../../../lib/tours/tours';
import { buildShrine } from '../../../lib/data/shrineModel';
import type { ShrineRow } from '../../../types/shrine';

function makeShrine(name: string, lat: string, lng: string, index: number) {
  const row: ShrineRow = { Name: name, Latitude: lat, Longitude: lng, Category: 'Muslim Shrine' };
  return buildShrine(row, index)!;
}

// Enough of TOURS[0]'s stops resolved to real shrines to compute a distance.
const shrines = [
  makeShrine('Data Darbar', '31.5564', '74.3093', 0),
  makeShrine('Mazar of Bulleh Shah', '31.1156', '74.4547', 1),
];

describe('TourList', () => {
  it('hides tour cards and hint when disabled', () => {
    render(<TourList lang="en" enabled={false} onToggle={() => {}} onStart={() => {}} shrines={[]} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByText(TOURS[0].title)).not.toBeInTheDocument();
    expect(screen.queryByText('Follow a curated route through related shrines')).not.toBeInTheDocument();
  });

  it('shows all tour cards when enabled', () => {
    render(<TourList lang="en" enabled={true} onToggle={() => {}} onStart={() => {}} shrines={[]} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    for (const tour of TOURS) {
      expect(screen.getByText(tour.title)).toBeInTheDocument();
    }
  });

  it('calls onToggle with the flipped value when the switch is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { rerender } = render(
      <TourList lang="en" enabled={false} onToggle={onToggle} onStart={() => {}} shrines={[]} />,
    );
    await user.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(true);

    rerender(<TourList lang="en" enabled={true} onToggle={onToggle} onStart={() => {}} shrines={[]} />);
    await user.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('shows total distance on a card once enough stops resolve to shrines', () => {
    render(<TourList lang="en" enabled={true} onToggle={() => {}} onStart={() => {}} shrines={shrines} />);
    // Data Darbar -> Bulleh Shah is ~50km; card meta should include a km figure.
    expect(screen.getByText(/km$/)).toBeInTheDocument();
  });

  it('omits distance when fewer than two stops have resolved', () => {
    render(<TourList lang="en" enabled={true} onToggle={() => {}} onStart={() => {}} shrines={[]} />);
    expect(screen.queryByText(/km$/)).not.toBeInTheDocument();
  });

  it('clicking a card opens a preview instead of starting the tour immediately', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<TourList lang="en" enabled={true} onToggle={() => {}} onStart={onStart} shrines={shrines} />);
    await user.click(screen.getByText(TOURS[0].title));

    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Start tour' })).toBeInTheDocument();
    expect(screen.getByText(TOURS[0].description)).toBeInTheDocument();
  });

  it('starts the tour when confirmed from the preview', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<TourList lang="en" enabled={true} onToggle={() => {}} onStart={onStart} shrines={shrines} />);
    await user.click(screen.getByText(TOURS[0].title));
    await user.click(screen.getByRole('button', { name: 'Start tour' }));

    expect(onStart).toHaveBeenCalledWith(TOURS[0].id);
  });

  it('going back from the preview returns to the card list without starting', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<TourList lang="en" enabled={true} onToggle={() => {}} onStart={onStart} shrines={shrines} />);
    await user.click(screen.getByText(TOURS[0].title));
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByText(TOURS[0].title)).toBeInTheDocument();
    expect(screen.getByText(TOURS[1].title)).toBeInTheDocument();
  });
});
