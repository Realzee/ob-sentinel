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

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (!session || sessionError) {
    console.error('No session or session error:', sessionError);
    redirect('/');
  }

  // Get user profile with company info
  let profile = null;
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*, company:companies(*)')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      // Continue without profile data
    } else {
      profile = profileData;
    }
  } catch (error) {
    console.error('Exception fetching user profile:', error);
    // Continue without profile data
  }

  // Get user role from metadata or profile
  const userRole = session.user.user_metadata?.role || profile?.role || 'user';

  // Render different dashboard based on role
  switch (userRole) {
    case 'admin':
      return <MainDashboard user={{ ...session.user, ...profile }} />;

    case 'controller':
      return <ControllerDashboard user={{ ...session.user, ...profile }} />;

    case 'responder':
      return <ResponderDashboard user={{ ...session.user, ...profile }} />;

    default:
      return <MainDashboard user={{ ...session.user, ...profile }} />;
  }
}
