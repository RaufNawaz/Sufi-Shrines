import { act, render, screen } from '@testing-library/react';
import {
  hasProjectAccess,
  isTeamKnown,
  persistAccessParamIfPresent,
  setProjectAccess,
  useTeamAccess,
} from '../projectAccess';

function Probe() {
  return <span>{useTeamAccess() ? 'team' : 'public'}</span>;
}

describe('projectAccess', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('promotes ?team=1 to the stored flag and strips it from the URL', () => {
    window.history.replaceState(null, '', '/shrine/data-darbar?lang=ur&team=1#history');
    persistAccessParamIfPresent();
    expect(hasProjectAccess()).toBe(true);
    expect(isTeamKnown()).toBe(true);
    expect(window.location.pathname + window.location.search + window.location.hash).toBe(
      '/shrine/data-darbar?lang=ur#history',
    );
  });

  it('?team=0 clears the flag, strips the param, and keeps the browser known', () => {
    setProjectAccess(true);
    window.history.replaceState(null, '', '/about?team=0');
    persistAccessParamIfPresent();
    expect(hasProjectAccess()).toBe(false);
    expect(isTeamKnown()).toBe(true);
    expect(window.location.search).toBe('');
  });

  it('leaves an unrelated team value and the URL alone', () => {
    window.history.replaceState(null, '', '/?team=yes');
    persistAccessParamIfPresent();
    expect(hasProjectAccess()).toBe(false);
    expect(window.location.search).toBe('?team=yes');
  });

  it('re-renders mounted components when the switch changes', () => {
    render(<Probe />);
    expect(screen.getByText('public')).toBeInTheDocument();
    act(() => setProjectAccess(true));
    expect(screen.getByText('team')).toBeInTheDocument();
    act(() => setProjectAccess(false));
    expect(screen.getByText('public')).toBeInTheDocument();
  });

  it('follows another tab through the storage event', () => {
    render(<Probe />);
    act(() => {
      localStorage.setItem('shrines_team_access', '1');
      window.dispatchEvent(new StorageEvent('storage', { key: 'shrines_team_access' }));
    });
    expect(screen.getByText('team')).toBeInTheDocument();
  });

  it('holds the choice in memory when localStorage throws', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    try {
      window.history.replaceState(null, '', '/?team=1');
      persistAccessParamIfPresent();
      expect(window.location.search).toBe('');
      expect(hasProjectAccess()).toBe(true);
    } finally {
      setItem.mockRestore();
      getItem.mockRestore();
      setProjectAccess(false);
    }
  });
});
