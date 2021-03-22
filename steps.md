# Testing file

## Project setup

1. Created the package.json file

`npm init`

![npm init](./public/screenshots/npm_init.png)

2. Created a private repo for version control

`git init`

3. Set up eslint for style enforcement

`npm install eslint --save-dev`
`npx eslint --init`

![eslint setup](./public/screenshots/eslint_setup.png)

4. Added `.gitignore` and `eslintignore` files and set them to ignore `node_modules`

5. Added all files and pushed the first commit to the private repo on github

6. Installed mongodb  
   ` npm install mongodb --save`

7. Installed csv-parse
   There are many CSV parsing tools, but I found `csv-parse` to be the simplest tool that nonetheless satisfies my user requirements.
   ` npm install csv-parse --save`

## Reading the csv file and inserting patient entries into a patients collection in a MongoDB database

8. Parsing the CSV file
   The first step was to read parse the CSV file and convert each line into a object for the database.

```js
const fs = require('fs');
const parse = require('csv-parse');
const url = 'mongodb://localhost:27017/';
const patientsFile = '../public/patients.csv';

const patients = [];

const parser = parse(
  { columns: true, separator: '|' },
  (err, records) => {
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
  }
);

fs.createReadStream(patientsFile).pipe(parser);
```

One of the advantages of the `csv-parse` tool is that it accepts a settings object whereby the `separator` argument (set to `,` by default) can be set to `|` since pipes are used instead of commas in the CSV data. Since each record in the records consists of a key-value pair where the key are pipe-separated heading and the value are pipe-separated values, I used some logic to convert each record into an object and push it into a `patients` array.
The problem with the current code is that code execution will continue past this snippet before the CSV file are piped to the parser and pushed to the `patients` array.

9. Promisifying the parsing of the CSV file and inserting into database
   Using promises and `async-await` syntax, I was able to resolve the `patients` so that I had all patients in the correct format for database insertion.

```js
const fs = require('fs');
const parse = require('csv-parse');
const { MongoClient } = require('mongodb');

// Default port for locally hosted MongoDB
const url = 'mongodb://localhost:27017/';
const patientsFile = '../public/patients.csv';

function parseCSV() {
  return new Promise((resolve, reject) => {
    const patients = [];

    const parser = parse(
      { columns: true, separator: '|' },
      (err, records) => {
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
      }
    );

    fs.createReadStream(patientsFile)
      .pipe(parser)
      .on('end', () => resolve(patients));
  });
}

async function main() {
  let client;
  try {
    client = await MongoClient.connect(url, {
      useUnifiedTopology: true
    });
    // Create patientsDatabase
    const patientsDatabase = client.db('patientsDatabase');
    // Awaits until all patients entries are parsed before proceeding with the database logic
    const patients = await parseCSV();
    // Each mongoDB insertion returns a promise that resolves to its result object, so the following line waits for all promises (insertions) to resolve before proceeding to close the database
    await Promise.all(
      patients.map((patient) =>
        patientsDatabase.collection('patients').insertOne(patient)
      )
    );
  } catch (e) {
    console.log(e);
  } finally {
    client.close();
  }
}

main();
```

10. Refactoring the functionality so far into a class in order to encapsulate the logic and to ease unit testing. It could also be reused now with a different database path, file path, database name and collection name. I keep the separator hardcoded to a pip `|` though this could be made dynamic as well.

```js
class DatabaseLoader {
  constructor({ url, filePath, dbName, collectionName }) {
    this.url = url;
    this.filePath = filePath;
    this.dbName = dbName;
    this.collectionName = collectionName;
  }

  loadDatabase() {
    const loader = async () => {
      let client;
      try {
        client = await MongoClient.connect(this.url, {
          useUnifiedTopology: true
        });
        const db = client.db(this.dbName);
        const entries = await this.parseCSV();
        await Promise.all(
          entries.map((entry) =>
            db.collection(this.collectionName).insertOne(entry)
          )
        );
      } catch (e) {
        console.log(e);
      } finally {
        client.close();
      }
    };
    loader();
  }

  parseCSV() {
    return new Promise((resolve, reject) => {
      const entries = [];

      const parser = parse(
        { columns: true, separator: '|' },
        (err, records) => {
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
        }
      );

      fs.createReadStream(this.filePath)
        .pipe(parser)
        .on('end', () => resolve(entries));
    });
  }
}
```

11. install `node-schedule` and `nodemailer` to schedule emails

12.
