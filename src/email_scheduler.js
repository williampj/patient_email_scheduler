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
    const getPatientsWithEmailConsent = async (db) => new Promise((resolve, reject) => {
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

    const scheduleJobs = (emailObjects) => new Promise((resolve, reject) => {
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

    // loadEmailJobsInDatabase(emailObjects) {

    // }
    // § Name: “Day 1”, scheduled_date: NOW+1 day
    // § Name: “Day 2”, scheduled_date: NOW+2 days
    // § Name: “Day 3”, scheduled_date: NOW+3 days
    // § Name: “Day 4”, scheduled_date: NOW+4 days

    const schedule = async () => {
      let client;
      try {
        client = await MongoClient.connect(this.url, { useUnifiedTopology: true });
        const db = client.db(this.dbName);
        const patients = await getPatientsWithEmailConsent(db);
        const emails = await buildEmailObjects(patients);
        await scheduleJobs(emails);

        // const result = await Promise.all(emails.map(
        //   (email) => {
        //     console.log(email);
        //     return db.collection('Emails').insertOne(email);
        //   },
        // ));
        // await db.collection('Emails').createIndex({ scheduled_date: 1 }, { unique: true });
        const result = await db.collection('Emails').insertMany(emails);
        // emails.
        // console.log(`${result.toArray().length} emails were inserted in the Emails collection`);
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

// const url = 'mongodb://localhost:27017/';
// const dbName = 'patientsDatabase';
// const collectionName = 'Patients';

// new EmailScheduler({ url, dbName, collectionName }).scheduleEmails();

module.exports = EmailScheduler;
