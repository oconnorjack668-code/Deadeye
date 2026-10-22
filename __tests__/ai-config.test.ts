// __tests__/ai-config.test.ts
// Covers how AI_PROVIDER / AI_API_KEY / AI_MODEL resolve. This went untested
// when the AI config was made vendor-agnostic, and the gap shipped a real bug:
// an OpenAI key with no AI_PROVIDER set was sent to Anthropic, which answered
// "401 invalid x-api-key" and sent the user looking at their key.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { aiProviderCompany, getConfiguredAI, inferProvider, AINotConfiguredError } from '@/lib/ai/config';

const OPENAI_KEY = 'sk-proj-abc123';
const ANTHROPIC_KEY = 'sk-ant-api03-abc123';

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_API_KEY: process.env.AI_API_KEY,
    AI_MODEL: process.env.AI_MODEL,
    AI_CHAT_MODEL: process.env.AI_CHAT_MODEL,
    AI_REPORT_MODEL: process.env.AI_REPORT_MODEL,
  };
  delete process.env.AI_PROVIDER;
  delete process.env.AI_API_KEY;
  delete process.env.AI_MODEL;
  delete process.env.AI_CHAT_MODEL;
  delete process.env.AI_REPORT_MODEL;
});

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe('inferProvider', () => {
  it('reads an Anthropic key by its sk-ant- prefix', () => {
    expect(inferProvider(ANTHROPIC_KEY)).toBe('anthropic');
  });

  it('reads an OpenAI key by its sk- prefix', () => {
    expect(inferProvider(OPENAI_KEY)).toBe('openai');
    expect(inferProvider('sk-abc123')).toBe('openai');
  });

  it('falls back to anthropic for an unrecognised shape', () => {
    expect(inferProvider('something-else')).toBe('anthropic');
  });
});

describe('getConfiguredAI', () => {
  it('refuses to run with no key', () => {
    expect(() => getConfiguredAI(100)).toThrow(AINotConfiguredError);
  });

  it('uses OpenAI when only an OpenAI key is set', () => {
    // The exact case that broke in production: AI_API_KEY set, AI_PROVIDER not.
    process.env.AI_API_KEY = OPENAI_KEY;
    const { provider, config } = getConfiguredAI(100);
    expect(provider.name).toBe('openai');
    expect(config.model).toBe('gpt-4o-mini');
  });

  it('uses Anthropic when only an Anthropic key is set', () => {
    process.env.AI_API_KEY = ANTHROPIC_KEY;
    const { provider, config } = getConfiguredAI(100);
    expect(provider.name).toBe('anthropic');
    expect(config.model).toBe('claude-sonnet-5-5');
  });

  it('uses the cheap model for chat and the better one for reports', () => {
    process.env.AI_API_KEY = ANTHROPIC_KEY;
    expect(getConfiguredAI(700, 'chat').config).toMatchObject({ model: 'claude-haiku-5-5', use: 'chat' });
    expect(getConfiguredAI(800).config).toMatchObject({ model: 'claude-sonnet-5-5', use: 'report' });
    process.env.AI_API_KEY = OPENAI_KEY;
    expect(getConfiguredAI(700, 'chat').config.model).toBe('gpt-4o-mini');
  });

  it('lets AI_CHAT_MODEL and AI_REPORT_MODEL each override AI_MODEL', () => {
    process.env.AI_API_KEY = ANTHROPIC_KEY;
    process.env.AI_MODEL = 'claude-opus-5-5';
    expect(getConfiguredAI(100, 'chat').config.model).toBe('claude-opus-5-5');
    process.env.AI_CHAT_MODEL = 'claude-haiku-5-5';
    process.env.AI_REPORT_MODEL = 'claude-sonnet-5-5';
    expect(getConfiguredAI(100, 'chat').config.model).toBe('claude-haiku-5-5');
    expect(getConfiguredAI(100, 'report').config.model).toBe('claude-sonnet-5-5');
  });

  it('says which setting is wrong when the model belongs to the other provider', () => {
    // The switch-over trap: an Anthropic key with AI_MODEL still gpt-4o-mini
    process.env.AI_API_KEY = ANTHROPIC_KEY;
    process.env.AI_MODEL = 'gpt-4o-mini';
    expect(() => getConfiguredAI(100)).toThrow(/provider is Anthropic but the model is "gpt-4o-mini"/);
    process.env.AI_API_KEY = OPENAI_KEY;
    process.env.AI_MODEL = 'claude-haiku-5-5';
    expect(() => getConfiguredAI(100)).toThrow(/provider is OpenAI/);
  });

  it('lets an explicit AI_PROVIDER win over the key shape', () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_API_KEY = 'some-proxy-key';
    expect(getConfiguredAI(100).provider.name).toBe('openai');
  });

  it('explains the mismatch instead of letting the vendor return 401', () => {
    process.env.AI_PROVIDER = 'anthropic';
    process.env.AI_API_KEY = OPENAI_KEY;
    expect(() => getConfiguredAI(100)).toThrow(/looks like an OpenAI key/);
  });

  it('does not mistake a real Anthropic key for an OpenAI one', () => {
    process.env.AI_PROVIDER = 'anthropic';
    process.env.AI_API_KEY = ANTHROPIC_KEY;
    expect(getConfiguredAI(100).provider.name).toBe('anthropic');
  });

  it('rejects an unknown provider name', () => {
    process.env.AI_PROVIDER = 'made-up-provider';
    process.env.AI_API_KEY = OPENAI_KEY;
    expect(() => getConfiguredAI(100)).toThrow(AINotConfiguredError);
  });

  it('honours AI_MODEL over the per-provider default', () => {
    process.env.AI_API_KEY = OPENAI_KEY;
    process.env.AI_MODEL = 'gpt-4o';
    expect(getConfiguredAI(100).config.model).toBe('gpt-4o');
  });

  it('tolerates whitespace pasted around the key', () => {
    process.env.AI_API_KEY = `  ${OPENAI_KEY}  `;
    const { provider, config } = getConfiguredAI(100);
    expect(provider.name).toBe('openai');
    expect(config.apiKey).toBe(OPENAI_KEY);
  });

  it('passes maxTokens through', () => {
    process.env.AI_API_KEY = ANTHROPIC_KEY;
    expect(getConfiguredAI(1234).config.maxTokens).toBe(1234);
  });
});

// The privacy policy and the parent approval page name this company. Reading it
// from the same settings that route requests is what stops the policy naming
// one vendor while data goes to another. It used to say OpenAI whatever the
// settings were, though an Anthropic key sends everything to Anthropic.
describe('aiProviderCompany', () => {
  it('names the company the requests actually go to', () => {
    expect(aiProviderCompany()).toBeNull();
    process.env.AI_API_KEY = ANTHROPIC_KEY;
    expect(aiProviderCompany()).toBe('Anthropic');
    process.env.AI_API_KEY = OPENAI_KEY;
    expect(aiProviderCompany()).toBe('OpenAI');
    process.env.AI_PROVIDER = 'anthropic';
    process.env.AI_API_KEY = 'some-other-key';
    expect(aiProviderCompany()).toBe('Anthropic');
  });
});
