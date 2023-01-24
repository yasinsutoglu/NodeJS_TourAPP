// review --> rating , createdAt, ref to tour , ref to user
const mongoose = require('mongoose');
const Tour = require('./tourModel')

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    //! burada parent referencing en uygun olanı
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour!'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user!'],
    },
  },
  //?OPTIONS OBJ. --> virtual query'de client'a gostermese de hesaplamalara katmak icin kullanılan options.
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.pre(/^find/ , function(next){
    // this.populate({
    //     path: 'tour',
    //     select: 'name'
    // }).populate({
    //     path: 'user',
    //     select:'name photo'
    // })

     this.populate({
       path: 'user',
       select: 'name photo',
     });

    next();
})

//! we have created static method in here
//* burası document middleware oldugundan this--> document'dir
reviewSchema.statics.calcAverageRatings = async function(tourId){
  //this--> current model
  const stats = await this.aggregate([
    {
      $match : {tour: tourId},
    },
    { //* we calculated stats in here
      $group: {
        _id : '$tour',
        nRating : {$sum : 1},
        avgRating: {$avg : '$rating'}
      }
    }
  ])

//*we saved the statistics for the current tour
if(stats.length > 0){
  await Tour.findByIdAndUpdate(tourId, {
    ratingsQuantity: stats[0].nRating,
    ratingsAverage: stats[0].avgRating,
  });
}else {
  await Tour.findByIdAndUpdate(tourId, {
    ratingsQuantity: 0,
    ratingsAverage: 4.5,
  });
 }  
}

//* each combination of tour&user will always be unique.
reviewSchema.index({tour:1 , user:1} , {unique:true})
 
//! aggragete hesaplamasının, document db'ye kaydı sonrası yapılsın istedik
reviewSchema.post('save' , function(){
  // this -> current review
  //! the constructor is basically the model who created that document. " this.constructor --> tour"
  this.constructor.calcAverageRatings(this.tour)
})

// findByIdAndUpdate, findByIdAndDelete için işlemler
//* burası query middleware oldugundan this --> current query'dir ama sonucu document'dir.
//! burası pre yerine post olsaydı query sonucunu alamazdık ama post yapmaya ihtiyacımız var. Alttaki iki middleware ile cozduk. "this.r" ile pre middleware'den post middleware'e data pass ettik.
reviewSchema.pre(/^findOneAnd/ , async function(next){
  this.r = await this.findOne();

  next();
})

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne() --> does NOT work here, query has already executed
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;

// POST /tour/213asd/reviews --> nested route ornegidir. reviews, tour'un child'ıdır. Aradaki de tourID.
// GET /tour/213asd/reviews 
// GET /tour/213asd/reviews/1235kjalhda2