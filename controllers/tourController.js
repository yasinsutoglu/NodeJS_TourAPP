// const fs = require('fs');
const Tour = require('../models/tourModel'); //! DB model'i import ettik.
const AppError = require('../utils/appError');
// const APIFeatures = require('../utils/apiFeatures'); //! DB filtering,sorting vs işlemleri yaptıgımız class
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const multer = require('multer')
const sharp = require('sharp');

const multerStorage = multer.memoryStorage();

//*bu filterın amacı, sadece photo file'ların yuklenmesini saglamak haricindekileri engellemek
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([{name:'imageCover', maxCount:1}, {name:'images', maxCount:3}]);
// upload.single('image') --> req.file
// upload.array('images',5) --> req.files

exports.resizeTourImages = catchAsync(async (req,res,next) =>{
  // console.log(req.files)
  if(!req.files.imageCover || !req.files.images) return next();

  // 1) Cover image issues
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

   await sharp(req.files.imageCover[0].buffer)
     .resize(2000, 1333)
     .toFormat('jpeg')
     .jpeg({ quality: 90 })
     .toFile(`public/img/tours/${req.body.imageCover}`);
   
   // 2) Other Images issues
   req.body.images=[];

   await Promise.all( req.files.images.map( async(file , index) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${index + 1}.jpeg`;

      await sharp(file.buffer)
     .resize(2000, 1333)
     .toFormat('jpeg')
     .jpeg({ quality: 90 })
     .toFile(`public/img/tours/${filename}`);

     req.body.images.push(filename)
   }));   

  next();
});


//! localden data cekip test etmek amacıyla yazmıstık. DB varkern ihtiyac kalmadı!
// const tours = JSON.parse(
//fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

//? DB varken ihtiyacımız kalmadı!
// exports.checkID = (req,res,next,val) =>{
//   if (req.params.id * 1 > tours.length) {
//     //! burada return kullanmazsak response dondukten sonra function run etmeye devam eder.next() ile pipeline'da sonraki middleware'e gidip oradan da response doner.
//     return res.status(404).json({
//       status: 'fail',
//       message: 'Invalid Id',
//     });
//   }
//   next();
// }

//?DB varken ihtiyacımız kalmadı
// exports.checkBody = (req,res,next)=>{
//   if(!req.body.name || !req.body.price ){
//     return res.status(400).json({
//       status:"fail",
//       message:"missing name or price",
//     })
//   }
//   next();
// }

exports.aliasTopTours = (req,res,next)=>{
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields= 'name,price,ratingsAverage,summary,difficulty';
  next();
}

//? GET ALL TOURS
exports.getAllTours = factory.getAll(Tour)
//exports.getAllTours = catchAsync(async (req, res, next) => {
  // try {
    //?BUILD QUERY
    //! 1A)Filtering
    // const queryObj = { ...req.query }; //!simply creating a new object(deep copy)
    // const excludedFields = ['page', 'sort', 'limit', 'fields'];
    // excludedFields.forEach((el) => delete queryObj[el]);

    //console.log(req.query, queryObj); 
    //* { duration: {gte:'5' } , difficulty: 'easy' } seklinde object dondu ama { duration: {$gte:'5' } , difficulty: 'easy' } sekline donusturup find() icine vermeliyiz

    // const tours = await Tour.find({
    //   duration:5,
    //   difficulty: 'easy',
    // }); //!DB'den filtreleme objectine uyan tüm documents'ları getiren method'dur ve array doner. Promise doner.İçindeki parametre filtreleme objectidir.

    //! 1B) Advanced Filtering
    // let queryStr = JSON.stringify(queryObj);
    // queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    // let query = Tour.find(JSON.parse(queryStr)); //? find(), Query.prototype object doner.Bu object'de ait method'lar chain halinde kullanılabilir

    //! 2) Sorting - Ascending order => 127.0.0.1:3000/api/v1/tours?sort=price , Descending => sort=-price; İkinci sort kriteri için sort=price,ratingsAverage yazılır
    // if (req.query.sort) {
    //   const sortBy = req.query.sort.split(',').join(' ');
    //   query = query.sort(sortBy);
    // } else {
    //   query = query.sort('-createdAt'); //* default sorting icin yazdık.
    // }

    //! 3) Field Limiting => 127.0.0.1:3000/api/v1/tours?fields=name,duration,difficulty,price
    // if (req.query.fields) {
    //   const fields = req.query.fields.split(',').join(' ');
    //   query = query.select(fields);
    // } else {
    //   query = query.select('-__v'); //! - : excluding the indicated field name anlamında yani __v harici tüm fieldlar
    // }

    //! 4) Pagination => 127.0.0.1:3000/api/v1/tours?page=3&limit=10 ;  page 1: skip 1-10 elements, page 2: skip 11-20 elements...
    // const page = req.query.page * 1 || 1;
    // const limit = req.query.limit * 1 || 100;
    // const skip = (page - 1) * limit;

    // query = query.skip(skip).limit(limit);

    // if (req.query.page) {
    //   const numTours = await Tour.countDocuments();
    //   if (skip >= numTours) throw new Error('this page does not exist');
    // }

    //?EXECUTE QUERY
    //*Tour.find() --> Query.prototype object doner ;; req.query--> queryString'dir
    //const features = new APIFeatures(Tour.find(), req.query).filter().sort().limitFields().paginate();
    //const tours = await features.query; //* query.sort().select().skip().limit() gibi oldu simdiye kadar

    //!Alternatif method for filtering but it stands so long format
    // const tours = await Tour.find().where('duration').equals(5).where('difficulty').equals('easy')

    //?SEND RESPONSE
    // res.status(200).json({
    //   status: 'success',
    //   requestedAt: req.requestTime,
    //   results: tours.length, //? bu satır nice to have
    //   //* burada ENVELOPING yaptık.(Jsend data specification kullanarak)
    //   data: {
    //     // tours: myTours,
    //     tours: tours, //!key olan tours --> route'un resource name'i ile aynı olmalı.
    //   },
    // });
  // } catch (error) {
  //   res.status(404).json({
  //     status:"fail",
  //     message:error
  //   })
  // }  
// });

//?HANDLING READ REQUEST (for 1 item)
exports.getTour = factory.getOne(Tour , {path : 'reviews'}) //! path--> populate field'ı temsil eder
// exports.getTour = catchAsync(async (req, res,next) => {
//  //console.log(req.params);
//   //! req.params ile object'in key-value pair'larında tüm parametreleri alırız. Belirtilen tüm parametreler url'de gelmelidir. Eger optional olmasını istiyorsak ":id?" şeklinde yazılmalıdır.

//   //const id = req.params.id * 1; //! string olan degeri number'a cevirmek icin yaptık.
//   //const tour = tours.find((el) => el.id === id);

//   //? burada url'le client'dan gelen id yoksa hata donduk.
//   //* Alttaki hata kontrol kod blogunu middleware ile sadelestirdik diye kaldırdık.
//   // // if(id > tours.length) {
//   // if (!tour) {
//   //   return res.status(404).json({
//   //     status: 'fail',
//   //     message: 'Invalid Id',
//   //   });
//   // }

//   // try {
//    const tour = await Tour.findById(req.params.id).populate('reviews') //! bu method id'ye göre data doner. Promise olarak doner. 
//    //Tour.findOne({_id:req.params.id}) --> alternatif kullanım findById'nin.

//    if(!tour){
//     return next(new AppError('No tour found with that ID', 404)) //! burada return kullanmazsak alttaki response'ı da calıstırır.
//    }

//     res.status(200).json({
//       status: 'success',
//       data: {
//         tour: tour,
//       },
//     });
//   // } catch (error) {
//   //   res.status(404).json({
//   //     status: 'fail',
//   //     message: error,
//   //   });
//   // }
  
// });

//?HANDLING CREATE REQUEST
exports.createTour = factory.createOne(Tour)
//! burada req(request)==> client'dan server'a gonderilen data(information)'ın hepsini tutar. Express, body data'yı req'te bulundurmaz ona ulasmak icin middleware kullanmak gerekir.
// exports.createTour = catchAsync(async (req, res, next) => {
  // console.log(req.body) //! middleware kullanmasak burada object yerine undefined gorurduk

  // const newId = tours[tours.length - 1].id + 1;
  // const newTour = Object.assign({ id: newId }, req.body);

  // tours.push(newTour);

  //? burada writeFileSync koyarsak callback icinde oldugumuzdan blocklamıs oluruz.DB kullandıgmız icin bunu kaldırdık!
  // fs.writeFile(
  //   `${__dirname}/dev-data/data/tours-simple.json`,
  //   JSON.stringify(tours),
  //   (err) => {
  //     //? 201 kodu created anlamındadır
  //     res.status(201).json({
  //       status: 'success',
  //       data: {
  //         tour: newTour,
  //       },
  //     });
  //   }
  // );

  //! Db kullanırken yazılacak kodlar
  // const newTour = new Tour({.....})
  // newTour.save() //save() methodu document'ın methodudur , create({}) ise model'in methodu'dur.Promise doner.
  //?üstteki iki satır kodun alternatifi:  
  // try {
    //  const newTour = await Tour.create(req.body);

    //  res.status(201).json({
    //    status: 'success',
    //    data: {
    //      tour: newTour,
    //    },
    //  });
  // } catch (error) {
  //   res.status(400).json({
  //     status:"fail",
  //     message:error,
  //   })
  // } 

//   const newTour = await Tour.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour,
//     },
//   });

// });

//?HANDLING UPDATE REQUEST
exports.updateTour  = factory.updateOne(Tour)
// exports.updateTour = catchAsync(async (req, res, next) => {
//   // if (req.params.id * 1 > tours.length) {
//   //   return res.status(404).json({
//   //     status: 'fail',
//   //     message: 'Invalid Id',
//   //   });
//   // }
// //  try {
//    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new:true, //? yeni object donmesi demek
//     runValidators:true,
//   }) //! promise donen methoddur. ilk parametre id, ikinicisi update edilecek data, ucuncusu options.

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404)); //! burada return kullanmazsak alttaki response'ı da calıstırır.
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour
//     },
//   });
// //  } catch (error) {
// //   res.status(404).json({
// //     status: 'fail',
// //     message: error,
// //   });
// //  }
  
// });

//?HANDLING DELETE REQUEST
exports.deleteTour = factory.deleteOne(Tour);
// exports.deleteTour = catchAsync(async (req, res, next) => {
//   // if (req.params.id * 1 > tours.length) {
//   //   return res.status(404).json({
//   //     status: 'fail',
//   //     message: 'Invalid Id',
//   //   });
//   // }
//   // try {
//     const tour = await Tour.findByIdAndDelete(req.params.id)

//     if (!tour) {
//       return next(new AppError('No tour found with that ID', 404)); //! burada return kullanmazsak alttaki response'ı da calıstırır.
//     }

//     //! 204 --> no content
//     res.status(204).json({
//       status: 'success',
//       data: null,
//     });
//   // } catch (error) {
//   //    res.status(404).json({
//   //      status: 'fail',
//   //      message: error,
//   //    });
//   // }
 
// });

//? İstatistik olusturmak icin mongoDB aggregate pipeline kullanırız.
exports.getTourStats = catchAsync(async (req,res,next) =>{
  // try {
    //! burada [] içinde stage'ler(match,group,sort) tanımlarız ve data bunlardan step by step gecer.
    const stats = await Tour.aggregate([
      {
        $match:{
          ratingsAverage:{$gte:4.5}
        }
    },

      // {$group:{_id:null,numTours:{$sum:1},numRatings:{$sum:'$ratingsQuantity'}, avgRating:{$avg:'$ratingsAverage'}, avgPrice:{$avg:'$price'}, minPrice:{$min:'$price'}, maxPrice:{$max:'$price'}}},
      {
        $group:{
          _id:{$toUpper:'$difficulty'},
          numTours:{$sum:1},
          numRatings:{$sum:'$ratingsQuantity'},
           avgRating:{$avg:'$ratingsAverage'}, 
           avgPrice:{$avg:'$price'}, 
           minPrice:{$min:'$price'}, 
           maxPrice:{$max:'$price'}
          }
      },

      //* pipeline icindeki en son property name kullanılıyor ve 1:ascending order'dır.
      {
        $sort:{
          avgPrice:1
        }
      },

      //* ne:not equal
      // {$match:{_id:{$ne:'EASY'}}}
    ])

    res.status(200).json({
      status: 'success',
      data: {
        stats,
      },
    });
  // } catch (error) {
  //   res.status(404).json({
  //     status: 'fail',
  //     message: error,
  //   });
  // }
})

exports.getMonthlyPlan = catchAsync(async(req,res,next)=>{
  // try {
    const year = req.params.year * 1; //2021

    const plan = await Tour.aggregate([
      //* unwind: girilen field name'e gore documents'ları deconstruct ediyor
      {$unwind:'$startDates'},
      {$match:{startDates:{$gte:new Date(`${year}-01-01`), $lte:new Date(`${year}-12-31`)}}},
      {$group:{_id:{$month:'$startDates'}, numTourStarts:{$sum:1}, tours:{$push: '$name'}}},
      {$addFields:{month: '$_id'}},
      //* _id:0 --> id property'sini gosterme demek
      {$project: {_id:0}},
      {$sort:{numTourStarts: -1}},
      {$limit:12} //* 12 documents ile sınırladı result'ı.
    ])

    res.status(200).json({
      status: 'success',
      data: {
        plan,
      },
    });
  // } catch (error) {
  //   res.status(404).json({
  //     status: 'fail',
  //     message: error,
  //   });
  // }
})


// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/23/center/34.111745,-118.113491/unit/mi
exports.getToursWithin =  catchAsync(async(req,res,next) =>{
  const {distance , unit , latlng} = req.params;
  const [lat , lng] = latlng.split(',');

  //! mongoDB expects the radius as radians unit. In here, we have a conversion.
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if(!lat || !lng){
    next(new AppError('Please provide latitude and longitude in the format lat,lng.' , 400))
  }

  const tours = await Tour.find({startLocation: { $geoWithin: {$centerSphere: [[lng,lat] , radius]}}})

  res.status(200).json({
    status : 'success',
    results: tours.length,
    data:{
      data: tours
    }
  })
})


exports.getDistances = catchAsync(async(req,res,next)=>{
  const { unit, latlng } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
 
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

const distances = await Tour.aggregate([
  {
    $geoNear: {
      near: {type: 'Point', coordinates: [lng * 1 ,lat * 1]},
      distanceField: 'distance',
      distanceMultiplier: multiplier
    }
  },
  {
    $project : {
      distance: 1,
      name: 1
    }
  }
]);
  

res.status(200).json({
  status: 'success',
  data: {
    data: distances,
  },
});
})