// src/lib/ai/config.ts
// SERVER-ONLY: reads the AI_PROVIDER / AI_API_KEY / AI_MODEL env vars documented in
// .env.example and returns a ready-to-use provider + config, or throws a clear,
// honest "not configured" error. Every AI call site should go through this instead
// of reading process.env directly, so there is exactly one place that decides
// which provider is active and what "not configured" means.
import { getAIProvider, type AIProvider, type AIProviderConfig } from './provider';

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-4o-mini',
};

export class AINotConfiguredError extends Error {
  readonly status = 503;
}

/**
 * Works out the provider from the key when AI_PROVIDER is not set.
 *
 * Defaulting blindly to one vendor meant that setting only AI_API_KEY to an
 * OpenAI key sent it to api.anthropic.com, which answers "401 invalid
 * x-api-key" - an error that points at the key rather than at the real
 * problem. Anthropic keys are prefixed sk-ant-, OpenAI's are sk- / sk-proj-.
 */
export function inferProvider(apiKey: string): string {
  if (apiKey.startsWith('sk-ant-')) return 'anthropic';
  if (apiKey.startsWith('sk-')) return 'openai';
  return 'anthropic';
}

const PROVIDER_COMPANIES: Record<string, string> = { anthropic: 'Anthropic', openai: 'OpenAI' };

/**
 * The company that receives AI requests, for the privacy policy and the parent
 * approval page. Read from the same settings that route the requests, so what
 * the policy says cannot drift from where the data actually goes. null when AI
 * is not configured.
 */
export function aiProviderCompany(): string | null {
  const apiKey = (process.env.AI_API_KEY || '').trim();
  if (!apiKey) return null;
  const name = (process.env.AI_PROVIDER || '').trim().toLowerCase() || inferProvider(apiKey);
  return PROVIDER_COMPANIES[name] ?? null;
}

/**
 * Resolves the configured AI provider and its call config.
 * Throws AINotConfiguredError if AI_API_KEY is missing, or if AI_PROVIDER names
 * a provider with no implementation.
 */
export function getConfiguredAI(maxTokens: number): { provider: AIProvider; config: AIProviderConfig } {
  const explicit = (process.env.AI_PROVIDER || '').trim().toLowerCase();
  const apiKey = (process.env.AI_API_KEY || '').trim();
  if (!apiKey) {
    throw new AINotConfiguredError('AI features are not configured (AI_API_KEY is missing).');
  }

  // An OpenAI-shaped key with AI_PROVIDER=anthropic is always a misconfiguration,
  // and the vendor's own 401 blames the key instead of the pairing. Say so here.
  if (explicit === 'anthropic' && apiKey.startsWith('sk-') && !apiKey.startsWith('sk-ant-')) {
    throw new AINotConfiguredError(
      'AI_PROVIDER is set to "anthropic" but AI_API_KEY looks like an OpenAI key (it starts with "sk-", not "sk-ant-"). Set AI_PROVIDER=openai, or supply an Anthropic key.'
    );
  }

  const providerName = explicit || inferProvider(apiKey);

  let provider: AIProvider;
  try {
    provider = getAIProvider(providerName);
  } catch (err) {
    throw new AINotConfiguredError(err instanceof Error ? err.message : 'AI provider is not configured.');
  }

  const model = process.env.AI_MODEL || DEFAULT_MODELS[providerName] || DEFAULT_MODELS.anthropic;
  return { provider, config: { apiKey, model, maxTokens } };
}
