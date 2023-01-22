const rateLimit = require('express-rate-limit');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp')

// const fs = require('fs')
const AppError = require('./utils/appError');//? error middleware icin yazdıgımız class'ı import ettik
const globalErrorHandler = require('./controllers/errorController')

//? Router Dosyalarını ayırdıktan sonra import etme durumumuz
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes')

const app = express(); //! express.js'i aktif ederek uygulamayı express ile yazamaya devam ederiz.

// 1) GLOBAL MIDDLEWARES
//Set Security http headers--> middleware stack'te basta olmalıdır.
app.use(helmet());

//!3rd Party Middleware kullanımı (morgan--> popular for logging the request actions from clients)               Orn Sonuc: GET /api/v1/tours 200 4.795 ms - 8683
//Development logging
if(process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'))
}

//? limiter --> middleware func.
const limiter = rateLimit({
    max : 100,
    windowMs:60 * 60 * 1000, //* 1 hour'luk zaman dilimi msec olarak.
    message : 'Too many request from this IP, please try again in an hour!'
})
app.use('/api', limiter) //? "/api" ile baslayan tüm route'ları ilgilendiren request sayısını limitledik 


//? burada express.json() middleware'dir. app.use() icine yazılan fonksiyon'lar middleware stack'e atılır.
//Body parser, reading data from body into req.body
app.use(express.json({limit : '10kb'})) 

//Data Sanitization against NOSQL query injection
app.use(mongoSanitize());//* malicious nosql injection code'a karsı koruma

//Data Sanitization against XSS
app.use(xss()); //* malicious html code'a karsı koruma

//Prevent parameter pollution
app.use(hpp({
    whitelist:['duration', 'ratingsQuantitiy', 'ratingsAverage', 'maxGroupSize', 'difficulty', 'price']
}))

//? static file'lara ulasmak icin built-in middleware kullandık. uygulamayı canlıya alınca IP address public klasorunu baz alır ve icindeki html sayfalarını "http://127.0.0.1:3000/overview.html" seklinde acarız. "http://127.0.0.1:3000/img/pin.png" --> public altındaki img klasorunden png dosyası actık.
//Serving static files
app.use(express.static(`${__dirname}/public`))

//? KENDI MIDDLEWARE'IMIZI YAZALIM
//* next parametresini kullanmak client'a donus yapmak icin cok onemlidir. Bu middleware her tur request'e cevap verir.Cunku bu durumda middleware stack'te en ondedir.(crud islemleri icin yazdıgımız fonk.lar da birer middleware)
//Test Middleware
// app.use((req,res,next)=>{
//     console.log('hello from the middleware');
//     next()
// });

app.use((req,res,next)=>{
    req.requestTime = new Date().toISOString();
    // console.log(req.headers)
    next();
})

//* /////////////////////////////////////////////

// app.get('/', (req, res)=>{
//     // res.status(200).send('Hello from the server side!')
//     res.status(200).json({ message: 'Hello from the server side!', app:'Natours' });
// })

// app.post('/', (req,res)=>{
//     res.send('you can post to this endpoint..')
// })

//!json verisini parse ederek an array of javascript object'ine donusturuyoruz.
// const myTours = JSON.parse(fs.readFileSync(`${__dirname}/dev-data/data/tours-simple.json`))
// const tours = JSON.parse(fs.readFileSync(`${__dirname}/dev-data/data/tours-simple.json`))

//?HANDLING READ REQUEST
// const getAllTours = (req, res) => {
//     console.log(req.requestTime)
//   //* burada ENVELOPING yaptık.(Jsend data specification kullanarak)
//   res.status(200).json({
//     status: 'success',
//     requestedAt: req.requestTime,
//     results: tours.length, //? bu satır nice to have
//     data: {
//       // tours: myTours,
//       tours: tours, //!key olan tours --> route'un resource name'i ile aynı olmalı.
//     },
//   });
// };

// //! buradaki callback funciton ==> "Route Handler" denir.
// app.get('/api/v1/tours', getAllTours )


// //?HANDLING READ REQUEST (for 1 item)
// const getTour = (req, res) => {
//   console.log(req.params); //! req.params ile object'in key-value pair'larında tüm parametreleri alırız. Belirtilen tüm parametreler url'de gelmelidir. Eger optional olmasını istiyorsak ":id?" şeklinde yazılmalıdır.

//   const id = req.params.id * 1; //! string olan degeri number'a cevirmek icin yaptık.
//   const tour = tours.find((el) => el.id === id);

//   //? burada url'le client'dan gelen id yoksa hata donduk
//   // if(id > tours.length) {
//   if (!tour) {
//     return res.status(404).json({
//       status: 'fail',
//       message: 'Invalid Id',
//     });
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour: tour,
//     },
//   });
// };

// // app.get('/api/v1/tours/:id', getTour);


// //?HANDLING CREATE REQUEST
// //! burada req(request)==> client'dan server'a gonderilen data(information)'ın hepsini tutar. Express, body data'yı req'te bulundurmaz ona ulasmak icin middleware kullanmak gerekir. 
// const createTour = (req, res) => {
//   // console.log(req.body) //! middleware kullanmasak burada object yerine undefined gorurduk

//   const newId = tours[tours.length - 1].id + 1;
//   const newTour = Object.assign({ id: newId }, req.body);

//   tours.push(newTour);

//   //* burada writeFileSync koyarsak callback icinde oldugumuzdan blocklamıs oluruz.
//   fs.writeFile(
//     `${__dirname}/dev-data/data/tours-simple.json`,
//     JSON.stringify(tours),
//     (err) => {
//       //? 201 kodu created anlamındadır
//       res.status(201).json({
//         status: 'success',
//         data: {
//           tour: newTour,
//         },
//       });
//     }
//   );
// };
// // app.post('/api/v1/tours', createTour)

// //?HANDLING UPDATE REQUEST
// const updateTour = (req, res) => {
//   if (req.params.id * 1 > tours.length) {
//     return res.status(404).json({
//       status: 'fail',
//       message: 'Invalid Id',
//     });
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour: '<Updated tour here..>',
//     },
//   });
// };
// // app.patch('/api/v1/tours/:id', updateTour)

// //?HANDLING DELETE REQUEST
// const deleteTour = (req, res) => {
//   if (req.params.id * 1 > tours.length) {
//     return res.status(404).json({
//       status: 'fail',
//       message: 'Invalid Id',
//     });
//   }

//   //! 204 --> no content
//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });
// };

// // app.delete('/api/v1/tours/:id', deleteTour );

//! REFACTORING SONUCU YAZDIK
// const tourRouter = express.Router();
// tourRouter.route('/').get(getAllTours).post(createTour)
// tourRouter.route('/:id').get(getTour).patch(updateTour).delete(deleteTour)

app.use('/api/v1/tours', tourRouter); //? burası parent route gibi oldu. tourRouter middleware'i ile uyumlandırdık. Buna "MOUNTING ROUTER" deniyor.

// app.route('/api/v1/tours').get(getAllTours).post(createTour)
// app.route('/api/v1/tours/:id').get(getTour).patch(updateTour).delete(deleteTour)

//* /////////////////////////////////////////

//! NEW RESOURCE ISSUES (For user roles)

// const getAllUsers = (re,res) =>{
//     res.status(500).json({
//         status:"error",
//         message:"this route is not yet defined"
//     })
// }


// const createUser = (re, res) => {
//   res.status(500).json({
//     status: 'error',
//     message: 'this route is not yet defined',
//   });
// };


// const getUser = (re, res) => {
//   res.status(500).json({
//     status: 'error',
//     message: 'this route is not yet defined',
//   });
// };



// const updateUser = (re, res) => {
//   res.status(500).json({
//     status: 'error',
//     message: 'this route is not yet defined',
//   });
// };



// const deleteUser = (re, res) => {
//   res.status(500).json({
//     status: 'error',
//     message: 'this route is not yet defined',
//   });
// };


// const userRouter = express.Router();

// userRouter.route('/').get(getAllUsers).post(createUser);
// userRouter.route('/:id').get(getUser).patch(updateUser).delete(deleteUser)

app.use('/api/v1/users', userRouter);

// app.route('/api/v1/users').get(getAllUsers).post(createUser)
// app.route('/api/v1/users/:id').get(getUser).patch(updateUser).delete(deleteUser)

app.use('/api/v1/reviews' , reviewRouter)

//! diger route'lar dısında route gelirse client'a ne doneriz?? all: all the verbs for CRUD. Bu handler function en sonda yazılmalı hata alınmaması icin.
app.all('*', (req, res , next)=>{
    // res.status(404).json({
    //     status:"fail",
    //     message:`Cant find ${req.originalUrl} on this server!`
    // })

    // const err = new Error(`Cant find ${req.originalUrl} on this server!`);
    // err.status = 'fail';
    // err.statusCode = 404;
    
    //next(err); //! next() içine gecilen her parametre otomatik error olarak kabul edilip pipeline'da en sondaki middleware'e (error handling) atlar ve error'u tasır.

    next(new AppError(`Cant find ${req.originalUrl} on this server!`, 404));
})

//!GLOBAL ERROR HANDLING MIDDLEWARE -- app.use() içine 4 parametreli callback yazınca otomatik  "error handling middleware" oldugu tespit ediliyor.
app.use(globalErrorHandler);

module.exports = app;



