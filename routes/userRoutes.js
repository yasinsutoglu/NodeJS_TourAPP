const express = require('express')

const userController = require('./../controllers/userController')
const authController = require('./../controllers/authController');
const { getAllUsers, createUser, getUser, updateUser, deleteUser } =  userController;

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login)

router.post('/forgotPassword', authController.forgotPassword)
router.patch('/resetPassword/:token', authController.resetPassword);

router.patch('/updateMyPassword', authController.protect, authController.updatePassword)

//! bu alttakilerin admin kullanma yetkisinde olacagını dusunduk
router.route('/').get(getAllUsers).post(createUser);
router.route('/:id').get(getUser).patch(updateUser).delete(deleteUser);

module.exports = router;
