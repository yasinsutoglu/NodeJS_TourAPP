const nodemailer = require('nodemailer');
const pug = require('pug');
const {convert} = require('html-to-text')


module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName=user.name.split(' ')[0];
    this.url=url;
    this.from = `Jason Maxwell <${process.env.EMAIL_FROM}>`;
  }

  newTransport(){
    if (process.env.NODE_ENV === 'production') {
      //SendGrid
      return 1;
    }

    // 1)create a transporter
    return nodemailer.createTransport({
      // service : 'Gmail', }, // Activate in gmail 'less secure app' option
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  //Send the actual email
  async send(template,subject){
    //1) Render HTML based on a pug template
    //res.render('') //!render() fonksiyonu pug template'i HTML'e cevirip client'a gonderir
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
        firstName: this.firstName,
        url:this.url,
        subject
    })

    //2)Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html: html,
      text: convert(html),
    };

    //3) create a transport and send email    
     await this.newTransport().sendMail(mailOptions)
  }

  async sendWelcome(){
   await this.send('welcome', 'Welcome to the JasonTour Family!')
  }
};
