// src/components/admin/UserManagementModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  Business as BusinessIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import {
  UserRole,
  UserStatus,
  AuthUser,
  Company,
  authAPI,
  companyAPI
} from '@/lib/supabase';

interface UserManagementModalProps {
  open: boolean;
  onClose: () => void;
  currentUserRole?: UserRole;
  currentUserCompanyId?: string;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({
  open,
  onClose,
  currentUserRole = 'user',
  currentUserCompanyId
}) => {
  // State
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // User creation modal
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user' as UserRole,
    company_id: '' as string | undefined
  });
  
  // Company creation modal
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  
  // User edit state
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [editUserOpen, setEditUserOpen] = useState(false);
  
  // Load data
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load users
      const usersData = await authAPI.getAllUsers(currentUserRole, currentUserCompanyId);
      setUsers(usersData);
      
      // Load companies (if admin)
      if (currentUserRole === 'admin' || currentUserRole === 'controller') {
        const companiesData = await companyAPI.getAllCompanies();
        setCompanies(companiesData);
      }
      
    } catch (err: any) {
      setError(`Failed to load data: ${err.message}`);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle create user
  const handleCreateUser = async () => {
    try {
      setError(null);
      
      // Validate
      if (!newUser.email || !newUser.password) {
        setError('Email and password are required');
        return;
      }
      
      const userData = {
        email: newUser.email,
        password: newUser.password,
        full_name: newUser.full_name || undefined,
        role: newUser.role,
        company_id: newUser.company_id || undefined
      };
      
      await authAPI.createUser(userData);
      
      setSuccess('User created successfully');
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        role: 'user',
        company_id: ''
      });
      setCreateUserOpen(false);
      loadData();
      
    } catch (err: any) {
      setError(`Failed to create user: ${err.message}`);
    }
  };

  // Handle create company
  const handleCreateCompany = async () => {
    try {
      setError(null);
      
      if (!newCompanyName.trim()) {
        setError('Company name is required');
        return;
      }
      
      // FIXED: Remove created_by field, it's handled in the API function
      await companyAPI.createCompany({ 
        name: newCompanyName.trim()
      });
      
      setSuccess('Company created successfully');
      setNewCompanyName('');
      setCreateCompanyOpen(false);
      loadData();
      
    } catch (err: any) {
      setError(`Failed to create company: ${err.message}`);
    }
  };

  // Handle update user role
  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      setError(null);
      
      const success = await authAPI.updateUserRole(userId, newRole);
      if (success) {
        setSuccess(`User role updated to ${newRole}`);
        loadData();
      } else {
        setError('Failed to update user role');
      }
    } catch (err: any) {
      setError(`Failed to update role: ${err.message}`);
    }
  };

  // Handle update user status
  const handleUpdateStatus = async (userId: string, newStatus: UserStatus) => {
    try {
      setError(null);
      
      const success = await authAPI.updateUserStatus(userId, newStatus);
      if (success) {
        setSuccess(`User status updated to ${newStatus}`);
        loadData();
      } else {
        setError('Failed to update user status');
      }
    } catch (err: any) {
      setError(`Failed to update status: ${err.message}`);
    }
  };

  // Handle assign user to company
  const handleAssignCompany = async (userId: string, companyId: string | null) => {
    try {
      setError(null);
      
      const success = await authAPI.assignUserToCompany(userId, companyId);
      if (success) {
        setSuccess(companyId ? 'User assigned to company' : 'User removed from company');
        loadData();
      } else {
        setError('Failed to assign user to company');
      }
    } catch (err: any) {
      setError(`Failed to assign company: ${err.message}`);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!window.confirm(`Are you sure you want to delete user ${userEmail}?`)) {
      return;
    }
    
    try {
      setError(null);
      
      const success = await authAPI.deleteUser(userId);
      if (success) {
        setSuccess('User deleted successfully');
        loadData();
      } else {
        setError('Failed to delete user');
      }
    } catch (err: any) {
      setError(`Failed to delete user: ${err.message}`);
    }
  };

  // Handle edit user
  const handleEditUser = (user: AuthUser) => {
    setEditingUser(user);
    setEditUserOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    
    try {
      setError(null);
      
      // Update user profile
      await authAPI.updateUserProfile(editingUser.id, {
        full_name: editingUser.user_metadata.full_name,
        company_id: editingUser.company_id
      });
      
      setSuccess('User updated successfully');
      setEditUserOpen(false);
      setEditingUser(null);
      loadData();
      
    } catch (err: any) {
      setError(`Failed to update user: ${err.message}`);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Modal open={open} onClose={onClose}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 200
        }}>
          <CircularProgress />
        </Box>
      </Modal>
    );
  }

  return (
    <>
      {/* Main Modal */}
      <Modal open={open} onClose={onClose}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: 1200,
          maxHeight: '90vh',
          bgcolor: 'background.paper',
          boxShadow: 24,
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <Box sx={{
            p: 3,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="h5" component="h2">
              User Management
            </Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Error/Success Messages */}
          <Box sx={{ p: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                {success}
              </Alert>
            )}
          </Box>

          {/* Action Buttons */}
          <Box sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap'
          }}>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setCreateUserOpen(true)}
              disabled={currentUserRole !== 'admin'}
            >
              Add User
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<BusinessIcon />}
              onClick={() => setCreateCompanyOpen(true)}
              disabled={currentUserRole !== 'admin'}
            >
              Add Company
            </Button>
            
            <Button
              variant="outlined"
              onClick={loadData}
            >
              Refresh
            </Button>
          </Box>

          {/* Users Table */}
          <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        {user.user_metadata.full_name || 'No name'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value as UserRole)}
                          disabled={currentUserRole !== 'admin'}
                          sx={{ minWidth: 120 }}
                        >
                          <MenuItem value="admin">Admin</MenuItem>
                          <MenuItem value="moderator">Moderator</MenuItem>
                          <MenuItem value="controller">Controller</MenuItem>
                          <MenuItem value="user">User</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={user.status}
                          onChange={(e) => handleUpdateStatus(user.id, e.target.value as UserStatus)}
                          disabled={currentUserRole !== 'admin'}
                          sx={{ minWidth: 120 }}
                        >
                          <MenuItem value="active">Active</MenuItem>
                          <MenuItem value="pending">Pending</MenuItem>
                          <MenuItem value="suspended">Suspended</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={user.company_id || ''}
                          onChange={(e) => handleAssignCompany(user.id, e.target.value || null)}
                          disabled={currentUserRole !== 'admin' && currentUserRole !== 'moderator'}
                          sx={{ minWidth: 150 }}
                        >
                          <MenuItem value="">No Company</MenuItem>
                          {companies.map((company) => (
                            <MenuItem key={company.id} value={company.id}>
                              {company.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleEditUser(user)}
                          title="Edit User"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          disabled={currentUserRole !== 'admin'}
                          title="Delete User"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Modal>

      {/* Create User Dialog */}
      <Dialog open={createUserOpen} onClose={() => setCreateUserOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Full Name"
              value={newUser.full_name}
              onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={newUser.role}
                label="Role"
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="moderator">Moderator</MenuItem>
                <MenuItem value="controller">Controller</MenuItem>
                <MenuItem value="user">User</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Company</InputLabel>
              <Select
                value={newUser.company_id || ''}
                label="Company"
                onChange={(e) => setNewUser({ ...newUser, company_id: e.target.value || undefined })}
              >
                <MenuItem value="">No Company</MenuItem>
                {companies.map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateUserOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained">Create User</Button>
        </DialogActions>
      </Dialog>

      {/* Create Company Dialog */}
      <Dialog open={createCompanyOpen} onClose={() => setCreateCompanyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Company</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Company Name"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateCompanyOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateCompany} variant="contained">Create Company</Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editUserOpen} onClose={() => setEditUserOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {editingUser && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <TextField
                label="Email"
                value={editingUser.email}
                disabled
                fullWidth
              />
              <TextField
                label="Full Name"
                value={editingUser.user_metadata.full_name || ''}
                onChange={(e) => setEditingUser({
                  ...editingUser,
                  user_metadata: {
                    ...editingUser.user_metadata,
                    full_name: e.target.value
                  }
                })}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Company</InputLabel>
                <Select
                  value={editingUser.company_id || ''}
                  label="Company"
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    company_id: e.target.value || undefined
                  })}
                >
                  <MenuItem value="">No Company</MenuItem>
                  {companies.map((company) => (
                    <MenuItem key={company.id} value={company.id}>
                      {company.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUserOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UserManagementModal;