import type { ReactNode } from 'react';
import Shell from '@/studio/components/Shell';
import { requireStaff } from '@/studio/session';

export default async function StudioAppLayout({ children }: { children: ReactNode }) {
  const { user, can } = await requireStaff();
  return (
    <Shell user={{ email: user.email, name: user.name ?? null }} can={can}>
      {children}
    </Shell>
  );
}
