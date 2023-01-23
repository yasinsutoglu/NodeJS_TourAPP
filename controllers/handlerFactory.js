//!FACTORY FUNCTION --> this kind of functions returns another function like a handler function to be used in controller folder for CRUD operations.

const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

//?Bu factory fonksiyon artık tum modellerin controller.js file'larında import edilip kullanılabilir oldu.
//* JS closure sayesinde catchAsync içinden Model parametresine ulasabiliyoruz.
exports.deleteOne = (Model) => catchAsync(async (req, res, next) => {
  const doc = await Model.findByIdAndDelete(req.params.id);

  if (!doc) {
    return next(new AppError('No document found with that ID', 404)); //! burada return kullanmazsak alttaki response'ı da calıstırır.
  }

  //! 204 --> no content
  res.status(204).json({
    status: 'success',
    data: null,
  });  
});


exports.updateOne = (Model) => catchAsync(async (req, res, next) => {

    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true, //? yeni object donmesi demek
      runValidators: true,
    }); //! promise donen methoddur. ilk parametre id, ikinicisi update edilecek data, ucuncusu options.

    if (!doc) {
      return next(new AppError('No document found with that ID', 404)); //! burada return kullanmazsak alttaki response'ı da calıstırır.
    }

    res.status(200).json({
      status: 'success',
      data: {
       data: doc
      },
    });
  });

  exports.createOne = Model => catchAsync(async (req, res, next) => {
     const newDoc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: newDoc,
      },
    });
  });