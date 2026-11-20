"use client";
import { useHydrated } from '@/lib/use-hydrated';
import { LEAD_REQUEST_EVENT } from '@/lib/lead-request';

export default function LeadButton({ className, label = 'Оставить заявку', details = '' }: { className?: string; label?: string; details?: string }) {
  const ready = useHydrated();
  return <button disabled={!ready} type="button" className={className} data-analytics-goal="lead_open" onClick={() => window.dispatchEvent(new CustomEvent(LEAD_REQUEST_EVENT, { detail: { details } }))}>
    {label}
  </button>;
}
