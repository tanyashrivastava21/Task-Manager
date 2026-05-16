const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const taskController = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireProjectMember, requireProjectAdmin } = require('../middleware/role.middleware');
const { validate, createProjectSchema, updateProjectSchema, addMemberSchema, createTaskSchema } = require('../middleware/validate.middleware');

// All project routes require authentication
router.use(authenticate);

// Project CRUD
router.post('/', validate(createProjectSchema), projectController.create);
router.get('/', projectController.getAll);
router.get('/:id', requireProjectMember, projectController.getById);
router.patch('/:id', requireProjectAdmin, validate(updateProjectSchema), projectController.update);
router.delete('/:id', requireProjectAdmin, projectController.remove);

// Member management
router.post('/:id/members', requireProjectAdmin, validate(addMemberSchema), projectController.addMember);
router.delete('/:id/members/:memberId', requireProjectAdmin, projectController.removeMember);
router.patch('/:id/members/:memberId/role', requireProjectAdmin, projectController.updateMemberRole);

// Tasks under project
router.get('/:id/tasks', requireProjectMember, taskController.getByProject);
router.post('/:id/tasks', requireProjectMember, validate(createTaskSchema), taskController.create);

module.exports = router;
