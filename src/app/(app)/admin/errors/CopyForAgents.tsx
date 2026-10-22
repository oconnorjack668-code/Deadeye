// src/app/(app)/admin/errors/CopyForAgents.tsx
// "Copy for the agents": the open reports with names and contact details
// taken out (src/lib/redact.ts), for support-triage. Shown first, so the
// founder sees exactly what they are copying.
'use client';

import React, { useState } from 'react';
import { Check, ClipboardCopy } from 'lucide-react';

export function CopyForAgents({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard permission: the text is in the box to copy by hand
    }
  }

  return (
    <details className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-white">Copy for the agents</summary>
      <p className="mt-2 text-xs text-zinc-400">
        Open reports and crashes with names, emails, numbers and links taken out. Read it before you paste it: free text can
        still hold something no rule catches. Paste it to support-triage, or save it as docs/agent-os/data/YYYY-MM-DD-reports.md.
      </p>
      <textarea readOnly value={text} rows={10} className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-200" />
      <button
        type="button"
        onClick={copy}
        className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500"
      >
        {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}
      </button>
    </details>
  );
}
