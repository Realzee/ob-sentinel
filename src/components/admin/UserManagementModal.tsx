import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { Profile, UserRole, UserStatus } from '@/types';

interface UserManagementModalProps {
  open: boolean;
  onClose: () => void;
  users: Profile[] | null | undefined;
  onUpdateUser: (userId: string, updates: Partial<Profile>) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  loading?: boolean;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({
  open,
  onClose,
  users,
  onUpdateUser,
  onDeleteUser,
  loading = false,
}) => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Profile>>({});
  const [saveLoading, setSaveLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (open) {
      setEditingUserId(null);
      setEditFormData({});
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  // Safe users array - always ensure we have an array
  const safeUsers = Array.isArray(users) ? users : [];

  const handleEditClick = (user: Profile) => {
    setEditingUserId(user.id);
    setEditFormData({
      full_name: user.full_name,
      role: user.role,
      status: user.status,
    });
    setError(null);
    setSuccess(null);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditFormData({});
    setError(null);
  };

  const handleSaveClick = async (userId: string) => {
    if (!editFormData.role || !editFormData.status) {
      setError('Role and status are required');
      return;
    }

    setSaveLoading(userId);
    setError(null);

    try {
      await onUpdateUser(userId, editFormData);
      setSuccess('User updated successfully');
      setEditingUserId(null);
      setEditFormData({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaveLoading(null);
    }
  };

  const handleDeleteClick = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setDeleteLoading(userId);
    setError(null);

    try {
      await onDeleteUser(userId);
      setSuccess('User deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleInputChange = (field: keyof Profile, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRoleChange = (event: any) => {
    handleInputChange('role', event.target.value as UserRole);
  };

  const handleStatusChange = (event: any) => {
    handleInputChange('status', event.target.value as UserStatus);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never signed in';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'warning';
      case 'SUSPENDED': return 'error';
      default: return 'default';
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'secondary';
      case 'OFFICER': return 'primary';
      case 'USER': return 'default';
      default: return 'default';
    }
  };

  return (
    <Modal open={open} onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ width: '90%', maxWidth: 1200, maxHeight: '90vh', bgcolor: 'background.paper', borderRadius: 2, p: 3, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            User Management
          </Typography>
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="user management table">
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Sign In</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {safeUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">
                          {user.full_name || 'No name'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      {editingUserId === user.id ? (
                        <FormControl fullWidth size="small">
                          <InputLabel>Role</InputLabel>
                          <Select
                            value={editFormData.role || ''}
                            label="Role"
                            onChange={handleRoleChange}
                          >
                            <MenuItem value="USER">User</MenuItem>
                            <MenuItem value="OFFICER">Officer</MenuItem>
                            <MenuItem value="ADMIN">Admin</MenuItem>
                          </Select>
                        </FormControl>
                      ) : (
                        <Chip
                          label={user.role}
                          color={getRoleColor(user.role) as any}
                          size="small"
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      {editingUserId === user.id ? (
                        <FormControl fullWidth size="small">
                          <InputLabel>Status</InputLabel>
                          <Select
                            value={editFormData.status || ''}
                            label="Status"
                            onChange={handleStatusChange}
                          >
                            <MenuItem value="ACTIVE">Active</MenuItem>
                            <MenuItem value="INACTIVE">Inactive</MenuItem>
                            <MenuItem value="SUSPENDED">Suspended</MenuItem>
                          </Select>
                        </FormControl>
                      ) : (
                        <Chip
                          label={user.status}
                          color={getStatusColor(user.status) as any}
                          size="small"
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      <Tooltip title={formatDate(user.last_sign_in_at)}>
                        <Typography variant="body2">
                          {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                        </Typography>
                      </Tooltip>
                    </TableCell>

                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>

                    <TableCell align="center">
                      {editingUserId === user.id ? (
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="Save">
                            <span>
                              <IconButton
                                onClick={() => handleSaveClick(user.id)}
                                disabled={saveLoading === user.id}
                                color="primary"
                                size="small"
                              >
                                {saveLoading === user.id ? <CircularProgress size={20} /> : <SaveIcon />}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Cancel">
                            <IconButton onClick={handleCancelEdit} color="inherit" size="small">
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="Edit User">
                            <IconButton
                              onClick={() => handleEditClick(user)}
                              color="primary"
                              size="small"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete User">
                            <span>
                              <IconButton
                                onClick={() => handleDeleteClick(user.id)}
                                disabled={deleteLoading === user.id}
                                color="error"
                                size="small"
                              >
                                {deleteLoading === user.id ? <CircularProgress size={20} /> : <DeleteIcon />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {safeUsers.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Typography variant="body1" color="text.secondary">
              No users found
            </Typography>
          </Box>
        )}
      </Box>
    </Modal>
  );
};

export default UserManagementModal;