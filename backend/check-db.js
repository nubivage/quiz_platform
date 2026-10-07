const Database = require("better-sqlite3");

const db = new Database("./quiz.db");

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
  .all();

console.log("Tables in quiz.db:");
console.log(tables);

db.close();