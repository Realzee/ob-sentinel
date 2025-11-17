import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import AuthSetup from '@/components/auth/AuthSetup';


const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RAPID iREPORT - Community Safety Reporting System',
  description: 'Real-time community safety reporting and dispatch system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AuthSetup />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}