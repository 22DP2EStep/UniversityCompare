const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'university_compare.db');

let db;

function save() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function init() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`PRAGMA foreign_keys = ON;`);

  db.run(`
    CREATE TABLE IF NOT EXISTS universities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      country TEXT NOT NULL,
      website TEXT,
      description TEXT,
      ranking INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      university_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      degree TEXT NOT NULL,
      duration_years REAL NOT NULL,
      tuition_per_year REAL,
      language TEXT DEFAULT 'English',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
    );
  `);

  // Seed sample data if empty
  const [{ values }] = db.exec('SELECT COUNT(*) as count FROM universities');
  if (values[0][0] === 0) {
    const insUni = (name, location, country, website, description, ranking) => {
      db.run(
        'INSERT INTO universities (name, location, country, website, description, ranking) VALUES (?,?,?,?,?,?)',
        [name, location, country, website, description, ranking]
      );
      return db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    };
    const insProg = (uniId, name, degree, duration_years, tuition_per_year, language) => {
      db.run(
        'INSERT INTO programs (university_id, name, degree, duration_years, tuition_per_year, language) VALUES (?,?,?,?,?,?)',
        [uniId, name, degree, duration_years, tuition_per_year, language]
      );
    };

    const u1 = insUni('MIT', 'Cambridge, MA', 'USA', 'https://mit.edu', 'Massachusetts Institute of Technology', 1);
    const u2 = insUni('University of Oxford', 'Oxford', 'UK', 'https://ox.ac.uk', 'One of the oldest universities in the world', 2);
    const u3 = insUni('ETH Zurich', 'Zurich', 'Switzerland', 'https://ethz.ch', 'Swiss Federal Institute of Technology', 7);

    insProg(u1, 'Computer Science', 'BSc', 4, 57590, 'English');
    insProg(u1, 'Electrical Engineering', 'BSc', 4, 57590, 'English');
    insProg(u2, 'Computer Science', 'BA', 3, 9250, 'English');
    insProg(u2, 'Mathematics', 'BA', 3, 9250, 'English');
    insProg(u3, 'Computer Science', 'BSc', 3, 1460, 'German/English');

    save();
  }

  return db;
}

// Helpers that mirror better-sqlite3 API for ease of use

function rowsFromExec(stmt) {
  const results = db.exec(stmt);
  if (!results.length) return [];
  const { columns, values } = results[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function preparedAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function preparedGet(sql, params = []) {
  return preparedAll(sql, params)[0] || null;
}

function preparedRun(sql, params = []) {
  db.run(sql, params);
  const lastId = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0];
  const changes = db.exec('SELECT changes() as c')[0]?.values[0][0];
  save();
  return { lastInsertRowid: lastId, changes };
}

module.exports = { init, preparedAll, preparedGet, preparedRun, save };
