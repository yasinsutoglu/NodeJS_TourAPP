const express = require('express');
const viewsController = require('../controllers/viewsController')
const authController = require('../controllers/authController')
const bookingController = require('../controllers/bookingController')

const router = express.Router();

//? burada pug base template'i render ettirmek icin routing yaptık. render()'ın ikinci parametresi pug'a gonderecegimiz (object formatında) data'dır.
// router.get('/' , (req,res)=>{
//     res.status(200).render('base' , {
//         tour : 'Forest Hiker',
//         user : 'Yasin'
//     })
// })

// router.use(authController.isLoggedIn)

router.use(viewsController.alerts)

router.get('/',bookingController.createBookingCheckout ,authController.isLoggedIn, viewsController.getOverview);
router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
router.get('/me', authController.protect, viewsController.getAccount);
router.get('/my-tours',authController.protect,viewsController.getMyTours);


router.post('/submit-user-data', authController.protect,viewsController.updateUserData)

module.exports = router;