// src/components/admin/UserManagementModal.tsx (No Material-UI version)
import React, { useState, useEffect } from 'react';
import { Profile, UserRole, UserStatus } from '@/types';

interface UserManagementModalProps {
  open: boolean;
  onClose: () => void;
  users: Profile[];
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

  useEffect(() => {
    if (open) {
      setEditingUserId(null);
      setEditFormData({});
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  if (!open) return null;

  const handleEditClick = (user: Profile) => {
    setEditingUserId(user.id);
    setEditFormData({
      full_name: user.full_name,
      role: user.role,
      status: user.status,
    });
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditFormData({});
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
    if (!window.confirm('Are you sure you want to delete this user?')) {
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never signed in';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>User Management</h2>
          <button onClick={onClose} className="close-btn">Close</button>
        </div>

        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Sign In</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div>
                        <strong>{user.full_name || 'No name'}</strong>
                        <div>{user.email}</div>
                      </div>
                    </td>

                    <td>
                      {editingUserId === user.id ? (
                        <select
                          value={editFormData.role || ''}
                          onChange={(e) => handleInputChange('role', e.target.value as UserRole)}
                        >
                          <option value="USER">User</option>
                          <option value="OFFICER">Officer</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      ) : (
                        <span className={`role-badge role-${user.role.toLowerCase()}`}>
                          {user.role}
                        </span>
                      )}
                    </td>

                    <td>
                      {editingUserId === user.id ? (
                        <select
                          value={editFormData.status || ''}
                          onChange={(e) => handleInputChange('status', e.target.value as UserStatus)}
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="SUSPENDED">Suspended</option>
                        </select>
                      ) : (
                        <span className={`status-badge status-${user.status.toLowerCase()}`}>
                          {user.status}
                        </span>
                      )}
                    </td>

                    <td>
                      {formatDate(user.last_sign_in_at)}
                    </td>

                    <td>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>

                    <td>
                      {editingUserId === user.id ? (
                        <div className="action-buttons">
                          <button
                            onClick={() => handleSaveClick(user.id)}
                            disabled={saveLoading === user.id}
                            className="btn-save"
                          >
                            {saveLoading === user.id ? 'Saving...' : 'Save'}
                          </button>
                          <button onClick={handleCancelEdit} className="btn-cancel">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="action-buttons">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="btn-edit"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(user.id)}
                            disabled={deleteLoading === user.id}
                            className="btn-delete"
                          >
                            {deleteLoading === user.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {users.length === 0 && !loading && (
          <div className="no-users">No users found</div>
        )}
      </div>
    </div>
  );
};

export default UserManagementModal;