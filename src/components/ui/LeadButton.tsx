"use client";
import { LEAD_REQUEST_EVENT } from '@/lib/lead-request';

export default function LeadButton({ className, label = 'Оставить заявку', details = '' }: { className?: string; label?: string; details?: string }) {
  return <button type="button" className={className} data-analytics-goal="lead_open" onClick={() => window.dispatchEvent(new CustomEvent(LEAD_REQUEST_EVENT, { detail: { details } }))}>
    {label}
  </button>;
}
