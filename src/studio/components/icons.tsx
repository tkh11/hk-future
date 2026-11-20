import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;
const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export const OverviewIcon = (p: IconProps) => <svg {...base} {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>;
export const BoxIcon = (p: IconProps) => <svg {...base} {...p}><path d="M12 3 3.5 7.5v9L12 21l8.5-4.5v-9L12 3Z" /><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" /></svg>;
export const ImageIcon = (p: IconProps) => <svg {...base} {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m20.5 16-4.5-4.5-8 8" /></svg>;
export const GlobeIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5Z" /></svg>;
export const GearIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" /></svg>;
export const SearchIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>;
export const ExternalIcon = (p: IconProps) => <svg {...base} width={14} height={14} {...p}><path d="M8 16 16 8M9 8h7v7" /></svg>;
export const SortIcon = ({ direction, ...p }: IconProps & { direction?: 'asc' | 'desc' }) => (
  <svg {...base} width={12} height={12} {...p}>
    {direction === 'asc' ? <path d="m6 15 6-6 6 6" /> : direction === 'desc' ? <path d="m6 9 6 6 6-6" /> : <path d="m8 10 4-4 4 4M8 14l4 4 4-4" />}
  </svg>
);
export const CloseIcon = (p: IconProps) => <svg {...base} width={16} height={16} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const ChevronLeftIcon = (p: IconProps) => <svg {...base} {...p}><path d="m14.5 6-5 6 5 6" /></svg>;
export const ProductsIcon = (p: IconProps) => <svg {...base} {...p}><rect x="3.5" y="3.5" width="7" height="17" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>;
export const VariantsIcon = (p: IconProps) => <svg {...base} {...p}><path d="m12 3.5 8 3.5-8 3.5-8-3.5 8-3.5Z" /><path d="m4 12 8 3.5 8-3.5M4 16.5 12 20l8-3.5" /></svg>;
export const CategoriesIcon = (p: IconProps) => <svg {...base} {...p}><path d="M3.5 7.5h6l1.6-2h9.4V18a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 18V7.5Z" /></svg>;
export const DocumentsIcon = (p: IconProps) => <svg {...base} {...p}><path d="M7 3.5h7l4.5 4.5V20.5H7V3.5Z" /><path d="M14 3.5V8h4.5M9.5 12.5h5M9.5 16h5" /></svg>;
export const ImportIcon = (p: IconProps) => <svg {...base} {...p}><path d="M12 4v9" /><path d="m8 9.5 4 4 4-4" /><path d="M5 19h14" /></svg>;
export const PagesIcon = (p: IconProps) => <svg {...base} {...p}><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>;
export const ArticlesIcon = (p: IconProps) => <svg {...base} {...p}><path d="M5 5h9.5L19 9.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5Z" /><path d="M14 5v4.5H19M8 13h8M8 16.5h5" /></svg>;
export const ContactsIcon = (p: IconProps) => <svg {...base} {...p}><path d="M12 20.5s6-5 6-9.5a6 6 0 1 0-12 0c0 4.5 6 9.5 6 9.5Z" /><circle cx="12" cy="11" r="1.8" /></svg>;
export const MenuIcon = (p: IconProps) => <svg {...base} {...p}><path d="M9 7h11M9 12h11M9 17h11" /><circle cx="4.8" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="4.8" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="4.8" cy="17" r="1" fill="currentColor" stroke="none" /></svg>;
export const SolutionsIcon = (p: IconProps) => <svg {...base} {...p}><rect x="4" y="4" width="16" height="6" rx="1.5" /><rect x="4" y="14" width="16" height="6" rx="1.5" /><circle cx="7.5" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="7.5" cy="17" r="1" fill="currentColor" stroke="none" /></svg>;
export const SlidersIcon = (p: IconProps) => <svg {...base} {...p}><path d="M4 8h16M4 16h16" /><circle cx="9" cy="8" r="2" /><circle cx="15" cy="16" r="2" /></svg>;
export const UsersIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="9" cy="9" r="2.6" /><path d="M4.5 18.5c.7-2.4 2.4-3.6 4.5-3.6s3.8 1.2 4.5 3.6" /><circle cx="16" cy="9.5" r="2" /><path d="M16 14.9c1.8.2 3.1 1.2 3.6 3.1" /></svg>;
export const RedirectIcon = (p: IconProps) => <svg {...base} {...p}><path d="M5 16.5 16.5 5" /><path d="M9 5h7.5V12.5" /></svg>;
export const UserIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="12" cy="8" r="3" /><path d="M5.5 19.5c1.1-2.8 3.3-4.2 6.5-4.2s5.4 1.4 6.5 4.2" /></svg>;
export const LogoutIcon = (p: IconProps) => <svg {...base} {...p}><path d="M10 7V5.8A1.8 1.8 0 0 1 11.8 4h6.4A1.8 1.8 0 0 1 20 5.8v12.4a1.8 1.8 0 0 1-1.8 1.8h-6.4A1.8 1.8 0 0 1 10 18.2V17" /><path d="M13 12H4m0 0 2.6-2.6M4 12l2.6 2.6" /></svg>;
