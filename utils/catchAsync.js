// const catchAsync = (fn) => {
//   return (req, res, next)=>{
//     fn(req,res,next).catch(err=> next(err))
//   }
// };
//! catchASync ile sarmaladıgımız kodlardan hata cıkması durumunda bizi errorController'daki globalHandlingError middleware'ine yonlendiren fonksiyon
module.exports = (fn) => (req, res, next) =>
  fn(req, res, next).catch((err) => next(err));
