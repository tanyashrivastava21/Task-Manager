const prisma = require('../utils/prisma');

const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

const create = async (req, res, next) => {
  try {
    const { title, description, priority, dueDate, assigneeId } = req.body;
    const projectId = req.params.id;

    // Validate assigneeId is a project member
    if (assigneeId) {
      const membership = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId: assigneeId, projectId } },
      });
      if (!membership) return res.status(400).json({ error: 'Assignee is not a project member' });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
        creatorId: req.user.id,
        assigneeId: assigneeId || null,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

const getByProject = async (req, res, next) => {
  try {
    const { status, assigneeId, priority } = req.query;

    const tasks = await prisma.task.findMany({
      where: {
        projectId: req.params.id,
        ...(status && { status }),
        ...(assigneeId && { assigneeId }),
        ...(priority && { priority }),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    res.json(tasks);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        comments: {
          include: { author: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { title, description, priority, dueDate, assigneeId } = req.body;
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Validate assigneeId if provided
    if (assigneeId) {
      const membership = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId: assigneeId, projectId: task.projectId } },
      });
      if (!membership) return res.status(400).json({ error: 'Assignee is not a project member' });
    }

    const updated = await prisma.task.update({
      where: { id: req.params.taskId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(priority && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: { project: { include: { members: true } } },
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Only assignee or project admin can change status
    const isAssignee = task.assigneeId === req.user.id;
    const isProjectAdmin = task.project.members.find(
      (m) => m.userId === req.user.id && m.role === 'ADMIN'
    );
    const isSystemAdmin = req.user.role === 'ADMIN';

    if (!isAssignee && !isProjectAdmin && !isSystemAdmin) {
      return res.status(403).json({ error: 'Only the assignee or project admin can update task status' });
    }

    const updated = await prisma.task.update({
      where: { id: req.params.taskId },
      data: { status },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await prisma.task.delete({ where: { id: req.params.taskId } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const now = new Date();

    const tasks = await prisma.task.findMany({
      where: {
        project: { members: { some: { userId: req.user.id } } },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const enriched = tasks.map((t) => ({
      ...t,
      isOverdue: t.dueDate && t.dueDate < now && t.status !== 'DONE',
    }));

    const stats = {
      total: tasks.length,
      overdue: enriched.filter((t) => t.isOverdue).length,
      byStatus: {
        TODO: tasks.filter((t) => t.status === 'TODO').length,
        IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
        IN_REVIEW: tasks.filter((t) => t.status === 'IN_REVIEW').length,
        DONE: tasks.filter((t) => t.status === 'DONE').length,
      },
      byPriority: {
        LOW: tasks.filter((t) => t.priority === 'LOW').length,
        MEDIUM: tasks.filter((t) => t.priority === 'MEDIUM').length,
        HIGH: tasks.filter((t) => t.priority === 'HIGH').length,
        URGENT: tasks.filter((t) => t.priority === 'URGENT').length,
      },
    };

    res.json({ tasks: enriched, stats });
  } catch (err) {
    next(err);
  }
};

const addComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    const comment = await prisma.comment.create({
      data: {
        content,
        taskId: req.params.taskId,
        authorId: req.user.id,
      },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
};

module.exports = { create, getByProject, getById, update, updateStatus, remove, getDashboard, addComment };
