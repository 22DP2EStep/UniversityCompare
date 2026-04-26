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

  // Migrations
  try { db.run('ALTER TABLE universities ADD COLUMN ranking_world INTEGER'); } catch (_) {}
  try { db.run('ALTER TABLE universities ADD COLUMN image_url TEXT'); } catch (_) {}
  db.run("UPDATE programs SET degree = 'Bakalaura grāds' WHERE degree IN ('Bakalaura grāds','BSc','BA','BEng','LLB')");
  db.run("UPDATE programs SET degree = 'Maģistra grāds'  WHERE degree IN ('Maģistrs','MSc','MA','MBA','MEng','LLM')");
  db.run("UPDATE programs SET degree = 'Doktora grāds'   WHERE degree IN ('Doktora grāds','MD','DDS','PhD')");

  // Add master's programs if none exist yet
  const masterCount = db.exec("SELECT COUNT(*) as c FROM programs WHERE degree = 'Maģistra grāds'")[0]?.values[0][0];
  if (masterCount === 0) {
    const addMaster = (uniName, name, tuition, lang = 'Latviešu') => {
      const uni = db.exec(`SELECT id FROM universities WHERE name = '${uniName}'`)[0];
      if (!uni) return;
      const id = uni.values[0][0];
      db.run("INSERT INTO programs (university_id, name, degree, duration_years, tuition_per_year, language) VALUES (?,?,?,?,?,?)",
        [id, name, 'Maģistra grāds', 2, tuition, lang]);
    };
    addMaster('Latvijas Universitāte', 'Datorzinātne', 2400);
    addMaster('Latvijas Universitāte', 'Tiesību zinātne', 2200);
    addMaster('Latvijas Universitāte', 'Ekonomika', 2200);
    addMaster('Rīgas Tehniskā universitāte', 'Datorzinātne un informācijas tehnoloģijas', 2600);
    addMaster('Rīgas Tehniskā universitāte', 'Elektrotehnika', 2400);
    addMaster('Rīgas Tehniskā universitāte', 'Arhitektūra', 2400);
    addMaster('Rīgas Stradiņa universitāte', 'Sabiedrības veselība', 3000, 'Latviešu/Angļu');
    addMaster('Rīgas Stradiņa universitāte', 'Farmācija', 3200);
    addMaster('Latvijas Biozinātņu un tehnoloģiju universitāte', 'Lauksaimniecība', 1800);
    addMaster('Latvijas Biozinātņu un tehnoloģiju universitāte', 'Vides zinātne', 1900);
    addMaster('Daugavpils Universitāte', 'Pedagoģija', 1600);
    addMaster('Vidzemes Augstskola', 'Informācijas tehnoloģijas', 1800);
    addMaster('RISEBA Biznesa, mākslas un tehnoloģiju augstskola', 'Biznesa administrācija', 3600, 'Latviešu/Angļu');
    addMaster('Banku augstskola', 'Finanšu vadība', 3000);
    addMaster('SSE Rīga (Rīgas Juridiskā augstskola)', 'Ekonomika', 9500, 'Angļu');
    addMaster('Biznesa augstskola Turība', 'Biznesa vadība', 2800);
    save();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS universities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'Latvija',
      website TEXT,
      description TEXT,
      ranking INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      expert_university_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (expert_university_id) REFERENCES universities(id) ON DELETE SET NULL
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
      language TEXT DEFAULT 'Latviešu',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
    );
  `);

  // Seed Latvian universities if empty
  const [{ values }] = db.exec('SELECT COUNT(*) as count FROM universities');
  if (values[0][0] === 0) {
    const ins = (name, location, website, description, ranking) => {
      db.run(
        'INSERT INTO universities (name, location, country, website, description, ranking) VALUES (?,?,?,?,?,?)',
        [name, location, 'Latvija', website, description, ranking]
      );
      return db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    };
    const prog = (uniId, name, degree, years, tuition, lang = 'Latviešu') => {
      db.run(
        'INSERT INTO programs (university_id, name, degree, duration_years, tuition_per_year, language) VALUES (?,?,?,?,?,?)',
        [uniId, name, degree, years, tuition || null, lang]
      );
    };

    const lu = ins(
      'Latvijas Universitāte',
      'Rīga',
      'https://www.lu.lv',
      'Latvijas lielākā un vecākā augstskola, dibināta 1919. gadā. Piedāvā plašu studiju programmu klāstu dabaszinātnēs, humanitārajās zinātnēs, sociālajās zinātnēs un medicīnā.',
      1
    );
    prog(lu, 'Datorzinātne', 'Bakalaura grāds', 3, 2200);
    prog(lu, 'Tiesību zinātne', 'Bakalaura grāds', 4, 2000);
    prog(lu, 'Ekonomika', 'Bakalaura grāds', 3, 2000);
    prog(lu, 'Medicīna', 'Doktora grāds', 6, 4000);
    prog(lu, 'Fizikas', 'Bakalaura grāds', 3, 1800);
    prog(lu, 'Datorzinātne', 'Maģistra grāds', 2, 2400);
    prog(lu, 'Tiesību zinātne', 'Maģistra grāds', 2, 2200);
    prog(lu, 'Ekonomika', 'Maģistra grāds', 2, 2200);

    const rtu = ins(
      'Rīgas Tehniskā universitāte',
      'Rīga',
      'https://www.rtu.lv',
      'Vadošā tehniskā augstskola Baltijā, dibināta 1862. gadā. Specializējas inženierzinātnēs, tehnoloģijās un arhitektūrā.',
      2
    );
    prog(rtu, 'Datorzinātne un informācijas tehnoloģijas', 'Bakalaura grāds', 4, 2400);
    prog(rtu, 'Elektrotehnika', 'Bakalaura grāds', 4, 2200);
    prog(rtu, 'Arhitektūra', 'Bakalaura grāds', 4, 2200);
    prog(rtu, 'Materiālzinātne', 'Bakalaura grāds', 4, 2000);
    prog(rtu, 'Ķīmijas tehnoloģija', 'Bakalaura grāds', 4, 2000);

    const rsu = ins(
      'Rīgas Stradiņa universitāte',
      'Rīga',
      'https://www.rsu.lv',
      'Vadošā medicīnas un veselības zinātņu universitāte Latvijā. Piedāvā studijas medicīnā, zobārstniecībā, farmācijā un sociālajās zinātnēs.',
      3
    );
    prog(rsu, 'Medicīna', 'Doktora grāds', 6, 8000, 'Latviešu/Angļu');
    prog(rsu, 'Zobārstniecība', 'Doktora grāds', 5, 7000, 'Latviešu/Angļu');
    prog(rsu, 'Farmācija', 'Bakalaura grāds', 4, 3000);
    prog(rsu, 'Sabiedrības veselība', 'Bakalaura grāds', 3, 2500);

    const lbtu = ins(
      'Latvijas Biozinātņu un tehnoloģiju universitāte',
      'Jelgava',
      'https://www.lbtu.lv',
      'Agrāk zināma kā Latvijas Lauksaimniecības universitāte. Specializējas lauksaimniecībā, pārtikas zinātnē, mežsaimniecībā un vides zinātnēs.',
      4
    );
    prog(lbtu, 'Lauksaimniecība', 'Bakalaura grāds', 4, 1600);
    prog(lbtu, 'Pārtikas zinātne un tehnoloģija', 'Bakalaura grāds', 4, 1800);
    prog(lbtu, 'Mežzinātne', 'Bakalaura grāds', 4, 1600);
    prog(lbtu, 'Vides zinātne', 'Bakalaura grāds', 4, 1700);

    const du = ins(
      'Daugavpils Universitāte',
      'Daugavpils',
      'https://www.du.lv',
      'Reģionālā universitāte Austrumlatvijā, kas piedāvā studijas humanitārajās, sociālajās un dabaszinātnēs. Daudzvalodu vide — latviešu un krievu mācībvaloda.',
      5
    );
    prog(du, 'Pedagoģija', 'Bakalaura grāds', 4, 1400);
    prog(du, 'Angļu filoloģija', 'Bakalaura grāds', 3, 1400);
    prog(du, 'Bioloģija', 'Bakalaura grāds', 3, 1400);
    prog(du, 'Sociālais darbs', 'Bakalaura grāds', 3, 1300);

    const liepu = ins(
      'Liepājas Universitāte',
      'Liepāja',
      'https://www.liepu.lv',
      'Universitāte Latvijas rietumu piekrastē. Specializējas pedagoģijā, mūzikā, mākslā un humanitārajās zinātnēs.',
      6
    );
    prog(liepu, 'Pedagoģija', 'Bakalaura grāds', 4, 1400);
    prog(liepu, 'Mūzika', 'Bakalaura grāds', 4, 1500);
    prog(liepu, 'Sociālais darbs', 'Bakalaura grāds', 3, 1300);

    const via = ins(
      'Vidzemes Augstskola',
      'Valmiera',
      'https://www.va.lv',
      'Reģionālā augstskola Vidzemē. Specializējas komunikācijā, informācijas tehnoloģijās, tūrismā un uzņēmējdarbībā.',
      7
    );
    prog(via, 'Informācijas tehnoloģijas', 'Bakalaura grāds', 3, 1600);
    prog(via, 'Komunikācija', 'Bakalaura grāds', 3, 1500);
    prog(via, 'Tūrisma vadība', 'Bakalaura grāds', 3, 1500);

    const rta = ins(
      'Rēzeknes Tehnoloģiju akadēmija',
      'Rēzekne',
      'https://www.rta.lv',
      'Tehnoloģiju un mākslas akadēmija Latgalē. Piedāvā studijas inženierzinātnēs, pedagoģijā un mākslā.',
      8
    );
    prog(rta, 'Inženiermehānika', 'Bakalaura grāds', 4, 1400);
    prog(rta, 'Pedagoģija', 'Bakalaura grāds', 4, 1300);
    prog(rta, 'Dizains', 'Bakalaura grāds', 4, 1500);

    const lma = ins(
      'Latvijas Mākslas akadēmija',
      'Rīga',
      'https://www.lma.lv',
      'Latvijas vadošā vizuālās mākslas augstskola, dibināta 1919. gadā. Piedāvā studijas glezniecībā, grafikā, dizainā, skulptūrā un mākslas teorijā.',
      9
    );
    prog(lma, 'Glezniecība', 'Bakalaura grāds', 4, 1800);
    prog(lma, 'Grafiskais dizains', 'Bakalaura grāds', 4, 1800);
    prog(lma, 'Skulptūra', 'Bakalaura grāds', 4, 1800);

    const jvlma = ins(
      'Jāzepa Vītola Latvijas Mūzikas akadēmija',
      'Rīga',
      'https://www.jvlma.lv',
      'Latvijas valsts mūzikas augstskola, dibināta 1919. gadā. Augstas klases muzikālā izglītība vijolē, klavierēs, diriģēšanā, kompozīcijā un citās disciplīnās.',
      10
    );
    prog(jvlma, 'Klavierspēle', 'Bakalaura grāds', 4, 1700);
    prog(jvlma, 'Diriģēšana', 'Bakalaura grāds', 4, 1700);
    prog(jvlma, 'Kompozīcija', 'Bakalaura grāds', 4, 1700);

    const lspa = ins(
      'Latvijas Sporta pedagoģijas akadēmija',
      'Rīga',
      'https://www.lspa.lv',
      'Specializēta augstskola sporta zinātnē, fiziskajā audzināšanā un veselības izglītībā.',
      11
    );
    prog(lspa, 'Sports un fiziskā audzināšana', 'Bakalaura grāds', 4, 1500);
    prog(lspa, 'Sporta zinātne', 'Bakalaura grāds', 4, 1500);

    const riseba = ins(
      'RISEBA Biznesa, mākslas un tehnoloģiju augstskola',
      'Rīga',
      'https://www.riseba.lv',
      'Starptautiska privātā augstskola, kas piedāvā biznesa administrācijas, komunikācijas, arhitektūras un IT studijas angļu un latviešu valodā.',
      12
    );
    prog(riseba, 'Biznesa administrācija', 'Bakalaura grāds', 3, 3200, 'Latviešu/Angļu');
    prog(riseba, 'Komunikācija', 'Bakalaura grāds', 3, 3000, 'Latviešu/Angļu');
    prog(riseba, 'Arhitektūra', 'Bakalaura grāds', 4, 3400, 'Angļu');

    const ba = ins(
      'Banku augstskola',
      'Rīga',
      'https://www.ba.lv',
      'Specializēta finanšu un banku augstskola. Piedāvā studijas finanšu vadībā, grāmatvedībā un uzņēmējdarbības analīzē.',
      13
    );
    prog(ba, 'Finanšu vadība', 'Bakalaura grāds', 3, 2800);
    prog(ba, 'Grāmatvedība', 'Bakalaura grāds', 3, 2600);
    prog(ba, 'Uzņēmējdarbības analīze', 'Bakalaura grāds', 3, 2700);

    const tsi = ins(
      'Transporta un sakaru institūts',
      'Rīga',
      'https://www.tsi.lv',
      'Augstskola ar specializāciju transporta, loģistikas, IT un telekomunikāciju jomā. Piedāvā studijas krievu, latviešu un angļu valodā.',
      14
    );
    prog(tsi, 'Datorzinātnes', 'Bakalaura grāds', 4, 2200, 'Latviešu/Krievu');
    prog(tsi, 'Loģistika un piegādes ķēžu vadība', 'Bakalaura grāds', 4, 2000, 'Latviešu/Krievu');
    prog(tsi, 'Aviācijas transports', 'Bakalaura grāds', 4, 2400, 'Angļu');

    const sse = ins(
      'SSE Rīga (Rīgas Juridiskā augstskola)',
      'Rīga',
      'https://www.sseriga.edu',
      'Augsta līmeņa biznesa augstskola, kas saistīta ar Stokholmas Ekonomikas augstskolu. Pilnībā angļu valodā. Ļoti konkurētspējīga uzņemšana.',
      15
    );
    prog(sse, 'Ekonomika', 'Bakalaura grāds', 3, 8500, 'Angļu');
    prog(sse, 'Biznesa vadība', 'Bakalaura grāds', 3, 8500, 'Angļu');

    const turiba = ins(
      'Biznesa augstskola Turība',
      'Rīga',
      'https://www.turiba.lv',
      'Privāta biznesa augstskola ar plašu studiju programmu klāstu biznesa vadībā, tūrismā, tiesībās un komunikācijā.',
      16
    );
    prog(turiba, 'Biznesa vadība', 'Bakalaura grāds', 3, 2500);
    prog(turiba, 'Tiesību zinātne', 'Bakalaura grāds', 4, 2500);
    prog(turiba, 'Tūrisma vadība', 'Bakalaura grāds', 3, 2300);

    const lka = ins(
      'Latvijas Kristīgā akadēmija',
      'Rīga',
      'https://www.lka.edu.lv',
      'Privāta augstskola ar kristīgu ievirzi, kas piedāvā studijas teoloģijā, sociālajā darbā un pedagoģijā.',
      17
    );
    prog(lka, 'Teoloģija', 'Bakalaura grāds', 4, 1200);
    prog(lka, 'Sociālais darbs', 'Bakalaura grāds', 3, 1200);

    save();
  }

  return db;
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

function getDb() { return db; }

module.exports = { init, getDb, preparedAll, preparedGet, preparedRun, save };
