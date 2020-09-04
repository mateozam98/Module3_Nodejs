const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'ila.moen@ethereal.email',
        pass: '3DWVs5g97k9eXAxqMh'
    }
});

module.exports = transporter;

/* const mailConfig = {
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'ila.moen@ethereal.email',
        pass: '3DWVs5g97k9eXAxqMh'
    }
};

module.exports = nodemailer.createTransport(mailConfig); */


