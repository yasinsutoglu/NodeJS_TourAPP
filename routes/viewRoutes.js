const express = require('express');
const viewsController = require('../controllers/viewsController')
const authController = require('../controllers/authController')
const router = express.Router();

//? burada pug base template'i render ettirmek icin routing yaptık. render()'ın ikinci parametresi pug'a gonderecegimiz (object formatında) data'dır.
// router.get('/' , (req,res)=>{
//     res.status(200).render('base' , {
//         tour : 'Forest Hiker',
//         user : 'Yasin'
//     })
// })

router.use(authController.isLoggedIn)

router.get('/' , viewsController.getOverview );
router.get('/tour/:slug',viewsController.getTour);
router.get('/login', viewsController.getLoginForm)

module.exports = router;