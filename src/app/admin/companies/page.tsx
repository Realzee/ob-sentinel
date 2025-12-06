// app/admin/companies/page.tsx
import CompanyManagement from '@/components/admin/CompanyManagement';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function CompaniesPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  // Check if user is admin
  const userRole = session.user.user_metadata?.role;
  if (userRole !== 'admin') {
    redirect('/dashboard');
  }

  return <CompanyManagement user={session.user} />;
}