import Database from "better-sqlite3";
const db = new Database("./.data/dev.sqlite");
const people = db.prepare("SELECT id, givenName, gender, deletedAt FROM persons WHERE treeId=1").all();
const rels = db.prepare("SELECT * FROM relationships WHERE treeId=1").all();
console.log("ACTIVE PEOPLE:", people.filter((p) => !p.deletedAt));
console.log("RELS:", rels);
