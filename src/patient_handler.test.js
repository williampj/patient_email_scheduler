const { MongoClient } = require('mongodb');
const PatientHandler = require('./patient_handler');
const parseCSV = require('../utils/csv_parser');

const url = 'mongodb://localhost:27017/';
const filePath = 'public/patients.csv';
const dbName = 'patientsDatabaseTest';
const collectionName = 'Patients';

describe('patient handler', () => {
  let connection;
  let db;

  beforeAll(async () => {
    await new PatientHandler({
      url, filePath, dbName, collectionName,
    }).loadDatabase();

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

  it('Verifies that the data in the flat file matches data in Patients collection', async () => {
    const patientsFromCSV = await parseCSV(filePath); // .map((patient) => patient['Card Number']);
    // const patientsFromDB = patientCollection.find({}).toArray();
    const patientsFromDB = await db.collection('Patients').find({}).toArray();

    const memberIDsFromCSV = {};
    patientsFromCSV.forEach((patient) => {
      memberIDsFromCSV[patient['Member ID']] = true;
    });
    const memberIDsFromDB = patientsFromDB.map((patient) => patient['Member ID']);

    // Equal number of patients in the CSV file and Patients database collection
    expect(patientsFromCSV.length).toEqual(patientsFromDB.length);
    // Card number of every entry in the Patients database collection maps to a card number of a patient in the CSV file
    expect(memberIDsFromDB.every((memberID) => memberIDsFromCSV[memberID])).toEqual(true);
  });

  it('prints out all Patient IDs where the first name is missing', async () => {
    const patientsWithoutFirstName = await db.collection('Patients').find({ 'First Name': '' }).toArray();
    const memberIDsOfPatientsWithoutFirstName = await Promise.resolve(patientsWithoutFirstName.map((patient) => patient['Member ID']));

    console.log(`The Member IDs of the following members are without first name: ${memberIDsOfPatientsWithoutFirstName.join(', ')}`);

    // There should be exactly two patient without a first name
    expect(patientsWithoutFirstName.length).toEqual(2);
  });

  it('Print out all Patient IDs where the email address is missing, but consent is Y', async () => {
    const emailConsentingPatientsWithMissingEmailAddress = await db.collection('Patients').find({ CONSENT: 'Y', 'Email Address': '' }).toArray();

    console.log(`The member ID of the following member is consenting to emails but has not disclosed an email address: ${emailConsentingPatientsWithMissingEmailAddress[0]['Member ID']}`);

    // There should be exactly one patient consenting to emails but with a missing email address
    expect(emailConsentingPatientsWithMissingEmailAddress.length).toEqual(1);
  });
});

// test('instantiated database loader', () => {
//   expect(dbl.url).toBe(url);
// });
