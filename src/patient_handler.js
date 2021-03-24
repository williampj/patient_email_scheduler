const { MongoClient } = require('mongodb');
const parseCSV = require('../utils/csv_parser');

class PatientHandler {
  constructor({
    url, filePath, dbName, collectionName,
  }) {
    this.url = url;
    this.filePath = filePath;
    this.dbName = dbName;
    this.collectionName = collectionName;
  }

  async loadDatabase() {
    let connection;
    try {
      connection = await MongoClient.connect(this.url, { useUnifiedTopology: true });
      const db = connection.db(this.dbName);
      // entries is an array of patient objects
      const entries = await parseCSV(this.filePath);
      // Inserts the patient objects into a Patients collection and
      // stores the result of the operation
      const result = await db.collection(this.collectionName)
        .insertMany(entries);
      if (process.env.NODE_ENV !== 'test') {
        // This log statement is for the user and not relevant in the testing environment
        console.log(`${result.insertedCount} patient entries were inserted in the Patients collection`);
      }
    } catch (e) {
      console.log(e);
    } finally {
      await connection.close();
    }
  }
}

module.exports = PatientHandler;
