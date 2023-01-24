const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController')

const router = express.Router({mergeParams:true}); // default olarak her router kendi parametrelerini bulundurur eger baska router'dan parametre'de almak istersek mergeParams kullanmalıyız.

// POST/tour/213asd/reviews 
// GET /tour/213asd/reviews 

router.route('/').get(reviewController.getAllReviews).post(authController.protect, authController.restrictTo('user'), reviewController.setTourUserIds, reviewController.createReview)

router.route('/:id').get(reviewController.getReview).patch(reviewController.updateReview).delete(reviewController.deleteReview)

module.exports = router;