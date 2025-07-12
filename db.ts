import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('carburant.db');

export default db;
