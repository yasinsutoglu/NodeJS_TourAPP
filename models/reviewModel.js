// review --> rating , createdAt, ref to tour , ref to user
const mongoose = require('mongoose');

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

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;

// POST /tour/213asd/reviews --> nested route ornegidir. reviews, tour'un child'ıdır. Aradaki de tourID.
// GET /tour/213asd/reviews 
// GET /tour/213asd/reviews/1235kjalhda2