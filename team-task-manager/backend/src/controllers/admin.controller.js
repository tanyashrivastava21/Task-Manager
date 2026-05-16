const prisma = require('../utils/prisma');

const getAllUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: { projects: true, tasksAssigned: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['ADMIN', 'MEMBER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
};

const getGlobalStats = async (req, res, next) => {
  try {
    const [userCount, projectCount, taskCount, overdueTasks] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.task.count(),
      prisma.task.count({
        where: {
          dueDate: { lt: new Date() },
          status: { not: 'DONE' },
        },
      }),
    ]);

    const tasksByStatus = await prisma.task.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    res.json({
      users: userCount,
      projects: projectCount,
      tasks: taskCount,
      overdue: overdueTasks,
      tasksByStatus: tasksByStatus.reduce((acc, t) => {
        acc[t.status] = t._count.status;
        return acc;
      }, {}),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllUsers, updateUserRole, getGlobalStats };
