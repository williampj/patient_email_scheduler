import EmailScheduler from './email_scheduler.js';
import DatabaseLoader from './database_loader.js';

// Default port for locally hosted MongoDB
const url = 'mongodb://localhost:27017/';
const filePath = '../public/patients.csv';
const dbName = 'patientsDatabase';
const collectionName = 'Patients';

async function main() {
  try {
    // Load all patients into the Patients collection
    await new DatabaseLoader({
      url, filePath, dbName, collectionName,
    })
      .loadDatabase();
    // Slight timeout ensures all patients are loaded before querying them for email preferences
    setTimeout(() => {
      new EmailScheduler({ url, dbName, collectionName }).scheduleEmails();
    }, 100);
  } catch (e) {
    console.log(e);
  }
}

// main();
main().catch(console.dir);
