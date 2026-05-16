import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { projectsApi, tasksApi } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format, isValid } from 'date-fns';

const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done' };
const PRIORITY_COLORS = { LOW: '#94a3b8', MEDIUM: '#3b82f6', HIGH: '#f97316', URGENT: '#ef4444' };

// ─── Task Modal ────────────────────────────────────────────────────────────────
const TaskModal = ({ task, projectId, members, onClose }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const isEdit = !!task?.id;

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: task || { priority: 'MEDIUM' },
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (isEdit) {
        return tasksApi.update(task.id, data).then((r) => r.data);
      } else {
        return projectsApi.createTask(projectId, data).then((r) => r.data);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['project', projectId]);
      toast.success(isEdit ? 'Task updated!' : 'Task created!');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save task'),
  });

  const statusMutation = useMutation({
    mutationFn: (status) => tasksApi.updateStatus(task.id, status).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries(['project', projectId]);
      toast.success('Status updated!');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update status'),
  });

  const commentMutation = useMutation({
    mutationFn: (content) => tasksApi.addComment(task.id, content).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries(['project', projectId]);
      setComment('');
      toast.success('Comment added!');
    },
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Task' : 'Create Task'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit(saveMutation.mutate)} className="modal-form">
          <div className="form-group">
            <label>Title *</label>
            <input
              id="task-title"
              type="text"
              placeholder="Task title"
              {...register('title', { required: 'Title is required' })}
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <span className="form-error">{errors.title.message}</span>}
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              id="task-desc"
              rows={3}
              placeholder="Task details..."
              {...register('description')}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <select id="task-priority" {...register('priority')}>
                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Assignee</label>
              <select id="task-assignee" {...register('assigneeId')}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Due Date</label>
            <input id="task-due-date" type="datetime-local" {...register('dueDate')} />
          </div>

          {isEdit && (
            <div className="form-group">
              <label>Status</label>
              <div className="status-selector">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`status-option ${task.status === s ? 'active' : ''} status-${s}`}
                    onClick={() => statusMutation.mutate(s)}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>

        {/* Comments section for existing tasks */}
        {isEdit && task?.comments && (
          <div className="comments-section">
            <h4>Comments ({task.comments.length})</h4>
            <div className="comments-list">
              {task.comments.map((c) => (
                <div key={c.id} className="comment-item">
                  <div className="comment-avatar">{c.author.name.charAt(0)}</div>
                  <div>
                    <span className="comment-author">{c.author.name}</span>
                    <p className="comment-content">{c.content}</p>
                    <span className="comment-time">
                      {format(new Date(c.createdAt), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="comment-input">
              <textarea
                id="comment-input"
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
              />
              <button
                className="btn btn-sm btn-primary"
                onClick={() => commentMutation.mutate(comment)}
                disabled={!comment.trim() || commentMutation.isPending}
              >
                Post
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Kanban Column ─────────────────────────────────────────────────────────────
const KanbanColumn = ({ status, tasks, onTaskClick }) => (
  <div className="kanban-column" id={`column-${status}`}>
    <div className="kanban-header">
      <span className={`kanban-status-badge status-${status}`}>{STATUS_LABELS[status]}</span>
      <span className="kanban-count">{tasks.length}</span>
    </div>
    <div className="kanban-cards">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`task-card ${task.isOverdue ? 'overdue' : ''}`}
          onClick={() => onTaskClick(task)}
          id={`task-card-${task.id}`}
        >
          <div className="task-card-priority" style={{ background: PRIORITY_COLORS[task.priority] }} />
          <h4 className="task-card-title">{task.title}</h4>
          {task.description && (
            <p className="task-card-desc">{task.description.slice(0, 80)}{task.description.length > 80 ? '…' : ''}</p>
          )}
          <div className="task-card-footer">
            {task.assignee ? (
              <div className="task-assignee">
                <span className="mini-avatar">{task.assignee.name.charAt(0)}</span>
                <span>{task.assignee.name}</span>
              </div>
            ) : (
              <span className="unassigned">Unassigned</span>
            )}
            {task.dueDate && (
              <span className={`task-due ${task.isOverdue ? 'overdue' : ''}`}>
                {format(new Date(task.dueDate), 'MMM dd')}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Add Member Modal ──────────────────────────────────────────────────────────
const AddMemberModal = ({ projectId, onClose }) => {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const mutation = useMutation({
    mutationFn: (data) => projectsApi.addMember(projectId, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries(['project', projectId]);
      toast.success('Member added!');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add member'),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Member</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit(mutation.mutate)} className="modal-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              id="member-email"
              type="email"
              placeholder="member@example.com"
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && <span className="form-error">{errors.email.message}</span>}
          </div>
          <div className="form-group">
            <label>Role</label>
            <select id="member-role" {...register('role')}>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Project Detail Page ───────────────────────────────────────────────────────
const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getById(id).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['projects']);
      toast.success('Project deleted');
      navigate('/projects');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete project'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId) => projectsApi.removeMember(id, memberId),
    onSuccess: () => {
      qc.invalidateQueries(['project', id]);
      toast.success('Member removed');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to remove member'),
  });

  if (isLoading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!project) return <div className="page-error">Project not found</div>;

  const now = new Date();
  const tasks = (project.tasks || []).map((t) => ({
    ...t,
    isOverdue: t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE',
  }));

  const myMembership = project.members?.find((m) => m.user.id === user.id);
  const isAdmin = myMembership?.role === 'ADMIN' || user.role === 'ADMIN';

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s);
    return acc;
  }, {});

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">
          <a href="/projects">Projects</a> / <span>{project.name}</span>
        </div>
        <div className="page-actions">
          <button
            id="add-task-btn"
            className="btn btn-primary"
            onClick={() => setShowCreateTask(true)}
          >
            + Add Task
          </button>
          {isAdmin && (
            <>
              <button
                id="add-member-btn"
                className="btn btn-secondary"
                onClick={() => setShowAddMember(true)}
              >
                + Add Member
              </button>
              <button
                id="delete-project-btn"
                className="btn btn-danger"
                onClick={() => {
                  if (confirm('Delete this project and all its tasks?')) {
                    deleteMutation.mutate();
                  }
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="project-detail-layout">
        {/* Kanban Board */}
        <div className="kanban-board">
          <h1 className="page-title">{project.name}</h1>
          {project.description && <p className="project-desc-detail">{project.description}</p>}

          <div className="kanban-columns">
            {STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={tasksByStatus[status]}
                onTaskClick={setSelectedTask}
              />
            ))}
          </div>
        </div>

        {/* Members Sidebar */}
        <aside className="members-sidebar">
          <h3>👥 Members ({project.members?.length})</h3>
          <div className="members-list">
            {project.members?.map((m) => (
              <div key={m.id} className="member-item">
                <div className="member-avatar">{m.user.name.charAt(0)}</div>
                <div className="member-info">
                  <span className="member-name">{m.user.name}</span>
                  <span className={`role-badge ${m.role === 'ADMIN' ? 'admin' : 'member'}`}>
                    {m.role}
                  </span>
                </div>
                {isAdmin && m.user.id !== user.id && (
                  <button
                    className="btn btn-ghost btn-xs remove-member-btn"
                    onClick={() => removeMemberMutation.mutate(m.user.id)}
                    title="Remove member"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Modals */}
      {showCreateTask && (
        <TaskModal
          task={null}
          projectId={id}
          members={project.members || []}
          onClose={() => setShowCreateTask(false)}
        />
      )}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projectId={id}
          members={project.members || []}
          onClose={() => setSelectedTask(null)}
        />
      )}
      {showAddMember && (
        <AddMemberModal projectId={id} onClose={() => setShowAddMember(false)} />
      )}
    </div>
  );
};

export default ProjectDetailPage;
