const fs = require('fs');
const parse = require('csv-parse');
const { MongoClient } = require('mongodb');

class DatabaseLoader {
  constructor({
    url, filePath, dbName, collectionName,
  }) {
    this.url = url;
    this.filePath = filePath;
    this.dbName = dbName;
    this.collectionName = collectionName;
  }

  loadDatabase() {
    // return new Promise(resolve, reject) {

    const parseCSV = () => new Promise((resolve, reject) => {
      const entries = [];

      const parser = parse({ columns: true, separator: '|' }, (err, records) => {
        if (err) reject(err);

        records.forEach((record) => {
          const re = /\|/;
          const columnHeaders = Object.keys(record)[0].split(re);
          const values = Object.values(record)[0].split(re);
          const entry = {};
          columnHeaders.forEach((columnHeader, index) => {
            entry[columnHeader] = values[index];
          });
          entries.push(entry);
        });
      });

      fs.createReadStream(this.filePath)
        .pipe(parser)
        .on('end', () => resolve(entries));
    });

    const loader = async () => {
      let client;
      try {
        client = await MongoClient.connect(this.url, { useUnifiedTopology: true });
        const db = client.db(this.dbName);
        const entries = await parseCSV();
        const result = await db.collection(this.collectionName)
          .insertMany(entries);
        console.log(`${result.insertedCount} patient entries were inserted in the Patients collection`);
      } catch (e) {
        console.log(e);
      } finally {
        await client.close();
      }
    };
    loader();
  }
}

module.exports = DatabaseLoader;
// const url = 'mongodb://localhost:27017/';
// const filePath = '../public/patients.csv';
// const dbName = 'patientsDatabase';
// const collectionName = 'patients';

// async function main() {
//   await new DatabaseLoader({
//     url, filePath, dbName, collectionName,
//   }).loadDatabase();
// }

// main();
