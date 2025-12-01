// src/components/companies/CompanyManagement.tsx - FIXED VERSION
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface Company {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  user_count?: number;
  subscription_plan?: string;
}

const CompanyManagement = () => {
  const { user, loading } = useAuth(); // Changed from isLoading to loading
  const router = useRouter();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    status: 'active' as 'active' | 'inactive' | 'pending'
  });

  // Get token from user session
  const getToken = async (): Promise<string | null> => {
    if (!user) return null;
    
    // Try to get token from session
    const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());
    return session?.access_token || null;
  };

  // Check if user has access to company management
  const userRole = user?.user_metadata?.role || user?.role;
  const canManageCompanies = userRole && ['admin', 'administrator', 'company_admin'].includes(userRole);

  useEffect(() => {
    console.log('CompanyManagement Debug:', {
      user,
      userRole,
      canManageCompanies,
      loading
    });

    if (loading) {
      return; // Wait for auth to load
    }

    if (!canManageCompanies) {
      setError('You do not have permission to access company management');
      setCompaniesLoading(false);
      return;
    }
    
    fetchCompanies();
  }, [user, canManageCompanies, loading]);

  const fetchCompanies = async () => {
    const token = await getToken();
    
    if (!token || !canManageCompanies) {
      setError('Authentication required');
      return;
    }

    setCompaniesLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/companies', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 403) {
        setError('Access denied: You do not have permission to view companies');
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch companies: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Fetched companies:', data);
      setCompanies(data);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setCompaniesLoading(false);
    }
  };

  const handleOpenDialog = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        name: company.name,
        email: company.email,
        phone: company.phone || '',
        address: company.address || '',
        status: company.status
      });
    } else {
      setEditingCompany(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        status: 'active'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCompany(null);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) {
      setError('Company name and email are required');
      return;
    }

    const token = await getToken();
    if (!token) {
      setError('Authentication required');
      return;
    }

    try {
      const url = editingCompany 
        ? `/api/admin/companies/${editingCompany.id}`
        : '/api/admin/companies';
      
      const method = editingCompany ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingCompany ? 'update' : 'create'} company`);
      }

      setSuccess(editingCompany ? 'Company updated successfully' : 'Company created successfully');
      fetchCompanies();
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving company:', err);
      setError(err instanceof Error ? err.message : 'Failed to save company');
    }
  };

  const handleDelete = async (companyId: string) => {
    if (!window.confirm('Are you sure you want to delete this company?')) {
      return;
    }

    const token = await getToken();
    if (!token) {
      setError('Authentication required');
      return;
    }

    try {
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete company');
      }

      setSuccess('Company deleted successfully');
      fetchCompanies();
    } catch (err) {
      console.error('Error deleting company:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete company');
    }
  };

  const handleViewUsers = (companyId: string) => {
    router.push(`/admin/companies/${companyId}/users`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  // Show loading while auth is loading
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Check permissions
  if (!canManageCompanies) {
    return (
      <Box sx={{ p: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h5" color="error" gutterBottom>
              Access Denied
            </Typography>
            <Typography>
              You do not have permission to access company management.
              Only administrators and company admins can access this section.
            </Typography>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Debug Info:</strong>
              </Typography>
              <Typography variant="body2">
                User ID: {user?.id || 'Not logged in'}
              </Typography>
              <Typography variant="body2">
                User Email: {user?.email || 'No email'}
              </Typography>
              <Typography variant="body2">
                User Role: {userRole || 'No role assigned'}
              </Typography>
              <Typography variant="body2">
                Required Roles: admin, administrator, company_admin
              </Typography>
              <Typography variant="body2">
                Your user metadata: {JSON.stringify(user?.user_metadata || {})}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Company Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchCompanies}
            disabled={companiesLoading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Company
          </Button>
        </Box>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Companies
              </Typography>
              <Typography variant="h4">
                {companies.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Companies
              </Typography>
              <Typography variant="h4" color="success.main">
                {companies.filter(c => c.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Loading State */}
      {companiesLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && !companiesLoading && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Success Message */}
      {success && (
        <Snackbar
          open={!!success}
          autoHideDuration={6000}
          onClose={() => setSuccess(null)}
          message={success}
        />
      )}

      {/* Companies Table */}
      {!companiesLoading && !error && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                <TableCell sx={{ color: 'white' }}>Company Name</TableCell>
                <TableCell sx={{ color: 'white' }}>Email</TableCell>
                <TableCell sx={{ color: 'white' }}>Phone</TableCell>
                <TableCell sx={{ color: 'white' }}>Status</TableCell>
                <TableCell sx={{ color: 'white' }}>Created</TableCell>
                <TableCell sx={{ color: 'white' }}>Users</TableCell>
                <TableCell sx={{ color: 'white' }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body1" sx={{ py: 3 }}>
                      No companies found. Click "Add Company" to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow key={company.id} hover>
                    <TableCell>
                      <Typography fontWeight="medium">
                        {company.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{company.email}</TableCell>
                    <TableCell>{company.phone || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={company.status.toUpperCase()}
                        color={getStatusColor(company.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(company.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {company.user_count || 0}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <IconButton
                          size="small"
                          title="View Users"
                          onClick={() => handleViewUsers(company.id)}
                          color="primary"
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          title="Edit Company"
                          onClick={() => handleOpenDialog(company)}
                          color="secondary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          title="Delete Company"
                          onClick={() => handleDelete(company.id)}
                          color="error"
                          disabled={!!(company.user_count && company.user_count > 0)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCompany ? 'Edit Company' : 'Add New Company'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Company Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingCompany ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompanyManagement;