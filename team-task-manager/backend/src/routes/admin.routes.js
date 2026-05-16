const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, requireSystemAdmin } = require('../middleware/auth.middleware');

router.use(authenticate, requireSystemAdmin);

router.get('/users', adminController.getAllUsers);
router.patch('/users/:userId/role', adminController.updateUserRole);
router.get('/stats', adminController.getGlobalStats);

module.exports = router;
