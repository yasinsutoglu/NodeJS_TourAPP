const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs')
const crypto = require('crypto') //!built-in module, no need to npm install

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true, // validator
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: String,
  role:{
    type : String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE!
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date
});

userSchema.pre('save' , function(next){
    if(!this.isModified('password') || this.isNew) return next();

    //! bazen token yayınlanması password olusturmadan once gerceklesiyor bu durumda hata almamak icin 1000ms bir margin koyduk.
    this.passwordChangedAt = Date.now() - 1000;
    next();
})

//! user bilgilerini alıp database save etmeden once bu middleware'i calıstırıp passwordu encrypt ederiz.
userSchema.pre('save', async function(next){
    //Only run this function if password was actually modified
    if(!this.isModified('password')){
        return next();
    }

    //? Hash or Hashing => means that Encryption,  we will do hashing with "bcrypt" algorithm. In order to use this algorithm, we should import bcrypt.js package. 
    this.password = await bcrypt.hash(this.password, 12) //! 12 (cost number) sayısı arttıkca CPU intensive olur daha guclu password olur ama hashing zamanı da artar.
    //* hash() fonksiyonu promise doner.

    // Delete passwordConfirm field
    this.passwordConfirm = undefined; //! kullanıcı DB'ye kaydolurken confirm verisini sildik sadece ilk giriste kontrol etsin DB'ye eklemesin istedik.

    next();
})

//! instance method tüm collection'da gecerli olur
userSchema.methods.correctPassword = async function(candidatePassword, userPassword){
    return await bcrypt.compare(candidatePassword, userPassword) // boolean deger doner
}

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    //* this --> current document (user model ile olusturulan current user)
    if(this.passwordChangedAt){
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000 , 10); //! 10 -> base number
        return JWTTimestamp < changedTimestamp;
    }
    // NOT CHANGED
    return false;
}

userSchema.methods.createPasswordResetToken = function(){
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //! 10 minutes

    return resetToken;
}

const User = mongoose.model('User' , userSchema)

module.exports = User;