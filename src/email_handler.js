const { MongoClient } = require('mongodb');
const scheduleEmails = require('../utils/email_scheduler');

class EmailHandler {
  constructor({ url, dbName, collectionName }) {
    this.url = url;
    this.dbName = dbName;
    this.collectionName = collectionName;
  }

  async buildEmails() {
    // This function resolves to an array of patient objects that have valid email addresses
    // and consent to receiving emails
    const getPatientsWithEmailConsent = async (db) => {
      const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
      try {
        const consentingPatients = await db.collection(this.collectionName)
          .find({ CONSENT: 'Y', 'Email Address': { $regex: EMAIL_REGEX } });
        return consentingPatients.toArray();
      } catch (e) {
        console.log(e);
      }
    };

    // Builds and resolves four email objects for each patient object passed to the function
    const buildEmailObjects = (patients) => {
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
      patients.forEach((patient) => {
        individualSchedule().forEach((scheduledEmail) => {
          // Attaches email address to each email
          const emailWithAddress = Object.assign(scheduledEmail, { 'Email Address': patient['Email Address'] });
          emailObjects.push(emailWithAddress);
        });
      });
      return emailObjects;
    };

    let connection;
    try {
      connection = await MongoClient.connect(
        this.url, { useUnifiedTopology: true },
      );
      const db = connection.db(this.dbName);
      const patients = await getPatientsWithEmailConsent(db);
      const emails = await buildEmailObjects(patients);
      // Implements the scheduling and sending of emails
      await scheduleEmails(emails);
      // Inserts all email objects into an Emails collection in the patientsDatabase
      const result = await db.collection('Emails').insertMany(emails);
      if (process.env.NODE_ENV !== 'test') {
        // This is a message for the user and not relevant in a testing environment
        console.log(`${result.insertedCount} emails were inserted in the Emails collection`);
      }
    } catch (e) {
      console.log(e);
    } finally {
      await connection.close();
      // this line is to ensure that the process completes with a success exit code 0
      // after closing the database connection.
      process.exit(0);
    }
  }
}

module.exports = EmailHandler;
