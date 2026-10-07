const Database = require("better-sqlite3");

const db = new Database("./quiz.db");

console.log("RESULTS:");
console.table(db.prepare("SELECT * FROM results").all());

db.close();