import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { tasksApi } from '../api';
import { format, isValid } from 'date-fns';

const STATUS_COLORS = {
  TODO: '#6366f1',
  IN_PROGRESS: '#f59e0b',
  IN_REVIEW: '#8b5cf6',
  DONE: '#10b981',
};

const PRIORITY_COLORS = {
  LOW: '#94a3b8',
  MEDIUM: '#3b82f6',
  HIGH: '#f97316',
  URGENT: '#ef4444',
};

const DashboardPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => tasksApi.getDashboard().then((r) => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="page-loading"><div className="spinner" /></div>;
  if (error) return <div className="page-error">Failed to load dashboard</div>;

  const { tasks = [], stats = {} } = data || {};

  const pieData = Object.entries(stats.byStatus || {}).map(([name, value]) => ({ name, value }));
  const overdueTasks = tasks.filter((t) => t.isOverdue);
  const recentTasks = tasks.slice(0, 8);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of all your tasks across projects</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>📋</div>
          <div className="stat-content">
            <span className="stat-value">{stats.total || 0}</span>
            <span className="stat-label">Total Tasks</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>🚨</div>
          <div className="stat-content">
            <span className="stat-value overdue">{stats.overdue || 0}</span>
            <span className="stat-label">Overdue</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>⚡</div>
          <div className="stat-content">
            <span className="stat-value">{stats.byStatus?.IN_PROGRESS || 0}</span>
            <span className="stat-label">In Progress</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>✅</div>
          <div className="stat-content">
            <span className="stat-value done">{stats.byStatus?.DONE || 0}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Status Pie Chart */}
        <div className="card chart-card">
          <h3 className="card-title">Task Status Breakdown</h3>
          {pieData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name) => [val, name.replace('_', ' ')]} />
                <Legend formatter={(val) => val.replace('_', ' ')} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">No tasks yet</div>
          )}
        </div>

        {/* Overdue Tasks */}
        <div className="card">
          <h3 className="card-title">🚨 Overdue Tasks ({overdueTasks.length})</h3>
          {overdueTasks.length === 0 ? (
            <p className="empty-state-sm">No overdue tasks! 🎉</p>
          ) : (
            <div className="task-list-mini">
              {overdueTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="task-mini-item overdue">
                  <div>
                    <span className="task-mini-title">{task.title}</span>
                    <span className="task-mini-project">{task.project?.name}</span>
                  </div>
                  <span className="priority-badge" style={{ background: PRIORITY_COLORS[task.priority] + '22', color: PRIORITY_COLORS[task.priority] }}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Tasks Table */}
      <div className="card mt-6">
        <div className="card-header">
          <h3 className="card-title">Recent Tasks</h3>
          <Link to="/projects" className="btn btn-ghost btn-sm">View Projects →</Link>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {recentTasks.length === 0 ? (
                <tr><td colSpan={5} className="empty-row">No tasks yet. Create a project to get started!</td></tr>
              ) : (
                recentTasks.map((task) => (
                  <tr key={task.id} className={task.isOverdue ? 'overdue-row' : ''}>
                    <td>
                      <span className="task-title-cell">{task.title}</span>
                      {task.isOverdue && <span className="overdue-badge">OVERDUE</span>}
                    </td>
                    <td>
                      <span className="project-chip">{task.project?.name}</span>
                    </td>
                    <td>
                      <span className={`status-badge status-${task.status}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className="priority-dot" style={{ background: PRIORITY_COLORS[task.priority] }} />
                      {task.priority}
                    </td>
                    <td>
                      {task.dueDate && isValid(new Date(task.dueDate))
                        ? format(new Date(task.dueDate), 'MMM dd, yyyy')
                        : '—'}
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

export default DashboardPage;
