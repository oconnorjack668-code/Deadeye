// __tests__/ai-provider.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { OpenAIProvider, AnthropicProvider, claudeRequestShape, getAIProvider, type CoachingEvidence } from '@/lib/ai/provider';

const evidence: CoachingEvidence = {
  sessionType: 'shooting',
  sessionDate: '2026-09-24',
  duration: 45,
  intensity: 6,
  totalMakes: 30,
  totalAttempts: 50,
  shootingPercentage: 60,
};
const config = { apiKey: 'test-key', model: 'gpt-4o-mini', maxTokens: 800 };

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: 'status text',
      json: async () => body,
    })
  );
}

describe('OpenAIProvider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('parses a JSON coaching response', async () => {
    mockFetch(200, {
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'Solid volume session.',
              keyInsights: ['60% overall'],
              recommendations: ['More corner threes', 42],
            }),
          },
        },
      ],
    });

    const output = await new OpenAIProvider().generateCoachingSummary(evidence, config);
    expect(output.summary).toBe('Solid volume session.');
    expect(output.keyInsights).toEqual(['60% overall']);
    expect(output.recommendations).toEqual(['More corner threes']); // non-strings dropped
  });

  it('sends the shooting numbers and requests JSON output', async () => {
    mockFetch(200, { choices: [{ message: { content: '{"summary":"ok"}' } }] });
    await new OpenAIProvider().generateCoachingSummary(evidence, config);

    const body = JSON.parse((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.messages[1].content).toContain('Shooting: 30/50 (60.0%)');
  });

  it('surfaces the OpenAI error message', async () => {
    mockFetch(404, { error: { message: 'The model `gpt-x` does not exist' } });
    await expect(new OpenAIProvider().generateCoachingSummary(evidence, config)).rejects.toThrow(
      'OpenAI API error (404): The model `gpt-x` does not exist'
    );
  });

  it('rejects output without a summary', async () => {
    mockFetch(200, { choices: [{ message: { content: '{"keyInsights":[]}' } }] });
    await expect(new OpenAIProvider().generateCoachingSummary(evidence, config)).rejects.toThrow(
      'without a summary'
    );
  });

});

describe('AnthropicProvider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('parses a JSON coaching response', async () => {
    mockFetch(200, {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            summary: 'Solid volume session.',
            keyInsights: ['60% overall'],
            recommendations: ['More corner threes', 42],
          }),
        },
      ],
    });

    const output = await new AnthropicProvider().generateCoachingSummary(evidence, {
      ...config,
      model: 'claude-sonnet-5',
    });
    expect(output.summary).toBe('Solid volume session.');
    expect(output.keyInsights).toEqual(['60% overall']);
    expect(output.recommendations).toEqual(['More corner threes']); // non-strings dropped
  });

  it('sends the shooting numbers and an x-api-key header', async () => {
    mockFetch(200, { content: [{ type: 'text', text: '{"summary":"ok"}' }] });
    await new AnthropicProvider().generateCoachingSummary(evidence, { ...config, model: 'claude-sonnet-5' });

    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].headers['x-api-key']).toBe('test-key');
    const body = JSON.parse(call[1].body);
    expect(body.messages[0].content).toContain('Shooting: 30/50 (60.0%)');
  });

  it('surfaces the Anthropic error message', async () => {
    mockFetch(404, { error: { message: 'model not found' } });
    await expect(
      new AnthropicProvider().generateCoachingSummary(evidence, { ...config, model: 'claude-sonnet-5' })
    ).rejects.toThrow('Anthropic API error (404): model not found');
  });

  it('gives current models room to think, and low effort for chat', async () => {
    mockFetch(200, { content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: 'Bend your knees more.' }] });
    const answer = await new AnthropicProvider().generateChat(
      [
        { role: 'system', content: 'You are a coach.' },
        { role: 'user', content: 'How do I shoot further?' },
      ],
      { ...config, model: 'claude-haiku-5-5', maxTokens: 700, use: 'chat' }
    );
    expect(answer).toBe('Bend your knees more.');
    const body = JSON.parse((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toMatchObject({ model: 'claude-haiku-5-5', max_tokens: 1724, output_config: { effort: 'low' } });
    expect(body.temperature).toBeUndefined();
  });

  it('sizes requests by model and use', () => {
    expect(claudeRequestShape('claude-sonnet-5-5', 800)).toEqual({ max_tokens: 4896, output_config: { effort: 'medium' } });
    expect(claudeRequestShape('claude-haiku-5-5', 700, 'chat')).toEqual({ max_tokens: 1724, output_config: { effort: 'low' } });
    expect(claudeRequestShape('claude-opus-4-8', 800)).toMatchObject({ output_config: { effort: 'medium' } });
    // Older models think only when asked and take no effort setting
    expect(claudeRequestShape('claude-haiku-4-5', 700, 'chat')).toEqual({ max_tokens: 700 });
  });

  it('says so when the coach declines to answer', async () => {
    mockFetch(200, { content: [], stop_reason: 'refusal' });
    await expect(
      new AnthropicProvider().generateChat([{ role: 'user', content: 'x' }], { ...config, model: 'claude-haiku-5-5', use: 'chat' })
    ).rejects.toThrow('declined');
  });

  it('rejects output without a summary', async () => {
    mockFetch(200, { content: [{ type: 'text', text: '{"keyInsights":[]}' }] });
    await expect(
      new AnthropicProvider().generateCoachingSummary(evidence, { ...config, model: 'claude-sonnet-5' })
    ).rejects.toThrow('without a summary');
  });
});

describe('getAIProvider', () => {
  it('returns the matching provider for known names', () => {
    expect(getAIProvider('openai')).toBeInstanceOf(OpenAIProvider);
    expect(getAIProvider('anthropic')).toBeInstanceOf(AnthropicProvider);
    expect(getAIProvider('Anthropic')).toBeInstanceOf(AnthropicProvider); // case-insensitive
  });

  it('rejects unsupported providers instead of storing placeholder output', () => {
    expect(() => getAIProvider('made-up-provider')).toThrow('not supported');
  });
});
