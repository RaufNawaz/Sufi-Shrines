import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TourList } from '../TourList';
import { TOURS } from '../../../lib/tours/tours';
import { buildShrine } from '../../../lib/data/shrineModel';
import { recordTourStop, recordTourCompleted } from '../../../lib/tours/tourProgress';
import { UI_TEXT } from '../../../lib/i18n/uiStrings';
import { makeShrineRow } from '../../../test/utils';

function makeShrine(name: string, lat: string, lng: string, index: number) {
  return buildShrine(makeShrineRow({ Name: name, Latitude: lat, Longitude: lng }), index)!;
}

// Enough of TOURS[0]'s stops resolved to real shrines to compute a distance.
const shrines = [
  makeShrine('Data Darbar', '31.5564', '74.3093', 0),
  makeShrine('Mazar of Bulleh Shah', '31.1156', '74.4547', 1),
];

const noop = () => {};

beforeEach(() => {
  localStorage.clear();
});

describe('TourList', () => {
  it('hides tour cards and hint when disabled', () => {
    render(
      <TourList
        lang="en"
        enabled={false}
        onToggle={noop}
        onStart={noop}
        onResume={noop}
        shrines={[]}
      />,
    );
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByText(TOURS[0].title)).not.toBeInTheDocument();
    expect(screen.queryByText(UI_TEXT.en.guidedToursHint)).not.toBeInTheDocument();
  });

  it('shows all tour cards when enabled', () => {
    render(
      <TourList
        lang="en"
        enabled={true}
        onToggle={noop}
        onStart={noop}
        onResume={noop}
        shrines={[]}
      />,
    );
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    for (const tour of TOURS) {
      expect(screen.getByText(tour.title)).toBeInTheDocument();
    }
  });

  it('calls onToggle with the flipped value when the switch is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { rerender } = render(
      <TourList
        lang="en"
        enabled={false}
        onToggle={onToggle}
        onStart={noop}
        onResume={noop}
        shrines={[]}
      />,
    );
    await user.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(true);

    rerender(
      <TourList
        lang="en"
        enabled={true}
        onToggle={onToggle}
        onStart={noop}
        onResume={noop}
        shrines={[]}
      />,
    );
    await user.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('shows total distance on a card once enough stops resolve to shrines', () => {
    render(
      <TourList
        lang="en"
        enabled={true}
        onToggle={noop}
        onStart={noop}
        onResume={noop}
        shrines={shrines}
      />,
    );
    // Data Darbar -> Bulleh Shah is ~50km; card meta should include a km figure.
    expect(screen.getByText(/km$/)).toBeInTheDocument();
  });

  it('omits distance when fewer than two stops have resolved', () => {
    render(
      <TourList
        lang="en"
        enabled={true}
        onToggle={noop}
        onStart={noop}
        onResume={noop}
        shrines={[]}
      />,
    );
    expect(screen.queryByText(/km$/)).not.toBeInTheDocument();
  });

  it('clicking a card opens a preview instead of starting the tour immediately', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(
      <TourList
        lang="en"
        enabled={true}
        onToggle={noop}
        onStart={onStart}
        onResume={noop}
        shrines={shrines}
      />,
    );
    await user.click(screen.getByText(TOURS[0].title));

    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: UI_TEXT.en.tourStartButton })).toBeInTheDocument();
    expect(screen.getByText(TOURS[0].description)).toBeInTheDocument();
  });

  it('starts the tour when confirmed from the preview', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(
      <TourList
        lang="en"
        enabled={true}
        onToggle={noop}
        onStart={onStart}
        onResume={noop}
        shrines={shrines}
      />,
    );
    await user.click(screen.getByText(TOURS[0].title));
    await user.click(screen.getByRole('button', { name: UI_TEXT.en.tourStartButton }));

    expect(onStart).toHaveBeenCalledWith(TOURS[0].id);
  });

  it('going back from the preview returns to the card list without starting', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(
      <TourList
        lang="en"
        enabled={true}
        onToggle={noop}
        onStart={onStart}
        onResume={noop}
        shrines={shrines}
      />,
    );
    await user.click(screen.getByText(TOURS[0].title));
    await user.click(screen.getByRole('button', { name: UI_TEXT.en.tourBackButton }));

    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByText(TOURS[0].title)).toBeInTheDocument();
    expect(screen.getByText(TOURS[1].title)).toBeInTheDocument();
  });

  it('offers to resume the last in-progress tour', async () => {
    const user = userEvent.setup();
    const onResume = vi.fn();
    recordTourStop(TOURS[0].id, 3);
    render(
      <TourList
        lang="en"
        enabled={true}
        onToggle={noop}
        onStart={noop}
        onResume={onResume}
        shrines={[]}
      />,
    );

    expect(screen.getByText(UI_TEXT.en.resumeTourPrompt)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: UI_TEXT.en.resumeButton }));
    expect(onResume).toHaveBeenCalledWith(TOURS[0].id, 3);
  });

  it('does not offer to resume when nothing is in progress', () => {
    render(
      <TourList
        lang="en"
        enabled={true}
        onToggle={noop}
        onStart={noop}
        onResume={noop}
        shrines={[]}
      />,
    );
    expect(screen.queryByText(UI_TEXT.en.resumeTourPrompt)).not.toBeInTheDocument();
  });

  it('dismissing the resume banner hides it without clearing per-tour status', async () => {
    const user = userEvent.setup();
    recordTourStop(TOURS[0].id, 3);
    render(
      <TourList
        lang="en"
        enabled={true}
        onToggle={noop}
        onStart={noop}
        onResume={noop}
        shrines={[]}
      />,
    );

    await user.click(screen.getByRole('button', { name: UI_TEXT.en.dismiss }));
    expect(screen.queryByText(UI_TEXT.en.resumeTourPrompt)).not.toBeInTheDocument();
    expect(screen.getByText(`${UI_TEXT.en.tourInProgressBadge} 4/8`)).toBeInTheDocument();
  });

  it('shows an in-progress badge on the matching card', () => {
    recordTourStop(TOURS[0].id, 2);
    render(
      <TourList
        lang="en"
        enabled={true}
        onToggle={noop}
        onStart={noop}
        onResume={noop}
        shrines={[]}
      />,
    );
    expect(screen.getByText(`${UI_TEXT.en.tourInProgressBadge} 3/8`)).toBeInTheDocument();
  });

  it('shows a completed badge once a tour is finished', () => {
    recordTourStop(TOURS[0].id, 7);
    recordTourCompleted(TOURS[0].id);
    render(
      <TourList
        lang="en"
        enabled={true}
        onToggle={noop}
        onStart={noop}
        onResume={noop}
        shrines={[]}
      />,
    );
    expect(screen.getByText(UI_TEXT.en.tourCompletedBadge)).toBeInTheDocument();
    // A completed tour is no longer resumable.
    expect(screen.queryByText(UI_TEXT.en.resumeTourPrompt)).not.toBeInTheDocument();
  });
});
