const prisma = require('../utils/prisma');

const requireProjectMember = async (req, res, next) => {
  const projectId = req.params.id || req.params.projectId;
  try {
    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a project member' });
    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
};

const requireProjectAdmin = async (req, res, next) => {
  const projectId = req.params.id || req.params.projectId;
  try {
    // System admins bypass project-level check
    if (req.user.role === 'ADMIN') return next();

    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a project member' });
    if (membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Project admin access required' });
    }
    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireProjectMember, requireProjectAdmin };
