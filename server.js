//* projeye baslarken "npm init" ile package.json file olusturduk. Sonra "npm i express@4" ile express'i 3rd party olarak ekledik.

//? package.json'da asagıdaki degisiklik yapıldıktan sonra nodemon server.js ile projeyi calıstırmak yerine     "npm start" yapabiliriz.
//* npm start:prod yaparsak production ortamında projeyi calıstırmıs oluruz.
//!"scripts": {
//!     "start:dev": "nodemon server.js",
//!     "start:prod": "NODE_ENV=production nodemon server.js"
//!   },

const mongoose = require('mongoose'); //mongoDB driver modulunu import ettik.

//! enviroment variables tüm projede 1 kez import edilip her yerde kullanılır. Tekrar tekrar her dosyada import etmeye gerek yoktur.
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' }); //! enviroment variable'ları dosyadan okuyup node.js ortamına tasımıs olduk.Bu işlem dosyanın en üstünde olmalı ki projede gecerli olsun. "const app = require('./app')"dan sonra olmamalıdır.

//? SENKRON KODLAR CALISIRKEN MEYDANA GELEN HATALARI HANDLING ETME (UncaughtExceptions)
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! Shuting Down...');
  console.log(err.name, err.message);
  process.exit(1); //uncaught exception ile app shut down;
});

//* express() ile olusturdugumuz app'i buraya import ettik ki server start için app.listen() yapabilelim
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

//! db connection yapılıyor. connect()'in ilk parametresi baglantı db baglantı linki, ikincisi options object for deprecation warnings. connect() bize promise doner.
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log('DB connection successful');
  });
//! then(con => console.log(con.connections)) ile baglantı detayları gorulur.

//?DB TEST ICIN YAZILAN KODLAR-----------
// //!model'den turetilen document objecti yazdık.
// const testTour = new Tour({
//   name: 'The Park Camper',
//   rating: 4.8,
//   price: 397,
// });

// //! database olusturulan document save edilir. save() methodu promise doner. doc --> db'ye kaydedilen document'dir.
// testTour
//   .save()
//   .then((doc) => {
//     console.log(doc);
//   })
//   .catch((err) => console.log(err));
//?-----------------------------------------------

//! node.js ortamının otomatik env. variable'ı
// console.log(process.env)
//* Express.js icin terminale "NODE_ENV=development nodemon server.js" yazmalıyız.

//!START SERVER
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

//? LOGIN OLAMAZSAK VEYA DB COKERSEYE KARSI ERROR HANDLING BURADA (express.js dısı promise rejection error'lar)
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION, Shutting Down');
  //* pending requestlerin kapanması icin sure veriyoruz.
  server.close(() => {
    process.exit(1); //app shut down;
  });
});

//!heroku kullanılırken sleep'te kapatma durumuna karsı yazıldı.
process.on('SIGTERM', ()=>{
  console.log('SIGTERM RECEIVED. Shutting down gracefully!');
  server.close(()=>{
    console.log('Process terminated!')
  })
})
