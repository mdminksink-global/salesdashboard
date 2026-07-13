import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, isValid } from 'date-fns';
import { computeTotals } from './utils';

// ── Seller / brand block on the PDF (edit to your company details) ──
export const COMPANY = {
  name: 'MDM INKS',
  tagline: 'Printing Inks & Supplies',
  address: 'Your address line, City, PIN',
  phone: '+91 00000 00000',
  email: 'sales@mdminks.com',
};

const BRAND = [79, 70, 229];   // brand-600 indigo
const INK = [15, 23, 42];      // slate-900
const MUTED = [100, 116, 139]; // slate-500

// jsPDF core fonts don't include the ₹ glyph → use "Rs." to stay safe.
export function rupee(n) {
  return 'Rs. ' + Number(n || 0).toLocaleString('en-IN');
}

function d(value) {
  if (!value) return '—';
  const dt = typeof value === 'string' ? parseISO(value) : value;
  return isValid(dt) ? format(dt, 'dd MMM yyyy') : '—';
}

export function buildQuoteDoc(quote, seller = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 16;
  const items = quote.items || [];
  const { subtotal, tax, total } = computeTotals(items, quote.tax_percent, quote.discount);

  // Header band
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
  doc.text(COMPANY.name, M, 15);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(COMPANY.tagline, M, 21);
  doc.setFontSize(22); doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION', W - M, 16, { align: 'right' });

  // Seller + meta
  let y = 40;
  doc.setTextColor(...MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text([COMPANY.address, `${COMPANY.phone}  ·  ${COMPANY.email}`], M, y);
  doc.setTextColor(...INK); doc.setFontSize(10);
  doc.text(`Quote #: ${quote.quote_number || '—'}`, W - M, y, { align: 'right' });
  doc.setTextColor(...MUTED); doc.setFontSize(9);
  doc.text(`Date: ${d(quote.quote_date)}`, W - M, y + 5, { align: 'right' });
  if (quote.valid_until) doc.text(`Valid until: ${d(quote.valid_until)}`, W - M, y + 10, { align: 'right' });

  // Bill To
  y = 60;
  doc.setDrawColor(226, 232, 240); doc.line(M, y - 4, W - M, y - 4);
  doc.setTextColor(...MUTED); doc.setFontSize(8); doc.text('BILL TO', M, y);
  doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text(quote.client_name || '—', M, y + 6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
  const billLines = [quote.company, quote.phone, quote.email].filter(Boolean);
  if (billLines.length) doc.text(billLines, M, y + 11);

  // Items table
  autoTable(doc, {
    startY: y + 20,
    head: [['#', 'Item', 'Qty', 'Rate', 'Amount']],
    body: items.map((it, i) => [
      i + 1,
      it.name || '—',
      String(it.qty ?? ''),
      rupee(it.price),
      rupee((Number(it.qty) || 0) * (Number(it.price) || 0)),
    ]),
    theme: 'striped',
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: INK },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 32 },
    },
    margin: { left: M, right: M },
  });

  // Totals
  let ty = doc.lastAutoTable.finalY + 8;
  const rightX = W - M;
  const labelX = W - M - 55;
  const row = (label, val, bold) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 11 : 9.5);
    doc.setTextColor(...(bold ? INK : MUTED));
    doc.text(label, labelX, ty);
    doc.setTextColor(...INK);
    doc.text(val, rightX, ty, { align: 'right' });
    ty += bold ? 7 : 6;
  };
  row('Subtotal', rupee(subtotal));
  if (Number(quote.tax_percent)) row(`Tax (${quote.tax_percent}%)`, rupee(tax));
  if (Number(quote.discount)) row('Discount', '- ' + rupee(quote.discount));
  doc.setDrawColor(226, 232, 240); doc.line(labelX, ty - 3, rightX, ty - 3);
  row('Total', rupee(total), true);

  // Notes / terms
  let ny = Math.max(ty + 6, doc.lastAutoTable.finalY + 8);
  if (quote.notes) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...INK);
    doc.text('Notes', M, ny); ny += 5;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(quote.notes, W - 2 * M), M, ny); ny += 12;
  }
  if (quote.terms) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...INK);
    doc.text('Terms & Conditions', M, ny); ny += 5;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(quote.terms, W - 2 * M), M, ny);
  }

  // Footer
  const H = doc.internal.pageSize.getHeight();
  doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text(`${quote.client_name ? 'Prepared for ' + quote.client_name + '  ·  ' : ''}${seller.name || seller.email || ''}`, M, H - 10);
  doc.text('Generated with MDM Inks Sales CRM', W - M, H - 10, { align: 'right' });

  return doc;
}

export function quotePdfBlob(quote, seller) {
  return buildQuoteDoc(quote, seller).output('blob');
}

export function downloadQuotePdf(quote, seller) {
  buildQuoteDoc(quote, seller).save(`${quote.quote_number || 'quote'}.pdf`);
}

// Digits for wa.me (India-aware, mirrors ContactActions)
function waDigits(phone) {
  const x = String(phone || '').replace(/\D/g, '');
  if (!x) return '';
  if (x.length === 10) return '91' + x;
  if (x.startsWith('0') && x.length === 11) return '91' + x.slice(1);
  return x;
}

/**
 * Share a quote on WhatsApp. On mobile with the Web Share API we attach the
 * actual PDF; otherwise we download the PDF and open WhatsApp with a summary.
 */
export async function shareQuoteOnWhatsApp(quote, seller) {
  const { total } = computeTotals(quote.items, quote.tax_percent, quote.discount);
  const msg =
    `Hi ${quote.client_name || ''}, please find quotation ${quote.quote_number} from ${COMPANY.name}.\n` +
    `Total: ${rupee(total)}${quote.valid_until ? `\nValid until: ${d(quote.valid_until)}` : ''}`;

  const blob = quotePdfBlob(quote, seller);
  const file = new File([blob], `${quote.quote_number || 'quote'}.pdf`, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: quote.quote_number, text: msg });
      return;
    } catch { /* user cancelled — fall through */ }
  }

  // Fallback: download the PDF, then open WhatsApp with the message.
  downloadQuotePdf(quote, seller);
  const wa = waDigits(quote.phone);
  const url = `https://wa.me/${wa}?text=${encodeURIComponent(msg + '\n\n(PDF downloaded — please attach it.)')}`;
  window.open(url, '_blank', 'noopener');
}
