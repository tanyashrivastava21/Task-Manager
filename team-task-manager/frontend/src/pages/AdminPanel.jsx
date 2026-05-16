import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const AdminPanel = () => {
  const qc = useQueryClient();
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.getUsers().then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats().then((r) => r.data),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => adminApi.updateUserRole(userId, role).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries(['admin-users']);
      toast.success('Role updated!');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update role'),
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🛡️ Admin Panel</h1>
          <p className="page-subtitle">System administration — manage all users and view global statistics</p>
        </div>
      </div>

      {/* Global Stats */}
      {stats && (
        <div className="stats-grid mb-6">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>👥</div>
            <div className="stat-content">
              <span className="stat-value">{stats.users}</span>
              <span className="stat-label">Total Users</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>📁</div>
            <div className="stat-content">
              <span className="stat-value">{stats.projects}</span>
              <span className="stat-label">Total Projects</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>📋</div>
            <div className="stat-content">
              <span className="stat-value">{stats.tasks}</span>
              <span className="stat-label">Total Tasks</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>🚨</div>
            <div className="stat-content">
              <span className="stat-value overdue">{stats.overdue}</span>
              <span className="stat-label">Overdue Tasks</span>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">All Users ({users.length})</h3>
        </div>
        <div className="table-container">
          <table className="data-table" id="admin-users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>System Role</th>
                <th>Projects</th>
                <th>Tasks Assigned</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr><td colSpan={7} className="empty-row">Loading...</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <div className="mini-avatar">{u.name.charAt(0)}</div>
                        <span>{u.name}</span>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-badge ${u.role === 'ADMIN' ? 'admin' : 'member'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u._count?.projects || 0}</td>
                    <td>{u._count?.tasksAssigned || 0}</td>
                    <td>{format(new Date(u.createdAt), 'MMM dd, yyyy')}</td>
                    <td>
                      <select
                        id={`role-select-${u.id}`}
                        value={u.role}
                        onChange={(e) => roleMutation.mutate({ userId: u.id, role: e.target.value })}
                        className="role-select"
                        disabled={roleMutation.isPending}
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
