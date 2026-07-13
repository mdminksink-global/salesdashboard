// Supabase Edge Function: ai
// Proxies to a FREE LLM tier (Groq) so the browser never sees the key.
//
// Deploy:   supabase functions deploy ai   (or paste into the Supabase dashboard editor)
// Secret:   supabase secrets set GROQ_API_KEY=gsk_...   (free key: https://console.groq.com/keys)
// Optional: supabase secrets set GROQ_MODEL=llama-3.3-70b-versatile   (default below)
//
// Called from the app via supabase.functions.invoke('ai', { body: { task, payload } }).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const KEY = Deno.env.get('GROQ_API_KEY');
const MODEL = Deno.env.get('GROQ_MODEL') || 'llama-3.3-70b-versatile';

function buildPrompt(task: string, payload: any): string {
  const ctx = JSON.stringify(payload ?? {});
  switch (task) {
    case 'client_summary':
      return `You are a B2B sales assistant for an Indian printing-ink company. ` +
        `In 3-4 short bullet points, summarise this client relationship, then add one line "Next step: ...". ` +
        `Be concrete and practical. Data:\n${ctx}`;
    case 'draft_message':
      return `Write a short, warm WhatsApp follow-up (max 4 lines) from a sales rep to this client. ` +
        `Use the real name; no placeholders. Indian B2B ink sales. Context:\n${ctx}`;
    case 'polish_note':
      return `Rewrite this rough, dictated sales-visit note into one clean, professional sentence. ` +
        `Keep all facts, fix grammar, no preamble. Note:\n${payload?.text ?? ''}`;
    default:
      return `Respond helpfully and concisely.\n${ctx}`;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!KEY) return json({ error: 'AI not configured', hint: 'Set GROQ_API_KEY secret on this function.' }, 501);

  const { task = 'client_summary', payload = {} } = await req.json().catch(() => ({}));
  const prompt = buildPrompt(task, payload);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a concise, practical B2B sales assistant. Never use markdown headers.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 600,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: 'LLM request failed', detail }, 502);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  return json({ text: text.trim() });
});
