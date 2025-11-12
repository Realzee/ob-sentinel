// app/admin/user-roles/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase, getAllUsers, updateUserProfile } from '@/lib/supabase'

export default function UserRolesPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = async () => {
    try {
      const usersData = await getAllUsers()
      setUsers(usersData || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateUserProfile(userId, { role: newRole as any })
      await fetchUsers() // Refresh the list
      alert('User role updated successfully')
    } catch (error: any) {
      alert(`Error updating user role: ${error.message}`)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  if (loading) {
    return <div className="p-8">Loading users...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">User Role Management</h1>
      <div className="card p-6">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">Email</th>
              <th className="text-left">Current Role</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>
                  <span className={`px-2 py-1 rounded ${
                    user.role === 'admin' ? 'bg-purple-600' : 'bg-gray-600'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <select 
                    value={user.role}
                    onChange={(e) => updateUserRole(user.id, e.target.value)}
                    className="bg-dark-gray border border-gray-600 rounded px-2 py-1"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}