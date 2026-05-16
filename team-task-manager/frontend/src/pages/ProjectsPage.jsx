import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { projectsApi } from '../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ProjectCard = ({ project }) => {
  const taskCount = project._count?.tasks || 0;
  const memberCount = project.members?.length || 0;
  const isArchived = project.status === 'ARCHIVED';

  return (
    <Link to={`/projects/${project.id}`} className="project-card" id={`project-${project.id}`}>
      <div className="project-card-header">
        <div className="project-avatar">
          {project.name.charAt(0).toUpperCase()}
        </div>
        <span className={`status-dot ${isArchived ? 'archived' : 'active'}`} />
      </div>
      <h3 className="project-name">{project.name}</h3>
      {project.description && (
        <p className="project-desc">{project.description}</p>
      )}
      <div className="project-meta">
        <span>👥 {memberCount} member{memberCount !== 1 ? 's' : ''}</span>
        <span>📋 {taskCount} task{taskCount !== 1 ? 's' : ''}</span>
      </div>
      {project.deadline && (
        <div className="project-deadline">
          🗓️ Due {format(new Date(project.deadline), 'MMM dd, yyyy')}
        </div>
      )}
    </Link>
  );
};

const CreateProjectModal = ({ onClose }) => {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const mutation = useMutation({
    mutationFn: (data) => projectsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries(['projects']);
      toast.success('Project created!');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create project'),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit(mutation.mutate)} className="modal-form">
          <div className="form-group">
            <label>Project Name *</label>
            <input
              id="project-name"
              type="text"
              placeholder="e.g. Mobile App Redesign"
              {...register('name', { required: 'Name is required' })}
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="form-error">{errors.name.message}</span>}
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              id="project-desc"
              placeholder="What is this project about?"
              rows={3}
              {...register('description')}
            />
          </div>
          <div className="form-group">
            <label>Deadline</label>
            <input id="project-deadline" type="datetime-local" {...register('deadline')} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProjectsPage = () => {
  const [showModal, setShowModal] = useState(false);
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll().then((r) => r.data),
  });

  if (isLoading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          id="create-project-btn"
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>No projects yet</h3>
          <p>Create your first project to start managing tasks</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Create Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {showModal && <CreateProjectModal onClose={() => setShowModal(false)} />}
    </div>
  );
};

export default ProjectsPage;
