const fs = require('fs');
const parse = require('csv-parse');
const { MongoClient } = require('mongodb');

// Default port for locally hosted MongoDB
const url = 'mongodb://localhost:27017/';
const patientsFile = '../public/patients.csv';

function parseCSV() {
  return new Promise((resolve, reject) => {
    const patients = [];

    const parser = parse({ columns: true, separator: '|' }, (err, records) => {
      if (err) reject(err);
      records.forEach((record) => {
        const re = /\|/;
        const columnHeaders = Object.keys(record)[0].split(re);
        const values = Object.values(record)[0].split(re);
        const patient = {};
        columnHeaders.forEach((columnHeader, index) => {
          patient[columnHeader] = values[index];
        });
        patients.push(patient);
      });
    });

    fs.createReadStream(patientsFile)
      .pipe(parser)
      .on('end', () => resolve(patients));
  });
}

async function main() {
  let client;
  try {
    client = await MongoClient.connect(url, { useUnifiedTopology: true });
    const patientsDatabase = client.db('patientsDatabase');
    const patients = await parseCSV();
    await Promise.all(patients.map((patient) => patientsDatabase.collection('patients').insertOne(patient)));
  } catch (e) {
    console.log(e);
  } finally {
    client.close();
  }
}

main();
