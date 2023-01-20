
class AppError extends Error {
    constructor(message, statusCode){
      super(message);

      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;

      Error.captureStackTrace(this, this.constructor); //! bu satır bize hatamızın hangi dokumanda kacıncı satırda oldugunu gostermesi acısıdan hatanın stack'lenmesi icin yazılmıstır.
      //?Error.captureStackTrace(targetObject[, constructorOpt]) --> Creates a .stack property on targetObject, which when accessed returns a string representing the location in the code at which Error.captureStackTrace() was called.
    }
}

module.exports = AppError;