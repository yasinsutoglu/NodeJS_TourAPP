const Tour = require('../models/tourModel'); //! DB model'i import ettik.
const User = require('../models/userModel'); //! DB model'i import ettik.
const Booking = require('../models/bookingModel'); //! DB model'i import ettik.
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


exports.getCheckoutSession = catchAsync(async(req,res,next) =>{
    //1) Get the currently booked tour
    const tour = await Tour.findById(req.params.tourID)

    //2) create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
    //success_url: `${req.protocol}://${req.get('host')}/my-tours}`, --> bodyparser kullanınca
      cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
      customer_email:req.user.email,
      client_reference_id: req.params.tourID,
      line_items: [{name:`${tour.name} Tour`, description:tour.summary, images:[`https://www.tourapp.dev/img/tours/${tour.imageCover}`], amount: tour.price * 100, currency: 'usd', quantity:1}]
    });

    //3)create session as response
    res.status(200).json({
        status: 'success',
        session
    })

})

exports.createBookingCheckout = catchAsync(async (req,res,next)=>{
    // This is only TEMPRORARY, because it's UNSECURE: everyone can make bookings without paying
    const {tour, user, price} = req.query;

    if(!tour && !user && !price) return next();

    await Booking.create({tour, user, price});
    
    res.redirect(req.OriginalUrl.split('?')[0])
});

//! STRIPE ISSUES
// const createBookingCheckout = async (session) =>{
//     const tour = session.client_reference_id;
//     const user = (await User.findOne({email:session.customer_email})).id;
//     const price = session.line_items[0].amount/100;
//     await Booking.create({ tour, user, price });
// }

// exports.webhookCheckout = (req,res,next) => {
//     const signature = req.headers['stripe-signature'];
//     let event;
//     try {
//          event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
//     } catch (error) {
//         return res.status(400).send(`Webhook error: ${error.message}`)
//     }
    
//     if(event.type === 'checkout.session.completed'){
//         createBookingCheckout(event.data.object)
//     }

//     res.status(200).json({received: true});
// }

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);