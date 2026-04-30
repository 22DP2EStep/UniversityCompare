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

  db.run('PRAGMA foreign_keys = ON;');

  // Migrācija: nodzēš veco shēmu ja nav jaunā, vai ja universitates vēl satur pilseta/valsts kolonnas
  const irUniTabula = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='universitates'")[0]?.values?.length > 0;
  const irVecasKolonnas = irUniTabula
    ? db.exec("SELECT COUNT(*) FROM pragma_table_info('universitates') WHERE name='pilseta'")[0].values[0][0] > 0
    : false;

  if (!irUniTabula || irVecasKolonnas) {
    ['reviews', 'programs', 'programmas', 'locations', 'users', 'lietotaji', 'universities', 'universitates', 'gradi', 'atrasanas_vieta'].forEach(t =>
      db.run(`DROP TABLE IF EXISTS ${t}`)
    );
    save();
  }

  // ── Tabulu definīcijas ────────────────────────────────────────

  db.run(`
    CREATE TABLE IF NOT EXISTS atrasanas_vieta (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      pilseta TEXT NOT NULL,
      valsts  TEXT NOT NULL DEFAULT 'Latvija',
      UNIQUE(pilseta, valsts)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS gradi (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nosaukums TEXT NOT NULL UNIQUE,
      limenis   INTEGER NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS universitates (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      nosaukums    TEXT NOT NULL,
      vietne       TEXT,
      apraksts     TEXT,
      reitings     INTEGER,

      attela_url   TEXT,
      atrasanas_vieta_id  INTEGER NOT NULL,
      izveidots    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (atrasanas_vieta_id) REFERENCES atrasanas_vieta(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lietotaji (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      vards           TEXT NOT NULL,
      epasts          TEXT NOT NULL UNIQUE,
      parole    TEXT NOT NULL,
      loma            TEXT NOT NULL DEFAULT 'user',
      eksperta_uni_id INTEGER,
      izveidots       DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (eksperta_uni_id) REFERENCES universitates(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS programmas (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      uni_id      INTEGER NOT NULL,
      nosaukums   TEXT NOT NULL,
      grads_id    INTEGER NOT NULL,
      ilgums_gadi REAL NOT NULL,
      maksa_gada  REAL,
      valoda      TEXT DEFAULT 'Latviešu',
      apraksts    TEXT,
      izveidots   DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (uni_id)   REFERENCES universitates(id) ON DELETE CASCADE,
      FOREIGN KEY (grads_id) REFERENCES gradi(id)
    );
  `);

  // ── Grādu sākotnējie dati ────────────────────────────────────
  const gradSk = db.exec('SELECT COUNT(*) FROM gradi')[0].values[0][0];
  if (gradSk === 0) {
    db.run('INSERT INTO gradi (nosaukums, limenis) VALUES (?,?)', ['Bakalaura grāds', 1]);
    db.run('INSERT INTO gradi (nosaukums, limenis) VALUES (?,?)', ['Maģistra grāds',  2]);
    db.run('INSERT INTO gradi (nosaukums, limenis) VALUES (?,?)', ['Doktora grāds',   3]);
    save();
  }

  function gradId(nos) {
    return db.exec('SELECT id FROM gradi WHERE nosaukums = ?', [nos])[0]?.values[0][0];
  }
  const BAK = gradId('Bakalaura grāds');
  const MAG = gradId('Maģistra grāds');
  const DOK = gradId('Doktora grāds');

  // ── Universitāšu sākotnējie dati ─────────────────────────────
  const uniSk = db.exec('SELECT COUNT(*) FROM universitates')[0].values[0][0];
  if (uniSk === 0) {
    function atrvieta(pilseta, valsts = 'Latvija') {
      db.run('INSERT OR IGNORE INTO atrasanas_vieta (pilseta, valsts) VALUES (?,?)', [pilseta, valsts]);
      return db.exec('SELECT id FROM atrasanas_vieta WHERE pilseta = ? AND valsts = ?', [pilseta, valsts])[0].values[0][0];
    }
    function ins(nosaukums, pilseta, vietne, apraksts, reitings) {
      const atrId = atrvieta(pilseta);
      db.run(
        'INSERT INTO universitates (nosaukums, vietne, apraksts, reitings, atrasanas_vieta_id) VALUES (?,?,?,?,?)',
        [nosaukums, vietne, apraksts, reitings, atrId]
      );
      return db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    }
    function prog(uniId, nosaukums, gradsId, ilgums, maksa, valoda = 'Latviešu') {
      db.run(
        'INSERT INTO programmas (uni_id, nosaukums, grads_id, ilgums_gadi, maksa_gada, valoda) VALUES (?,?,?,?,?,?)',
        [uniId, nosaukums, gradsId, ilgums, maksa || null, valoda]
      );
    }

    const lu = ins('Latvijas Universitāte', 'Rīga', 'https://www.lu.lv',
      'Latvijas lielākā un vecākā augstskola, dibināta 1919. gadā. Piedāvā plašu studiju programmu klāstu dabaszinātnēs, humanitārajās zinātnēs, sociālajās zinātnēs un medicīnā.', 1);
    prog(lu, 'Datorzinātne',       BAK, 3, 2200);
    prog(lu, 'Tiesību zinātne',    BAK, 4, 2000);
    prog(lu, 'Ekonomika',          BAK, 3, 2000);
    prog(lu, 'Medicīna',           DOK, 6, 4000);
    prog(lu, 'Fizikas',            BAK, 3, 1800);
    prog(lu, 'Datorzinātne',       MAG, 2, 2400);
    prog(lu, 'Tiesību zinātne',    MAG, 2, 2200);
    prog(lu, 'Ekonomika',          MAG, 2, 2200);

    const rtu = ins('Rīgas Tehniskā universitāte', 'Rīga', 'https://www.rtu.lv',
      'Vadošā tehniskā augstskola Baltijā, dibināta 1862. gadā. Specializējas inženierzinātnēs, tehnoloģijās un arhitektūrā.', 2);
    prog(rtu, 'Datorzinātne un informācijas tehnoloģijas', BAK, 4, 2400);
    prog(rtu, 'Elektrotehnika',                           BAK, 4, 2200);
    prog(rtu, 'Arhitektūra',                              BAK, 4, 2200);
    prog(rtu, 'Materiālzinātne',                          BAK, 4, 2000);
    prog(rtu, 'Ķīmijas tehnoloģija',                      BAK, 4, 2000);
    prog(rtu, 'Datorzinātne un informācijas tehnoloģijas', MAG, 2, 2600);
    prog(rtu, 'Elektrotehnika',                           MAG, 2, 2400);
    prog(rtu, 'Arhitektūra',                              MAG, 2, 2400);

    const rsu = ins('Rīgas Stradiņa universitāte', 'Rīga', 'https://www.rsu.lv',
      'Vadošā medicīnas un veselības zinātņu universitāte Latvijā. Piedāvā studijas medicīnā, zobārstniecībā, farmācijā un sociālajās zinātnēs.', 3);
    prog(rsu, 'Medicīna',           DOK, 6, 8000, 'Latviešu/Angļu');
    prog(rsu, 'Zobārstniecība',     DOK, 5, 7000, 'Latviešu/Angļu');
    prog(rsu, 'Farmācija',          BAK, 4, 3000);
    prog(rsu, 'Sabiedrības veselība', BAK, 3, 2500);
    prog(rsu, 'Sabiedrības veselība', MAG, 2, 3000, 'Latviešu/Angļu');
    prog(rsu, 'Farmācija',          MAG, 2, 3200);

    const lbtu = ins('Latvijas Biozinātņu un tehnoloģiju universitāte', 'Jelgava', 'https://www.lbtu.lv',
      'Agrāk zināma kā Latvijas Lauksaimniecības universitāte. Specializējas lauksaimniecībā, pārtikas zinātnē, mežsaimniecībā un vides zinātnēs.', 4);
    prog(lbtu, 'Lauksaimniecība',              BAK, 4, 1600);
    prog(lbtu, 'Pārtikas zinātne un tehnoloģija', BAK, 4, 1800);
    prog(lbtu, 'Mežzinātne',                   BAK, 4, 1600);
    prog(lbtu, 'Vides zinātne',                BAK, 4, 1700);
    prog(lbtu, 'Lauksaimniecība',              MAG, 2, 1800);
    prog(lbtu, 'Vides zinātne',                MAG, 2, 1900);

    const du = ins('Daugavpils Universitāte', 'Daugavpils', 'https://www.du.lv',
      'Reģionālā universitāte Austrumlatvijā, kas piedāvā studijas humanitārajās, sociālajās un dabaszinātnēs. Daudzvalodu vide — latviešu un krievu mācībvaloda.', 5);
    prog(du, 'Pedagoģija',       BAK, 4, 1400);
    prog(du, 'Angļu filoloģija', BAK, 3, 1400);
    prog(du, 'Bioloģija',        BAK, 3, 1400);
    prog(du, 'Sociālais darbs',  BAK, 3, 1300);
    prog(du, 'Pedagoģija',       MAG, 2, 1600);

    const liepu = ins('Liepājas Universitāte', 'Liepāja', 'https://www.liepu.lv',
      'Universitāte Latvijas rietumu piekrastē. Specializējas pedagoģijā, mūzikā, mākslā un humanitārajās zinātnēs.', 6);
    prog(liepu, 'Pedagoģija',    BAK, 4, 1400);
    prog(liepu, 'Mūzika',        BAK, 4, 1500);
    prog(liepu, 'Sociālais darbs', BAK, 3, 1300);

    const via = ins('Vidzemes Augstskola', 'Valmiera', 'https://www.va.lv',
      'Reģionālā augstskola Vidzemē. Specializējas komunikācijā, informācijas tehnoloģijās, tūrismā un uzņēmējdarbībā.', 7);
    prog(via, 'Informācijas tehnoloģijas', BAK, 3, 1600);
    prog(via, 'Komunikācija',             BAK, 3, 1500);
    prog(via, 'Tūrisma vadība',           BAK, 3, 1500);
    prog(via, 'Informācijas tehnoloģijas', MAG, 2, 1800);

    const rta = ins('Rēzeknes Tehnoloģiju akadēmija', 'Rēzekne', 'https://www.rta.lv',
      'Tehnoloģiju un mākslas akadēmija Latgalē. Piedāvā studijas inženierzinātnēs, pedagoģijā un mākslā.', 8);
    prog(rta, 'Inženiermehānika', BAK, 4, 1400);
    prog(rta, 'Pedagoģija',       BAK, 4, 1300);
    prog(rta, 'Dizains',          BAK, 4, 1500);

    const lma = ins('Latvijas Mākslas akadēmija', 'Rīga', 'https://www.lma.lv',
      'Latvijas vadošā vizuālās mākslas augstskola, dibināta 1919. gadā. Piedāvā studijas glezniecībā, grafikā, dizainā, skulptūrā un mākslas teorijā.', 9);
    prog(lma, 'Glezniecība',      BAK, 4, 1800);
    prog(lma, 'Grafiskais dizains', BAK, 4, 1800);
    prog(lma, 'Skulptūra',        BAK, 4, 1800);

    const jvlma = ins('Jāzepa Vītola Latvijas Mūzikas akadēmija', 'Rīga', 'https://www.jvlma.lv',
      'Latvijas valsts mūzikas augstskola, dibināta 1919. gadā. Augstas klases muzikālā izglītība vijolē, klavierēs, diriģēšanā, kompozīcijā un citās disciplīnās.', 10);
    prog(jvlma, 'Klavierspēle', BAK, 4, 1700);
    prog(jvlma, 'Diriģēšana',   BAK, 4, 1700);
    prog(jvlma, 'Kompozīcija',  BAK, 4, 1700);

    const lspa = ins('Latvijas Sporta pedagoģijas akadēmija', 'Rīga', 'https://www.lspa.lv',
      'Specializēta augstskola sporta zinātnē, fiziskajā audzināšanā un veselības izglītībā.', 11);
    prog(lspa, 'Sports un fiziskā audzināšana', BAK, 4, 1500);
    prog(lspa, 'Sporta zinātne',                BAK, 4, 1500);

    const riseba = ins('RISEBA Biznesa, mākslas un tehnoloģiju augstskola', 'Rīga', 'https://www.riseba.lv',
      'Starptautiska privātā augstskola, kas piedāvā biznesa administrācijas, komunikācijas, arhitektūras un IT studijas angļu un latviešu valodā.', 12);
    prog(riseba, 'Biznesa administrācija', BAK, 3, 3200, 'Latviešu/Angļu');
    prog(riseba, 'Komunikācija',           BAK, 3, 3000, 'Latviešu/Angļu');
    prog(riseba, 'Arhitektūra',            BAK, 4, 3400, 'Angļu');
    prog(riseba, 'Biznesa administrācija', MAG, 2, 3600, 'Latviešu/Angļu');

    const ba = ins('Banku augstskola', 'Rīga', 'https://www.ba.lv',
      'Specializēta finanšu un banku augstskola. Piedāvā studijas finanšu vadībā, grāmatvedībā un uzņēmējdarbības analīzē.', 13);
    prog(ba, 'Finanšu vadība',         BAK, 3, 2800);
    prog(ba, 'Grāmatvedība',           BAK, 3, 2600);
    prog(ba, 'Uzņēmējdarbības analīze', BAK, 3, 2700);
    prog(ba, 'Finanšu vadība',         MAG, 2, 3000);

    const tsi = ins('Transporta un sakaru institūts', 'Rīga', 'https://www.tsi.lv',
      'Augstskola ar specializāciju transporta, loģistikas, IT un telekomunikāciju jomā. Piedāvā studijas krievu, latviešu un angļu valodā.', 14);
    prog(tsi, 'Datorzinātnes',                       BAK, 4, 2200, 'Latviešu/Krievu');
    prog(tsi, 'Loģistika un piegādes ķēžu vadība',  BAK, 4, 2000, 'Latviešu/Krievu');
    prog(tsi, 'Aviācijas transports',                BAK, 4, 2400, 'Angļu');

    const sse = ins('SSE Rīga (Rīgas Juridiskā augstskola)', 'Rīga', 'https://www.sseriga.edu',
      'Augsta līmeņa biznesa augstskola, kas saistīta ar Stokholmas Ekonomikas augstskolu. Pilnībā angļu valodā. Ļoti konkurētspējīga uzņemšana.', 15);
    prog(sse, 'Ekonomika',      BAK, 3, 8500, 'Angļu');
    prog(sse, 'Biznesa vadība', BAK, 3, 8500, 'Angļu');
    prog(sse, 'Ekonomika',      MAG, 2, 9500, 'Angļu');

    const turiba = ins('Biznesa augstskola Turība', 'Rīga', 'https://www.turiba.lv',
      'Privāta biznesa augstskola ar plašu studiju programmu klāstu biznesa vadībā, tūrismā, tiesībās un komunikācijā.', 16);
    prog(turiba, 'Biznesa vadība',  BAK, 3, 2500);
    prog(turiba, 'Tiesību zinātne', BAK, 4, 2500);
    prog(turiba, 'Tūrisma vadība',  BAK, 3, 2300);
    prog(turiba, 'Biznesa vadība',  MAG, 2, 2800);

    const lka = ins('Latvijas Kristīgā akadēmija', 'Rīga', 'https://www.lka.edu.lv',
      'Privāta augstskola ar kristīgu ievirzi, kas piedāvā studijas teoloģijā, sociālajā darbā un pedagoģijā.', 17);
    prog(lka, 'Teoloģija',      BAK, 4, 1200);
    prog(lka, 'Sociālais darbs', BAK, 3, 1200);

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
