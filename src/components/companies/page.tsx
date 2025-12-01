// src/components/companies/page.tsx (or wherever your page is)
import CompanyManagement from './CompanyManagement'; // Relative import
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Company Management',
  description: 'Manage companies and their users',
};

export default function CompaniesPage() {
  return <CompanyManagement />;
}