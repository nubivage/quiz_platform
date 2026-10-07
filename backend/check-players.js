const Database = require("better-sqlite3");

const db = new Database("./quiz.db");

console.log("PLAYERS:");
console.table(db.prepare("SELECT * FROM players").all());

db.close();