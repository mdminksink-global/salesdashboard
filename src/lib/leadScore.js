import { daysUntil } from './utils';

// Pure, rule-based lead scoring + next-best-action. No LLM, no keys.
const CATEGORY_ADJ = {
  'Hot Lead': 25, 'Warm Lead': 10, 'Cold Lead': -10,
  'Active Client': 20, 'Inactive': -20, 'Blacklisted': -100,
};
const STATUS_ADJ = {
  'Order Placed': 15, 'Meeting Scheduled': 10, 'Follow-Up Required': 5,
  'Visited': 0, 'No Response': -5, 'Not Interested': -15,
};

function daysSince(dateStr) {
  const d = daysUntil(dateStr);
  return d === null ? null : -d; // positive = in the past
}

/**
 * @returns { score 0-100, tier, action, urgency: 'high'|'medium'|'low', reasons[] }
 */
export function scoreClient(client = {}, clientVisits = []) {
  const visits = [...clientVisits].sort((a, b) => (a.visit_date < b.visit_date ? 1 : -1));
  const last = visits[0];
  const orders = visits.filter((v) => v.order_received);
  const revenue = orders.reduce((s, v) => s + (Number(v.order_value) || 0), 0);
  const sinceLast = last ? daysSince(last.visit_date) : null;
  const reasons = [];

  let score = 40;
  score += CATEGORY_ADJ[client.category] ?? 0;
  if (client.category) reasons.push(`${client.category}`);

  if (orders.length) { score += 20; reasons.push(`${orders.length} order${orders.length > 1 ? 's' : ''}`); }
  if (revenue >= 100000) score += 15;
  else if (revenue >= 25000) score += 8;

  if (sinceLast !== null) {
    if (sinceLast <= 7) { score += 10; reasons.push('visited this week'); }
    else if (sinceLast <= 30) score += 5;
    else if (sinceLast > 90) { score -= 20; reasons.push(`quiet ${sinceLast}d`); }
    else if (sinceLast > 60) score -= 10;
  } else {
    reasons.push('no visits yet');
  }

  if (last) score += STATUS_ADJ[last.visit_status] ?? 0;

  const nextDue = last ? daysUntil(last.next_visit_date) : null;
  if (nextDue !== null && nextDue >= 0) { score += 5; }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const tier = score >= 70 ? 'Hot' : score >= 40 ? 'Warm' : 'Cold';

  // ── Next best action (priority order) ──
  let action = 'Schedule next visit', urgency = 'low';
  const lastStatus = last?.visit_status;

  if (client.category === 'Blacklisted') {
    action = 'Skip — blacklisted'; urgency = 'low';
  } else if (!last) {
    action = 'Log the first visit'; urgency = 'medium';
  } else if (nextDue !== null && nextDue < 0) {
    action = `Follow up now — overdue ${Math.abs(nextDue)}d`; urgency = 'high';
  } else if (nextDue === 0) {
    action = 'Scheduled for today — reach out'; urgency = 'high';
  } else if (lastStatus === 'Meeting Scheduled') {
    action = 'Confirm the meeting'; urgency = 'high';
  } else if (lastStatus === 'Follow-Up Required') {
    action = 'Send the follow-up'; urgency = 'medium';
  } else if (lastStatus === 'No Response') {
    action = 'No answer last time — try WhatsApp'; urgency = 'medium';
  } else if (lastStatus === 'Order Placed') {
    action = 'Thank them & pitch a reorder'; urgency = 'medium';
  } else if (sinceLast !== null && sinceLast > 45 && orders.length) {
    action = `Re-engage — no contact in ${sinceLast}d`; urgency = 'high';
  } else if (lastStatus === 'Not Interested') {
    action = 'Low priority — revisit next quarter'; urgency = 'low';
  } else if (nextDue !== null && nextDue > 0) {
    action = `Next visit in ${nextDue}d`; urgency = 'low';
  }

  return { score, tier, action, urgency, reasons: reasons.slice(0, 3) };
}

export const TIER_STYLE = {
  Hot:  'text-rose-700 bg-rose-50 ring-rose-200',
  Warm: 'text-amber-700 bg-amber-50 ring-amber-200',
  Cold: 'text-sky-700 bg-sky-50 ring-sky-200',
};
export const URGENCY_DOT = { high: 'bg-rose-500', medium: 'bg-amber-500', low: 'bg-slate-300' };
