const { MongoClient } = require('mongodb');

const url = 'mongodb://localhost:27017/';
const dbName = 'patientsDatabase';

const resetDatabase = async () => {
  try {
    const connection = await MongoClient.connect(url, { useUnifiedTopology: true });
    const db = await connection.db(dbName);
    await db.dropDatabase();
    await connection.close();
    console.log(`${dbName} has been cleared`);
  } catch (e) {
    console.log(e);
  }
};

resetDatabase();
