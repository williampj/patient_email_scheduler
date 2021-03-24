const fs = require('fs');
const parse = require('csv-parse');

const parseCSV = (filePath) => new Promise((resolve, reject) => {
  const entries = [];

  const parser = parse({ columns: true, separator: '|' }, (err, records) => {
    if (err) reject(err);
    // Converts each CSV patient record into a patient object
    // All patient objects are stored in an entries array and returned
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

  fs.createReadStream(filePath)
    .pipe(parser)
    .on('end', () => resolve(entries));
});

module.exports = parseCSV;
