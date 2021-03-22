const { MongoClient } = require('mongodb');
const nodeSchedule = require('node-schedule');
const nodemailer = require('nodemailer');

class EmailScheduler {
  constructor({ url, dbName, collectionName }) {
    this.url = url;
    this.dbName = dbName;
    this.collectionName = collectionName;
  }

  scheduleEmails() {
    const getPatientsWithEmailConsent = (db) => new Promise((resolve, reject) => {
      const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
      try {
        const consentingPatients = db.collection(this.collectionName)
          .find({ CONSENT: 'Y', 'Email Address': { $regex: EMAIL_REGEX } });
        resolve(consentingPatients.toArray());
      } catch (e) {
        reject(e);
      }
    });

    const buildEmailObjects = (patients) => new Promise((resolve, reject) => {
      const MS_PER_DAY = 24 * 60 * 60 * 1000;
      const individualSchedule = () => {
        const dateNow = Date.now();
        const scheduledEmails = [
          { Name: 'Day 1', scheduled_date: dateNow + MS_PER_DAY },
          { Name: 'Day 2', scheduled_date: dateNow + MS_PER_DAY * 2 },
          { Name: 'Day 3', scheduled_date: dateNow + MS_PER_DAY * 3 },
          { Name: 'Day 4', scheduled_date: dateNow + MS_PER_DAY * 4 },
        ];
        return scheduledEmails;
      };

      const emailObjects = [];
      try {
        patients.forEach((patient) => {
          individualSchedule().forEach((scheduledEmail) => {
            const emailWithAddress = Object.assign(scheduledEmail, { 'Email Address': patient['Email Address'] });
            emailObjects.push(emailWithAddress);
          });
        });
        resolve(emailObjects);
      } catch (e) {
        reject(e);
      }
    });

    const scheduleJobs = async (emailObjects) => new Promise((resolve, reject) => {
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
        resolve(emailObjects);
      } catch (e) {
        reject(e);
      }
    });

    const schedule = async () => {
      let client;
      try {
        client = await MongoClient.connect(this.url, { useUnifiedTopology: true });
        const db = client.db(this.dbName);
        const patients = await getPatientsWithEmailConsent(db);
        let emails = await buildEmailObjects(patients);
        emails = await scheduleJobs(emails);
        const result = await db.collection('Emails').insertMany(emails);
        console.log(`${result.insertedCount} emails were inserted in the Emails collection`);
      } catch (e) {
        console.log(e);
      } finally {
        await client.close();
      }
    };

    schedule();
  }
}

module.exports = EmailScheduler;
