const express=require('express')

//!tourController.js'dan export ettiğimiz tüm fonksiyonlar burada tourController object'ine property olarak geldi.
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
// const reviewController = require('../controllers/reviewController');
const reviewRouter = require('./reviewRoutes')

const {
  getAllTours,
  createTour,
  getTour,
  updateTour,
  deleteTour,
  aliasTopTours,
  getTourStats,
  getMonthlyPlan,
} = tourController; //!destructuring

const router = express.Router();

//! sadece url'deki id parametresine gore calısacak middleware. Url'de id olmazsa pipeline'da burası pas gecilir. val--> parameter value
// router.param('id', (req, res, next, val )=>{
//     console.log(`tour id is: ${val}`);
//     next(); // bunu kullanmazsak middleware pipeline'nında sonraki asamaya gecemeyiz
// })
// router.param('id', tourController.checkID )

//! aliasTopTours--> middlewaredir. Burada '127.0.0.1:3000/api/v1/tours/top-5-cheap' linki server'a gelince biz client'ı ugrastırmadan onceden req.query'i fill yapmıs olduk.
router.route('/top-5-cheap').get(aliasTopTours, getAllTours)

//! MongoDB aggreagtion pipeline ile grup ve filter ile istatiski bilgileri getireceğimiz routing
router.route('/tour-stats').get(getTourStats)
router.route('/monthly-plan/:year').get(getMonthlyPlan);

//? Creating checkBody middleware in tourController and import here
//? Check if body contains the name and price property
//? If not, send back 400(bad request) and adding it to the post handler stack
// router.route('/').get(getAllTours).post(tourController.checkBody , createTour);
router.route('/').get(authController.protect, getAllTours).post(createTour);
router.route('/:id').get(getTour).patch(updateTour).delete(authController.protect, authController.restrictTo('admin', 'lead-guide'), deleteTour);

//?----------------------
// POST /tour/213asd/reviews --> nested route ornegidir. reviews, tour'un child'ıdır. Aradaki de tourID.
// GET /tour/213asd/reviews 
// GET /tour/213asd/reviews/1235kjalhda2

//! mergeParams kullanarak daha sade hale getirecegiz burayı
// router.route('/:tourId/reviews').post(authController.protect , authController.restrictTo('user'),reviewController.createReview)
router.use('/:tourId/reviews' , reviewRouter) //! Tekrar MOUNTING ROUTER yaptık.

//?----------------------


module.exports = router;
