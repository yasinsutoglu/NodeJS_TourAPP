const mongoose = require('mongoose'); //mongoDB driver modulunu import ettik.
const slugify = require('slugify');
// const validator = require('validator');

//! DB document schema tanımladık bundan yararlanılarak model olusturulur.
//* required bir validator'dır. Kendi validator'umuzu da olusturabiliriz.
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal than 40 chars'],
      minlength: [10, 'A tour name must have more or equal than 10 chars'],
      // validate: [validator.isAlpha, 'A tour name must only contain chars'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      //!enum is example of built-in validator
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Diffculty is either: easy,medium,difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },

    priceDiscount: {
      type: Number,
      //! creating custom validator property
      validate: {
        validator: function (val) {
          //* this --> only points to current doc on NEW document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below reqular price',
      },
    },

    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String], //! string array'i oldugunu gosterir
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, //! default olarak response'da client'a gostermeme olarak ayarlamak icin yazdık.
    },
    startDates: [Date], //! mongoDB girdigimiz herhangibir tarihi date formatına otomatik cevirir.
    secretTour: { type: Boolean, default: false },
  },
  //?OPTIONS OBJ.
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//? VIRTUAL; ile database'e işleme yapmadan response kısmında durationWeeks'i client'a gonderebiliyoruz. Kullanıcının ihtiyacı olabilecek birseyi her seferinde convert ile ugrasmasına gerek kalmıyor.
//? this--> current document'i temsil eder. This kullanmak gerektiginden callback olarak arrow kullanamayız.
tourSchema.virtual('durationWeeks').get(function(){
  return this.duration / 7;
})


//? DOCUMENT MIDDLEWARE;  axios.interceptor gibi document ile ilgili event oncesi veya sonrası yapılacak fonksiyonları tanımlamada kullanılabilir.
//*Runs before .save() and .create() not for update()
//? this --> currently document (tour object)
//* save Hook kullanıldı
tourSchema.pre('save', function(next) {
  // console.log(this)
  this.slug = slugify(this.name, {lower:true});
  next();
})

//! this kullanmıyoruz. doc: finished document
// tourSchema.post('save', function(doc,next){
//   console.log(doc);
//   next();
// })

//? QUERY MIDDLEWARE; runs a lot of functions before/after a certain query executed. Mesela VIP insanlar icin ozel bir query yazılıp herkese gosterilmesin istiyoruz o zaman bunu kullanabiliriz. 
//!this --> query object
//* find Hook ve findOne Hook kullanılıdı. Aslında find ile baslayanların hepsi icin kullanıldı.

//tourSchema.pre('find' , function(next){
tourSchema.pre(/^find/ , function(next){
  this.find({secretTour:{$ne:true}})

  this.start = Date.now()
  next();
})

//!docs--> query sonucu donen documents object'leri
tourSchema.post(/^find/, function (docs , next) {
  console.log(`Query took ${Date.now()-this.start} milisecs`)
  console.log(docs)
  next();
});

//? AGGREGATION MIDDLEWARE; runs a lot of functions before/after an aggregation happens.
//*aggregate Hook kullanıldı
//!this --> aggregation object
tourSchema.pre('aggregate' , function(next){
  this.pipeline().unshift({$match:{secretTour:{$ne:true}}}) //* secretTour not equal olan pipeline'dan cıkarıldı.
  console.log(this.pipeline())
  next()
})


//! creating model-> model olusturulurken conventional olarak ilk harf büyük olur. model()'ın ilk parametresi modelname, ikinci parametresi schema'dır. Model blueprint gibi dusunulebilir. Bundan document'lar turetilir.
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour; //?tourController'da kullanacagımız icin export default yaptık.
