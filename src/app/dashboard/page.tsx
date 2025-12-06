// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import MainDashboard from '@/components/dashboard/MainDashboard';
import ControllerDashboard from '@/components/dashboards/ControllerDashboard';
import ResponderDashboard from '@/components/dashboards/ResponderDashboard';

export default async function DashboardPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  // Get user profile with company info
  const { data: profile } = await supabase
    .from('users')
    .select('*, company:companies(*)')
    .eq('id', session.user.id)
    .single();

  // Get user role from metadata
  const userRole = session.user.user_metadata?.role || 'user';

  // Render different dashboard based on role
  switch (userRole) {
    case 'controller':
      return <ControllerDashboard user={{ ...session.user, ...profile }} />;
    
    case 'responder':
      return <ResponderDashboard user={{ ...session.user, ...profile }} />;
    
    default:
      return <MainDashboard user={{ ...session.user, ...profile }} />;
  }
}