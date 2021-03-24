const nodeSchedule = require('node-schedule');
const nodemailer = require('nodemailer');

const scheduleEmails = (emailObjects) => new Promise((resolve, reject) => {
  // e-mail transport configuration
  const transporter = nodemailer.createTransport({
    host: 'smtp.humancare.com',
    port: 465,
    secure: true,
    pool: true,
    auth: {
      user: 'user',
      pass: 'secret',
    },
  });
    // e-mail message options. Add 'to' field for each email
  const mailOptions = {
    from: 'humancare@humancaresystems.com',
    subject: 'Follow up from Human Care Systems',
    text: 'Remember to take your medicine',
  };

  try {
    emailObjects.forEach((email) => {
      const date = new Date(email.scheduled_date);
      const individualMailOptions = { ...mailOptions, to: email['Email Address'] };
      nodeSchedule.scheduleJob(date, () => {
        transporter.sendMail(individualMailOptions, (error, info) => {
          if (error) {
            console.log(error);
          } else {
            console.log(`${email.Name} email sent to ${email['Email Address']}: ${info.response}`);
          }
        });
      });
    });
    resolve();
  } catch (e) {
    reject(e);
  }
});

module.exports = scheduleEmails;
