const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync')
const factory = require('./handlerFactory');

const filterObj = (obj, ...allowedFields) =>{
  const newObj = {}
  Object.keys(obj).forEach(el => {
    if(allowedFields.includes(el)){
      newObj[el] = obj[el];
    }
  })
  return newObj;
}


exports.getAllUsers = catchAsync(async(req, res, next) => {
  const users = await User.find() 

  res.status(200).json({
      status: 'success',
      requestedAt: req.requestTime,
      data: {
        users: users
      },
    });
});


exports.updateMe = catchAsync(async (req,res,next)=>{
  // 1) create error if user POSTs password data
  if(req.body.password || req.body.passwordConfirm){
    return next(new AppError('This route is not for password updates.Please use  /updateMyPassword.' , 400))
  }

  // 2) Filtered out unwanted field names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name' , 'email')
  // 3) update user document - sadece name ve email'in degistirlmesine müsade etmek istiyoruz
  const updatedUser = await User.findByIdAndUpdate(req.user.id,  filteredBody , {new:true, runValidators:true});
 
  await updatedUser.save();

  res.status(200).json({
    status:'success',
    data : {
      user: updatedUser
    }
  })
})


exports.deleteMe = catchAsync(async(req,res,next) =>{
  await User.findByIdAndUpdate(req.user.id, {active:false})

  res.status(204).json({
    status:'success',
    data : null
  })
})

//! ADMIN CRUD ISSUES ABOUT USERS
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'this route is not yet defined',
  });
};

exports.getUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'this route is not yet defined',
  });
};

//Do NOT update password with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
