const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate, updateTaskSchema, updateTaskStatusSchema, createCommentSchema } = require('../middleware/validate.middleware');

router.use(authenticate);

// Dashboard - aggregate tasks across all projects
router.get('/dashboard', taskController.getDashboard);

// Task CRUD
router.get('/:taskId', taskController.getById);
router.patch('/:taskId', validate(updateTaskSchema), taskController.update);
router.patch('/:taskId/status', validate(updateTaskStatusSchema), taskController.updateStatus);
router.delete('/:taskId', taskController.remove);

// Comments
router.post('/:taskId/comments', validate(createCommentSchema), taskController.addComment);

module.exports = router;
