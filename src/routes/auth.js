const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', authController.login);
router.get('/signup', authController.signup);
router.get('/callback', authController.callback);
router.post('/logout', authController.logout);

module.exports = router;
