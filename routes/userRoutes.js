const express = require('express')

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const { getAllUsers, createUser, getUser, updateUser, deleteUser } =  userController;

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

//*Protect all routes after this middleware
router.use(authController.protect); //!this will protect this route only comes after this code

// router.patch('/updateMyPassword', authController.protect, authController.updatePassword);
router.patch('/updateMyPassword', authController.updatePassword);

// router.get('/me' , authController.protect , userController.getMe , userController.getUser )
router.get('/me' , userController.getMe , userController.getUser )
// router.patch('/updateMe', authController.protect, userController.updateMe)
router.patch('/updateMe', userController.updateMe);
// router.delete('/deleteMe', authController.protect, userController.deleteMe);
router.delete('/deleteMe', userController.deleteMe);


//! bu alttakilerin admin kullanma yetkisinde olacagını dusunduk
router.use(authController.restrictTo('admin'))
router.route('/').get(getAllUsers).post(createUser);
router.route('/:id').get(getUser).patch(updateUser).delete(deleteUser);


module.exports = router;
