const Database = require("better-sqlite3");

const db = new Database("./quiz.db");

console.log("ROOMS:");
console.table(db.prepare("SELECT * FROM rooms").all());

db.close();