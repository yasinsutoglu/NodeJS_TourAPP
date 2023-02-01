//? General Info:  next() içine gecilen her parametre otomatik error olarak kabul edilip pipeline'da en sondaki middleware'e (error handling) atlar ve error'u tasır.

const AppError = require('../utils/appError');

//! handling JWT Error
const handleJWTError = ()=>{
   return new AppError('Invalid token. Please log in again', 401)
}

const handleJWTExpiredError = ()=>{
  return new AppError('Your token has expired! Please log in again' , 401)
}

//! handling Invalid DB id
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;

  return new AppError(message, 400);
};

//! Handling Duplicate DB Fields
const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0]; //* "....." --> quotes arasındaki ifadeyi alan Regex
  const message = `Duplicate field value: ${value}. Please use another value`;
  return new AppError(message, 400);
};

//! Handling Validation DB Fields
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;

  return new AppError(message, 400);
};

// Handling errors during development
const sendErrorDev = (err, req, res) => {
  // API
  if(req.originalUrl.startsWith('/api')){
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  //RENDERED WEBSITE
    return res.status(err.statusCode).render('error' , {
      title:'Something went wrong!',
      msg: err.message
    })
 };

// Handling errors during production
const sendErrorProd = (err, req, res) => {
  //API
  if(req.originalUrl.startsWith('/api')){
    //Operational, trusted error: send message to client
    if (err.isOperational) {
     return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } 
    //Programming or other unknown error: don't leak error details
      // 1) Log error
      console.error('ERROR!', err);
      // 2) Send generic message
     return res.status(500).json({
        status: 'error',
        message: 'Something went wrong',
      });
    
  }

  // RENDERED WEBSITE
    //Operational, trusted error: send message to client
  if(err.isOperational){
     return res.status(err.statusCode).render('error', {
       title: 'Something went wrong!',
       msg: err.message,
     });
    } 
    //Programming or other unknown error: don't leak error details
    console.error('ERROR!', err);
      // Send generic message
      return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: 'Please try again later.',
      }); 
};

//! globalErrorHandler default export edildi
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err,req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err }; // deep copy
    error.message = err.message;

    if (error.name === 'CastError') {
      error = handleCastErrorDB(error);
    }
    if (error.code === 11000) {
      error = handleDuplicateFieldsDB(error);
    }
    if (error.name === 'ValidationError') {
      error = handleValidationErrorDB(error);
    }
    if(error.name === 'JsonWebTokenError'){
      error = handleJWTError()
    }
    if(error.name === 'TokenExpiredError'){
      error = handleJWTExpiredError();
    }

    sendErrorProd(error,req, res);
  }
};
