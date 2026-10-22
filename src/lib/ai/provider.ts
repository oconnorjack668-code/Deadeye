// src/lib/ai/provider.ts
import { coachPrompt } from './persona';

export interface CoachingEvidence {
  sessionType: string;
  sessionDate: string;
  duration: number;
  intensity: number;
  perceivedQuality?: number;
  shootingPercentage?: number;
  totalMakes?: number;
  totalAttempts?: number;
  zoneBreakdown?: Array<{ zone: string; makes: number; attempts: number }>;
  drillsCompleted?: string[];
  playerNotes?: string;
  previousFeedbackSummary?: string;
}

export interface CoachingOutput {
  summary: string;
  keyInsights: string[];
  recommendations: string[];
  comparisonToPrevious?: string;
}

/** What a call is for: a chat answer, or a report (session, video, weekly, style match). */
export type AIUse = 'chat' | 'report';

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  /** The longest answer wanted, in tokens */
  maxTokens: number;
  use?: AIUse;
}

/**
 * The size and effort of a Claude request.
 *
 * Current Claude models (the 4.6 line on, and every 5 model) think before they
 * answer, and that thinking counts against max_tokens. With max_tokens set to
 * the answer length alone, a long think left a short or empty answer. So these
 * models get an effort level (low for chat: quick, cheap; medium for reports:
 * worth thinking about) and room for that thinking on top of the answer.
 * Older models take neither.
 */
export function claudeRequestShape(model: string, maxTokens: number, use: AIUse = 'report'): {
  max_tokens: number;
  output_config?: { effort: 'low' | 'medium' };
} {
  if (!/^claude-(opus|sonnet|haiku|fable|mythos)-(5|4-[678])/.test(model)) return { max_tokens: maxTokens };
  return use === 'chat'
    ? { max_tokens: maxTokens + 1024, output_config: { effort: 'low' } }
    : { max_tokens: maxTokens + 4096, output_config: { effort: 'medium' } };
}

export abstract class AIProvider {
  abstract readonly name: string;

  abstract generateCoachingSummary(
    evidence: CoachingEvidence,
    config: AIProviderConfig
  ): Promise<CoachingOutput>;

  /** Sends one system + user prompt and returns the parsed JSON object. */
  abstract generateJson(system: string, user: string, config: AIProviderConfig): Promise<Record<string, unknown>>;

  /** Plain-text multi-turn chat completion. */
  abstract generateChat(messages: ChatMessage[], config: AIProviderConfig): Promise<string>;
}

// The failure mode this guards against is the one players actually punish.
// Reviewers of other apps' AI coaches say it "won't tell me anything that I
// don't already know" - advice that reads as generic is worse than no advice,
// because it teaches the player the feature is filler. So every claim has to
// carry the number it came from, and having too little to say is an acceptable
// answer rather than a reason to pad.
const SYSTEM_PROMPT = coachPrompt(`Your task: give the player specific, actionable feedback on one training session.
Only use the numbers provided.

Every insight must quote the number it comes from. "Your top-of-the-key threes
were 4/15, 27%" is useful; "work on your shooting consistency" is not, and a
player will read it as filler.

Say less rather than padding. If the session is too small or too plain to
support three insights, give one or two. Two sharp observations beat three with
a vague one among them, and the player can tell the difference.

Never recommend something the data does not point at. If the numbers only
support "keep doing what you did", say that.

Respond with a JSON object with these keys:
- "summary": 2-3 sentences on session quality and the key takeaway
- "keyInsights": array of 1-3 specific observations, each quoting its numbers
- "recommendations": array of 1-3 concrete things to do next session
- "comparisonToPrevious": one sentence comparing to the previous feedback if it is provided, otherwise omit`);

function buildPrompt(evidence: CoachingEvidence): string {
  const lines = [
    `Session date: ${evidence.sessionDate}`,
    `Session type: ${evidence.sessionType}`,
    `Duration: ${evidence.duration} minutes`,
    `Intensity (RPE): ${evidence.intensity}/10`,
  ];
  if (evidence.perceivedQuality) lines.push(`Player-rated quality: ${evidence.perceivedQuality}/5`);
  if (evidence.totalAttempts) {
    lines.push(
      `Shooting: ${evidence.totalMakes}/${evidence.totalAttempts} (${evidence.shootingPercentage?.toFixed(1)}%)`
    );
  }
  if (evidence.zoneBreakdown?.length) {
    lines.push(
      `By zone: ${evidence.zoneBreakdown
        .map((z) => `${z.zone} ${z.makes}/${z.attempts}`)
        .join(', ')}`
    );
  }
  if (evidence.drillsCompleted?.length) lines.push(`Drills: ${evidence.drillsCompleted.join(', ')}`);
  if (evidence.playerNotes) lines.push(`Player notes: ${evidence.playerNotes}`);
  if (evidence.previousFeedbackSummary) {
    lines.push(`Previous session feedback: ${evidence.previousFeedbackSummary}`);
  }
  return lines.join('\n');
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/** Parses a JSON object from a model response, tolerating a ```json fence around it. */
function extractJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    // fall through to fence stripping below
  }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]) as Record<string, unknown>;
    } catch {
      // fall through to the error below
    }
  }
  throw new Error('The AI returned a response in an unexpected format');
}

function summaryFromJson(parsed: Record<string, unknown>, providerLabel: string): CoachingOutput {
  if (typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
    throw new Error(`${providerLabel} returned feedback without a summary`);
  }
  return {
    summary: parsed.summary,
    keyInsights: asStringArray(parsed.keyInsights),
    recommendations: asStringArray(parsed.recommendations),
    comparisonToPrevious:
      typeof parsed.comparisonToPrevious === 'string' ? parsed.comparisonToPrevious : undefined,
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// OpenAI implementation
export class OpenAIProvider extends AIProvider {
  readonly name = 'openai';

  /** Sends one system + user prompt to OpenAI in JSON mode and returns the parsed object. */
  async generateJson(system: string, user: string, config: AIProviderConfig): Promise<Record<string, unknown>> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!response.ok) {
      // OpenAI puts the useful reason (bad key, unknown model, no quota) in the body
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(`OpenAI API error (${response.status}): ${body?.error?.message || response.statusText}`);
    }
    const data = (await response.json()) as { choices: Array<{ message: { content: string | null } }> };
    const content = data.choices[0]?.message.content;
    if (!content) throw new Error('No response from OpenAI');
    return extractJson(content);
  }

  /** Plain-text chat completion (AI Coach chat). */
  async generateChat(messages: ChatMessage[], config: AIProviderConfig): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.model, max_tokens: config.maxTokens, temperature: 0.6, messages }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(`OpenAI API error (${response.status}): ${body?.error?.message || response.statusText}`);
    }
    const data = (await response.json()) as { choices: Array<{ message: { content: string | null } }> };
    const content = data.choices[0]?.message.content?.trim();
    if (!content) throw new Error('No response from OpenAI');
    return content;
  }

  async generateCoachingSummary(evidence: CoachingEvidence, config: AIProviderConfig): Promise<CoachingOutput> {
    const parsed = await this.generateJson(SYSTEM_PROMPT, buildPrompt(evidence), config);
    return summaryFromJson(parsed, 'OpenAI');
  }
}

// Anthropic (Claude) implementation
export class AnthropicProvider extends AIProvider {
  readonly name = 'anthropic';
  private static readonly API_VERSION = '2023-06-01';

  private async send(system: string, messages: Array<{ role: 'user' | 'assistant'; content: string }>, config: AIProviderConfig): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': AnthropicProvider.API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: config.model, ...claudeRequestShape(config.model, config.maxTokens, config.use), system, messages }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(`Anthropic API error (${response.status}): ${body?.error?.message || response.statusText}`);
    }
    const data = (await response.json()) as { content: Array<{ type: string; text?: string }>; stop_reason?: string };
    // Thinking blocks come first; the answer is the text block after them
    const text = data.content?.find((block) => block.type === 'text')?.text;
    if (!text) throw new Error(data.stop_reason === 'refusal' ? 'The AI coach declined to answer that' : 'No response from Anthropic');
    return text;
  }

  async generateJson(system: string, user: string, config: AIProviderConfig): Promise<Record<string, unknown>> {
    const jsonSystem = `${system}\n\nRespond with ONLY the JSON object and no other text, markdown, or explanation.`;
    const text = await this.send(jsonSystem, [{ role: 'user', content: user }], config);
    return extractJson(text);
  }

  async generateChat(messages: ChatMessage[], config: AIProviderConfig): Promise<string> {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const turns = messages
      .filter((m): m is ChatMessage & { role: 'user' | 'assistant' } => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));
    const text = await this.send(system, turns, config);
    return text.trim();
  }

  async generateCoachingSummary(evidence: CoachingEvidence, config: AIProviderConfig): Promise<CoachingOutput> {
    const parsed = await this.generateJson(SYSTEM_PROMPT, buildPrompt(evidence), config);
    return summaryFromJson(parsed, 'Anthropic');
  }
}

export function getAIProvider(provider: string): AIProvider {
  switch (provider.toLowerCase()) {
    case 'anthropic':
      return new AnthropicProvider();
    case 'openai':
      return new OpenAIProvider();
    default:
      throw new Error(`AI provider "${provider}" is not supported. Set AI_PROVIDER to "anthropic" or "openai".`);
  }
}
