// __tests__/report-problem.test.tsx
// The "Report a problem" form players see in Settings and on the crash screen.
// What they wrote must never be lost to a failed send, and "Thanks" must only
// appear once the server has the report.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportProblem } from '@/components/ReportProblem';

const fetchMock = vi.fn();

function open(props: React.ComponentProps<typeof ReportProblem> = {}) {
  render(<ReportProblem {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Report a problem' }));
  return screen.getByRole('textbox', { name: 'What went wrong?' }) as HTMLTextAreaElement;
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
}

describe('ReportProblem', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/video');
  });

  it('sends what the player wrote, with the page and any context', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }));
    const box = open({ context: 'After a crash (error code 123): boom' });
    fireEvent.change(box, { target: { value: 'The tracker missed my make' } });
    submit();

    expect(await screen.findByText('Thanks. We read every report.')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/reports');
    expect(JSON.parse(init.body as string)).toEqual({
      message: 'The tracker missed my make',
      context: 'After a crash (error code 123): boom',
      url: '/video',
    });
  });

  it('asks for the problem before sending an empty box', () => {
    open();
    submit();
    expect(screen.getByRole('alert').textContent).toBe('Tell us what went wrong first.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows what the server said, and keeps the text, when a send fails', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'That is 10 reports today, thank you. Send any more tomorrow.' }), { status: 429 })
    );
    const box = open();
    fireEvent.change(box, { target: { value: 'Still broken' } });
    submit();

    expect((await screen.findByRole('alert')).textContent).toMatch(/tomorrow/);
    expect(box.value).toBe('Still broken');
    expect(screen.queryByText('Thanks. We read every report.')).toBeNull();
  });

  it('keeps the text when there is no connection', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const box = open();
    fireEvent.change(box, { target: { value: 'Offline at the court' } });
    submit();

    expect((await screen.findByRole('alert')).textContent).toMatch(/No connection/);
    expect(box.value).toBe('Offline at the court');
  });

  it('closes again on Cancel', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Report a problem' })).toBeTruthy();
  });
});
