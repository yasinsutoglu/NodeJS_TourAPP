const crypto = require('crypto')
const {promisify} = require('util') //promisify method kullanmak icin import ettik (buil-in module)
const jwt = require('jsonwebtoken')
const User = require('../models/userModel')
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError')
const Email = require('../utils/email');


const signToken = (id) => {
    return jwt.sign({ id: id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
}

const createSendToken = (user, statusCode,req, res) => {
    const token = signToken(user._id);

    //?sending cookie to client
    const cookieOptions = {
        expires: new Date(Date.now()+ process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000), // gün olarak
        httpOnly:true,
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
    }

    // if(process.env.NODE_ENV === 'production'){
    //     cookieOptions.secure = true;
    // } 
    

    res.cookie('jwt', token, cookieOptions )
// remove password from respones to client
    user.password = undefined;

    res.status(statusCode).json({
      status: 'success',
      token,
      data:{
        user
      }
    });
} 

exports.signup = catchAsync(async(req,res,next)=>{

    const newUser = await User.create({
        name: req.body.name,
        email:req.body.email,
        password:req.body.password,
        // passwordChangedAt: req.body.passwordChangedAt,
        passwordConfirm: req.body.passwordConfirm
    });

    const url = `${req.protocol}://${req.get('host')}/me`;
    await new Email(newUser, url).sendWelcome();

    //! sign()--> 1.parametre: payload, 2.parametre: secret, 3.parametre: options (e.g. expirationTime)
    // const token = jwt.sign({id:newUser._id}, process.env.JWT_SECRET,{
    //     expiresIn : process.env.JWT_EXPIRES_IN
    // })
    createSendToken(newUser, 201 , req, res)
});


exports.login = catchAsync( async (req,res,next)=>{
    const {email,password} = req.body;

    //! 1) Check if email and password exist
        if(!email || !password){
          return next(new AppError('Please provide email and password!' , 400))
        }
    //! 2) Check if user exists && password is correct
    //* select'i field'lar ile kullanıyorduk burada "+" bize default gelmeyenleri getirmesi icindir.
        const user = await User.findOne({email:email}).select('+password')

        if(!user || !(await user.correctPassword(password, user.password))){
            return next(new AppError('Incorrect email or password',401))
        }

    //! 3) If everything is ok, send token to client
    createSendToken(user, 200,req, res);
});

exports.logout = (req,res)=>{
    res.cookie('jwt','loggedout', {
        expires: new Date(Date.now() + 10*1000),
        httpOnly:true
    });
    res.status(200).json({
        status: 'success'
    })
}

//?AUTHENTICATION PROCESS
exports.protect = catchAsync(async(req,res,next)=>{
    //! 1) Getting token and check of it's there
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        token = req.headers.authorization.split(' ')[1];
    }else if(req.cookies.jwt){
        token=req.cookies.jwt
    }

    if(!token){
        return next(new AppError('You are not logged in! Please log in to get access', 401))
    }
    //! 2) Verification token(biri payload'u degistirdi mi ya da token expired oldu mu?)
    //* 3.parametre verification tamamlanınca calısacak callback function.
    //? burada async func kullandıgımızdan jwt.verify()'ın promise dondurmesini sagladık.
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET )
    
    //! 3)Check if user still exists. Because it may be deleted before the request is sent.
    const currentUser = await User.findById(decoded.id);
    if(!currentUser){
        return next(new AppError('The token belonging to this token does not exist',401))
    }
    //! 4) Check if user changed password after the token was issued(yayına cıkarılmıs)
    if(currentUser.changedPasswordAfter(decoded.iat)){
        return next(new AppError('User recently changed password! Please log in again.' , 401))
    }

    //! GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser; //* req --> middleware'den middleware'e erisilebilir oldugundan currentUser'ı atadık.
    res.locals.user = currentUser;
    next()
})

//?LOGIN MIDDLEWARE
//? Only for rendered pages , no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      //1) verifiy token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      //2)Check if user still exists.
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued(yayına cıkarılmıs)
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      //! there is a logged in user. Her pug template res.locals'a erisebilmektedir.
      res.locals.user = currentUser;
      return next();

    } catch (error) {
        return next()
    }
  }
  next();
};


//?AUTHORIZATION PROCESS
exports.restrictTo = (...roles)=>{
    //! closure sayesinde roles'e return'de donen fonksiyonda ulasılabilinir.
    return (req,res,next) => {
        //roles ['admin' , 'lead-guide'].  role='user'
        //*req.user = currentUser ile guncel tutmustuk(protect fonksiyonunda)
        if(!roles.includes(req.user.role)){
            return next(new AppError('You do not have permission to perform this action', 403))
        }
        next();
    }
}

//! RESETING PASSWORD ISSUES
exports.forgotPassword = catchAsync(async (req,res,next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address', 404));
  }
  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); //!all validator'ları devre dısı bıraktı bu durum icin

  // const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to ${resetURL}.\nIf you didn't forgot your password, please ignore this email!`;

  //3) send it to users email
  //* global error handling'de bunu halletmek zor oldugundan trycatch kullandık burada!
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    // await sendEmail({
    //   email: user.email,
    //   subject: 'your password reset token (valid for 10 min)',
    //   message,
    // });
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'token sent to your email!',
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email.Try again later!', 500)
    );
  }
})


exports.resetPassword = catchAsync(async(req, res, next) => {
    //! son olarak token url'de encrypt olmadan gitti, ama DB'de encrypted halde
    // 1) get user based on the token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({passwordResetToken: hashedToken, passwordResetExpires: {$gt:Date.now()}})

    // 2) ıf token has not expired, and there is user, set the new password
    if(!user){
        return next(new AppError('Token is invalid or has expired!', 400))
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save()

    // 3) Update changedPasswordAt property for the user
    //! burayı userModel kısmında hallettik.
    // 4) log the user in, send JWT
     createSendToken(user, 200,req, res);
});


exports.updatePassword = catchAsync(async (req,res,next) => {
    // 1) get user from collection
        const user = await User.findById(req.user.id).select('+password');
    // 2) check if POSTed current password is correct
    if(!(await user.correctPassword(req.body.passwordCurrent, user.password))){
        return next(new AppError('Your current password is wrong.', 401))
    }
    // 3) If so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    //!User.findByIdAndUpdate ile yapmaya calıssaydık; validator'lar işlemezdi ve pre.save middleware'ler calısmayıp encryption olmazdı.

    // 4) Log user in, send JWT
     createSendToken(user, 200,req, res);
})