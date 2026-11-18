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

  it('in Settings, starts on Feedback, lets the player pick Idea, and sends the kind (00067)', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }));
    render(<ReportProblem chooseKind label="Send feedback or report a problem" />);
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback or report a problem' }));
    expect((screen.getByRole('radio', { name: 'Feedback' }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole('textbox', { name: 'What do you think of Deadeye?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Idea' }));
    const box = screen.getByRole('textbox', { name: 'What should Deadeye do next?' });
    fireEvent.change(box, { target: { value: 'A free throw challenge' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Thanks. We read every message.')).toBeTruthy();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ message: 'A free throw challenge', url: '/video', kind: 'idea' });
  });

  it('sends no kind from the crash screen, so it stays a problem', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }));
    const box = open();
    expect(screen.queryByRole('radio')).toBeNull();
    fireEvent.change(box, { target: { value: 'Crashed' } });
    submit();
    await screen.findByText('Thanks. We read every report.');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect('kind' in JSON.parse(init.body as string)).toBe(false);
  });

  it('closes again on Cancel', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Report a problem' })).toBeTruthy();
  });
});
