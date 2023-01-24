const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController')

const router = express.Router({mergeParams:true}); // default olarak her router kendi parametrelerini bulundurur eger baska router'dan parametre'de almak istersek mergeParams kullanmalıyız.

// POST/tour/213asd/reviews 
// GET /tour/213asd/reviews 

router.use(authController.protect)

router.route('/').get(reviewController.getAllReviews).post(authController.restrictTo('user'), reviewController.setTourUserIds, reviewController.createReview)

router.route('/:id').get(reviewController.getReview).patch(authController.restrictTo('user' , 'admin'),reviewController.updateReview).delete(authController.restrictTo('user' , 'admin') , reviewController.deleteReview)

module.exports = router;