const { MongoClient } = require('mongodb');
const PatientHandler = require('./patient_handler');
const EmailHandler = require('./email_handler');

const url = 'mongodb://localhost:27017/';
const filePath = 'public/patients.csv';
const dbName = 'patientsDatabaseTest';
const collectionName = 'Patients';

describe('email handler', () => {
  let connection;
  let db;

  beforeAll(async () => {
    await new PatientHandler({
      url, filePath, dbName, collectionName,
    }).loadDatabase();

    await (new EmailHandler({ url, dbName, collectionName }).buildEmails());

    connection = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    db = await connection.db(dbName);
  });

  afterAll(async () => {
    await db.dropDatabase();
    await connection.close();
    // await db.close();
  });

  it('Verifies that four emails were created in Emails Collection for patients who have CONSENT as Y and a listed Email Address', async () => {
    const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    const reduceEmailsToMemberIDAndEmailCount = (collection, email) => {
      collection[email['Email Address']] = collection[email['Email Address']] || 0;
      collection[email['Email Address']] += 1;
      return collection;
    };
    const createdEmails = await db.collection('Emails').find({}).toArray();
    const emailCounts = createdEmails.reduce(reduceEmailsToMemberIDAndEmailCount, {});

    const emailConsentingPatientsFromDB = await db.collection('Patients').find({ CONSENT: 'Y', 'Email Address': EMAIL_REGEX }).toArray();

    // Test that every Email consenting patient with an email address
    // has four emails scheduled in the Emails database collection
    expect(emailConsentingPatientsFromDB.every((patient) => emailCounts[patient['Email Address']] === 4)).toEqual(true);
  });

  it('Verifies that emails for each patient are scheduled correctly', async () => {
    const reduceEmailsToEmailAddressAndScheduledTimes = (collection, email) => {
      collection[email['Email Address']] = collection[email['Email Address']] || {};
      collection[email['Email Address']][email.Name] = email.scheduled_date;
      return collection;
    };

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const createdEmails = await db.collection('Emails').find({}).toArray();
    const emailSchedules = createdEmails.reduce(reduceEmailsToEmailAddressAndScheduledTimes, {});
    const emailAddresses = Object.keys(emailSchedules);

    // Verifies that there is exactly 24 hours between each scheduled email
    const verifyEmailIntervals = (emailAddress) => (emailSchedules[emailAddress]['Day 2'] - emailSchedules[emailAddress]['Day 1'] === MS_PER_DAY
      && emailSchedules[emailAddress]['Day 3'] - emailSchedules[emailAddress]['Day 2'] === MS_PER_DAY
      && emailSchedules[emailAddress]['Day 4'] - emailSchedules[emailAddress]['Day 3'] === MS_PER_DAY);

    // Tests that the scheduled interval between the four emails for each patient is 24 hours
    expect(emailAddresses.every((emailAddress) => verifyEmailIntervals(emailAddress))).toEqual(true);
  });
});
