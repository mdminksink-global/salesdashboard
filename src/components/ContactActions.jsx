import { Phone, MessageCircle, Mail, MapPin, Send } from 'lucide-react';
import { classNames } from '../lib/utils';

// Normalize an Indian phone number to international digits for wa.me
function waDigits(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 10) return '91' + d;         // bare 10-digit → prefix India
  if (d.startsWith('0') && d.length === 11) return '91' + d.slice(1);
  return d;
}

function Action({ href, label, icon: Icon, tone }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={label}
      aria-label={label}
      className={classNames(
        'inline-flex items-center justify-center h-9 w-9 rounded-lg ring-1 transition-colors cursor-pointer',
        tone
      )}
    >
      <Icon className="h-4 w-4" />
    </a>
  );
}

/**
 * Row of tap-to-contact buttons. Only renders actions that have data.
 * `size="lg"` shows labelled buttons (used on the Client 360 page).
 */
export default function ContactActions({ phone, email, address, size = 'sm', className }) {
  const wa = waDigits(phone);
  const tel = String(phone || '').replace(/[^\d+]/g, '');

  if (size === 'lg') {
    const Btn = ({ href, label, icon: Icon, tone }) =>
      href ? (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className={classNames('btn text-sm flex-1 min-w-[120px]', tone)}>
          <Icon className="h-4 w-4" /> {label}
        </a>
      ) : null;
    return (
      <div className={classNames('flex flex-wrap gap-2', className)}>
        <Btn href={tel && `tel:${tel}`} label="Call" icon={Phone} tone="bg-brand-600 text-white hover:bg-brand-700" />
        <Btn href={wa && `https://wa.me/${wa}`} label="WhatsApp" icon={MessageCircle} tone="bg-emerald-600 text-white hover:bg-emerald-700" />
        <Btn href={tel && `sms:${tel}`} label="SMS" icon={Send} tone="btn-ghost" />
        <Btn href={email && `mailto:${email}`} label="Email" icon={Mail} tone="btn-ghost" />
        <Btn href={address && `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} label="Directions" icon={MapPin} tone="btn-ghost" />
      </div>
    );
  }

  return (
    <div className={classNames('flex items-center gap-1.5', className)}>
      {tel && <Action href={`tel:${tel}`} label="Call" icon={Phone} tone="text-brand-700 bg-brand-50 ring-brand-200 hover:bg-brand-100" />}
      {wa && <Action href={`https://wa.me/${wa}`} label="WhatsApp" icon={MessageCircle} tone="text-emerald-700 bg-emerald-50 ring-emerald-200 hover:bg-emerald-100" />}
      {email && <Action href={`mailto:${email}`} label="Email" icon={Mail} tone="text-slate-600 bg-slate-100 ring-slate-200 hover:bg-slate-200" />}
      {address && <Action href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} label="Directions" icon={MapPin} tone="text-slate-600 bg-slate-100 ring-slate-200 hover:bg-slate-200" />}
    </div>
  );
}
