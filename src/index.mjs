import EmailHandler from './email_handler.js';
import PatientHandler from './patient_handler.js';

// Default port for locally hosted MongoDB
const url = 'mongodb://localhost:27017/';
const filePath = 'public/patients.csv';
// Name for the database in development and production
const dbName = 'patientsDatabase';
const collectionName = 'Patients';

async function main() {
  // Load all patients into the Patients collection
  // Chaining the synchronous EmailHandler and EmailHandler constructors
  // with the loadDatabase buildEmails method ensures that a promise is returned
  await (new PatientHandler({
    url, filePath, dbName, collectionName,
  }).loadDatabase());
  await (new EmailHandler({ url, dbName, collectionName }).buildEmails());
  // }
}

main().catch(console.dir);
