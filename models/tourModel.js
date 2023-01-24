const mongoose = require('mongoose'); //mongoDB driver modulunu import ettik.
const slugify = require('slugify');
// const User = require('./userModel') --> embedding'te kullanırken yazdık referencing icin gerek yok
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
      set: val => Math.round(val*10) / 10 // setter function yazdık. 4.666->4.7 olmasını sagladık
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
    startLocation: {
      // GeoJSON is used to modify geospatial data
      type : {
        type:String,
        default:'Point', // also can be specified lines,polygons etc...
        enum:['Point']
      },
      coordinates: [Number], // we expect that array of numbers- longitude first and latitude second
      address: String,
      description : String
    },
    //? locations array'i tour icine tanımlayarak embedded documents olusturmus olduk
    locations:[
      {
        type: { type: String, default: 'Point', enum:['Point']},
        coordinates: [Number],
        address : String,
        description : String,
        day : Number
      }
    ],
    // guides: Array --> embedding icin kullanmıstık
    //? referencing icin yazdık!
    guides: [
      {
        type : mongoose.Schema.ObjectId ,
         ref : 'User', // user documents reference gosterildi, import etmeye gerek yok
      }
    ],
  },
  //?OPTIONS OBJ.
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//* 1-> ascending order with index in mongoDB accordingto price field. Bunu mongoDB'de query sonucu arama performansını arttırmak amacıyla kullanıyoruz. -1 -> descending order,  Bu index field'ları kullanıcıların en cok query sorgusu yapabilecekleri field'lara gore kurgulanır.
// tourSchema.index({price: 1})
tourSchema.index({ price: 1 , ratingsAverage: -1 });
tourSchema.index({slug:1});
tourSchema.index({startLocation: '2dsphere'})


//? VIRTUAL; ile database'e işleme yapmadan response kısmında durationWeeks'i client'a gonderebiliyoruz. Kullanıcının ihtiyacı olabilecek birseyi her seferinde convert ile ugrasmasına gerek kalmıyor.
//? this--> current document'i temsil eder. This kullanmak gerektiginden callback olarak arrow kullanamayız.
tourSchema.virtual('durationWeeks').get(function(){
  return this.duration / 7;
})

//! VIRTUAL POPULATE--> child referencing ile database'i sisirmeden herbir tour'un review'larını getirtiyoruz
tourSchema.virtual('reviews', {
  ref:'Review',
  foreignField: 'tour', // tourModel'a gore foreign-->reviewModel, field --> reviewModel'ın tour fieldı
  localField:'_id'
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

//! burayı tour guide'ları embedding ile modellerken yaptık ama referencing ile daha kolay olacagından ona donduk.
// tourSchema.pre('save' , async function(next){
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises)
//   next();
// })

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

//!populate('guides) query'si yapılıp getirilen tour'un ilgili guide document'lerini de ekliyor. populate(),  yeni query olusturur performans acısından kullanıma dikkat et!
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt', //select ile bu property'leri query ile getirirken devre dısı bıraktık
  });
  
  next();
});

//!docs--> query sonucu donen documents object'leri
tourSchema.post(/^find/, function (docs , next) {
  console.log(`Query took ${Date.now()-this.start} milisecs`)
  console.log(docs)
  next();
});



//? AGGREGATION MIDDLEWARE; runs a lot of functions before/after an aggregation happens.
//*aggregate Hook kullanıldı
//!this --> aggregation object
//!bu pipeline geoNear'ın onunde olmaması gerektiğinden kapattık
// tourSchema.pre('aggregate' , function(next){
//   this.pipeline().unshift({$match:{secretTour:{$ne:true}}}) //* secretTour not equal olan pipeline'dan cıkarıldı.

//   console.log(this.pipeline())
//   next()
// })


//! creating model-> model olusturulurken conventional olarak ilk harf büyük olur. model()'ın ilk parametresi modelname, ikinci parametresi schema'dır. Model blueprint gibi dusunulebilir. Bundan document'lar turetilir.
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour; //?tourController'da kullanacagımız icin export default yaptık.
