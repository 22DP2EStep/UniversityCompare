const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'university_compare.db');

let db;

function save() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function init() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
      db.exec('SELECT 1'); // pārbauda vai fails nav bojāts
    } catch {
      fs.unlinkSync(DB_PATH);
      db = new SQL.Database();
    }
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
    function ins(nosaukums, pilseta, vietne, apraksts, reitings, attela_url = null) {
      const atrId = atrvieta(pilseta);
      db.run(
        'INSERT INTO universitates (nosaukums, vietne, apraksts, reitings, atrasanas_vieta_id, attela_url) VALUES (?,?,?,?,?,?)',
        [nosaukums, vietne, apraksts, reitings, atrId, attela_url]
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
      'Latvijas lielākā un vecākā augstskola, dibināta 1919. gadā. Piedāvā plašu studiju programmu klāstu dabaszinātnēs, humanitārajās zinātnēs, sociālajās zinātnēs un medicīnā.', 1,
      'https://www.lu.lv/fileadmin/user_upload/lu_portal/projekti/cfi/zinas/2018/csm_J035_6535afd9d9.jpg');
    prog(lu, 'Datorzinātne',       BAK, 3, 2200);
    prog(lu, 'Tiesību zinātne',    BAK, 4, 2000);
    prog(lu, 'Ekonomika',          BAK, 3, 2000);
    prog(lu, 'Medicīna',           DOK, 6, 4000);
    prog(lu, 'Fizikas',            BAK, 3, 1800);
    prog(lu, 'Datorzinātne',       MAG, 2, 2400);
    prog(lu, 'Tiesību zinātne',    MAG, 2, 2200);
    prog(lu, 'Ekonomika',          MAG, 2, 2200);

    const rtu = ins('Rīgas Tehniskā universitāte', 'Rīga', 'https://www.rtu.lv',
      'Vadošā tehniskā augstskola Baltijā, dibināta 1862. gadā. Specializējas inženierzinātnēs, tehnoloģijās un arhitektūrā.', 2,
      'https://www.rtu.lv/writable/public_files/b_RTU_1_rtu_kipsala.jpg');
    prog(rtu, 'Datorzinātne un informācijas tehnoloģijas', BAK, 4, 2400);
    prog(rtu, 'Elektrotehnika',                           BAK, 4, 2200);
    prog(rtu, 'Arhitektūra',                              BAK, 4, 2200);
    prog(rtu, 'Materiālzinātne',                          BAK, 4, 2000);
    prog(rtu, 'Ķīmijas tehnoloģija',                      BAK, 4, 2000);
    prog(rtu, 'Datorzinātne un informācijas tehnoloģijas', MAG, 2, 2600);
    prog(rtu, 'Elektrotehnika',                           MAG, 2, 2400);
    prog(rtu, 'Arhitektūra',                              MAG, 2, 2400);

    const rsu = ins('Rīgas Stradiņa universitāte', 'Rīga', 'https://www.rsu.lv',
      'Vadošā medicīnas un veselības zinātņu universitāte Latvijā. Piedāvā studijas medicīnā, zobārstniecībā, farmācijā un sociālajās zinātnēs.', 3,
      'https://www.researchlatvia.gov.lv/sites/default/files/styles/article_embed_image/public/2024-06/rsu.jpg?itok=O9Pka1Iz');
    prog(rsu, 'Medicīna',           DOK, 6, 8000, 'Latviešu/Angļu');
    prog(rsu, 'Zobārstniecība',     DOK, 5, 7000, 'Latviešu/Angļu');
    prog(rsu, 'Farmācija',          BAK, 4, 3000);
    prog(rsu, 'Sabiedrības veselība', BAK, 3, 2500);
    prog(rsu, 'Sabiedrības veselība', MAG, 2, 3000, 'Latviešu/Angļu');
    prog(rsu, 'Farmācija',          MAG, 2, 3200);

    const lbtu = ins('Latvijas Biozinātņu un tehnoloģiju universitāte', 'Jelgava', 'https://www.lbtu.lv',
      'Agrāk zināma kā Latvijas Lauksaimniecības universitāte. Specializējas lauksaimniecībā, pārtikas zinātnē, mežsaimniecībā un vides zinātnēs.', 4,
      'https://upload.wikimedia.org/wikipedia/commons/a/a9/Biron_Rezidenz.jpg');
    prog(lbtu, 'Lauksaimniecība',              BAK, 4, 1600);
    prog(lbtu, 'Pārtikas zinātne un tehnoloģija', BAK, 4, 1800);
    prog(lbtu, 'Mežzinātne',                   BAK, 4, 1600);
    prog(lbtu, 'Vides zinātne',                BAK, 4, 1700);
    prog(lbtu, 'Lauksaimniecība',              MAG, 2, 1800);
    prog(lbtu, 'Vides zinātne',                MAG, 2, 1900);

    const du = ins('Daugavpils Universitāte', 'Daugavpils', 'https://www.du.lv',
      'Reģionālā universitāte Austrumlatvijā, kas piedāvā studijas humanitārajās, sociālajās un dabaszinātnēs. Daudzvalodu vide — latviešu un krievu mācībvaloda.', 5,
      'https://du.lv/wp-content/uploads/2023/10/DJI_0041-scaled.jpg');
    prog(du, 'Pedagoģija',       BAK, 4, 1400);
    prog(du, 'Angļu filoloģija', BAK, 3, 1400);
    prog(du, 'Bioloģija',        BAK, 3, 1400);
    prog(du, 'Sociālais darbs',  BAK, 3, 1300);
    prog(du, 'Pedagoģija',       MAG, 2, 1600);

    const liepu = ins('Liepājas Universitāte', 'Liepāja', 'https://www.liepu.lv',
      'Universitāte Latvijas rietumu piekrastē. Specializējas pedagoģijā, mūzikā, mākslā un humanitārajās zinātnēs.', 6,
      'https://upload.wikimedia.org/wikipedia/commons/c/c0/Liep%C4%81jas_Pedago%C4%A3ijas_akad%C4%93mija_1999-09-03_-_panoramio.jpg');
    prog(liepu, 'Pedagoģija',    BAK, 4, 1400);
    prog(liepu, 'Mūzika',        BAK, 4, 1500);
    prog(liepu, 'Sociālais darbs', BAK, 3, 1300);

    const via = ins('Vidzemes Augstskola', 'Valmiera', 'https://www.va.lv',
      'Reģionālā augstskola Vidzemē. Specializējas komunikācijā, informācijas tehnoloģijās, tūrismā un uzņēmējdarbībā.', 7,
      'https://www.researchlatvia.gov.lv/sites/default/files/styles/article_embed_image/public/2024-06/ViA.jpg?itok=8fzGQHSy');
    prog(via, 'Informācijas tehnoloģijas', BAK, 3, 1600);
    prog(via, 'Komunikācija',             BAK, 3, 1500);
    prog(via, 'Tūrisma vadība',           BAK, 3, 1500);
    prog(via, 'Informācijas tehnoloģijas', MAG, 2, 1800);

    const rta = ins('Rēzeknes Tehnoloģiju akadēmija', 'Rēzekne', 'https://www.rta.lv',
      'Tehnoloģiju un mākslas akadēmija Latgalē. Piedāvā studijas inženierzinātnēs, pedagoģijā un mākslā.', 8,
      'https://www.rtu.lv/writable/public_files/b_RTU_2_rtu_rezekne.jpg.webp');
    prog(rta, 'Inženiermehānika', BAK, 4, 1400);
    prog(rta, 'Pedagoģija',       BAK, 4, 1300);
    prog(rta, 'Dizains',          BAK, 4, 1500);

    const lma = ins('Latvijas Mākslas akadēmija', 'Rīga', 'https://www.lma.lv',
      'Latvijas vadošā vizuālās mākslas augstskola, dibināta 1919. gadā. Piedāvā studijas glezniecībā, grafikā, dizainā, skulptūrā un mākslas teorijā.', 9,
      'https://enciklopedija.lv/api/image/thumbnail?name=a3692a10b0e7-6bc8f992-4958-442c-8198-651e616ccb0b.jpg&size=title');
    prog(lma, 'Glezniecība',      BAK, 4, 1800);
    prog(lma, 'Grafiskais dizains', BAK, 4, 1800);
    prog(lma, 'Skulptūra',        BAK, 4, 1800);

    const jvlma = ins('Jāzepa Vītola Latvijas Mūzikas akadēmija', 'Rīga', 'https://www.jvlma.lv',
      'Latvijas valsts mūzikas augstskola, dibināta 1919. gadā. Augstas klases muzikālā izglītība vijolē, klavierēs, diriģēšanā, kompozīcijā un citās disciplīnās.', 10,
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTokNl4RoOfmThH77qAtEAsYiG_0bZ9a5wRbg&s');
    prog(jvlma, 'Klavierspēle', BAK, 4, 1700);
    prog(jvlma, 'Diriģēšana',   BAK, 4, 1700);
    prog(jvlma, 'Kompozīcija',  BAK, 4, 1700);

    const lspa = ins('Latvijas Sporta pedagoģijas akadēmija', 'Rīga', 'https://www.lspa.lv',
      'Specializēta augstskola sporta zinātnē, fiziskajā audzināšanā un veselības izglītībā.', 11,
      'https://enciklopedija.lv/api/image/thumbnail?name=d996465d5be9-86ef50d0-e6cc-41ca-9ad4-7a9d307bfb66.jpg&size=title');
    prog(lspa, 'Sports un fiziskā audzināšana', BAK, 4, 1500);
    prog(lspa, 'Sporta zinātne',                BAK, 4, 1500);

    const riseba = ins('RISEBA Biznesa, mākslas un tehnoloģiju augstskola', 'Rīga', 'https://www.riseba.lv',
      'Starptautiska privātā augstskola, kas piedāvā biznesa administrācijas, komunikācijas, arhitektūras un IT studijas angļu un latviešu valodā.', 12,
      'https://riseba.lv/wp-content/uploads/2023/08/risebaeka.jpg');
    prog(riseba, 'Biznesa administrācija', BAK, 3, 3200, 'Latviešu/Angļu');
    prog(riseba, 'Komunikācija',           BAK, 3, 3000, 'Latviešu/Angļu');
    prog(riseba, 'Arhitektūra',            BAK, 4, 3400, 'Angļu');
    prog(riseba, 'Biznesa administrācija', MAG, 2, 3600, 'Latviešu/Angļu');

    const ba = ins('Banku augstskola', 'Rīga', 'https://www.ba.lv',
      'Specializēta finanšu un banku augstskola. Piedāvā studijas finanšu vadībā, grāmatvedībā un uzņēmējdarbības analīzē.', 13,
      'https://www.lu.lv/fileadmin/_processed_/6/a/csm_Banku_augstskola_67e3aace8a.jpg');
    prog(ba, 'Finanšu vadība',         BAK, 3, 2800);
    prog(ba, 'Grāmatvedība',           BAK, 3, 2600);
    prog(ba, 'Uzņēmējdarbības analīze', BAK, 3, 2700);
    prog(ba, 'Finanšu vadība',         MAG, 2, 3000);

    const tsi = ins('Transporta un sakaru institūts', 'Rīga', 'https://www.tsi.lv',
      'Augstskola ar specializāciju transporta, loģistikas, IT un telekomunikāciju jomā. Piedāvā studijas krievu, latviešu un angļu valodā.', 14,
      'https://www.lk-group.lv/site-files/gallery/2020-06/1591340400_7b8e2c38293a7b22f00afb5a50df09ff.jpg');
    prog(tsi, 'Datorzinātnes',                       BAK, 4, 2200, 'Latviešu/Krievu');
    prog(tsi, 'Loģistika un piegādes ķēžu vadība',  BAK, 4, 2000, 'Latviešu/Krievu');
    prog(tsi, 'Aviācijas transports',                BAK, 4, 2400, 'Angļu');

    const sse = ins('SSE Rīga (Rīgas Juridiskā augstskola)', 'Rīga', 'https://www.sseriga.edu',
      'Augsta līmeņa biznesa augstskola, kas saistīta ar Stokholmas Ekonomikas augstskolu. Pilnībā angļu valodā. Ļoti konkurētspējīga uzņemšana.', 15,
      'https://i.jauns.lv/t/2024/11/11/3162506/490x350.webp?v=1731325007');
    prog(sse, 'Ekonomika',      BAK, 3, 8500, 'Angļu');
    prog(sse, 'Biznesa vadība', BAK, 3, 8500, 'Angļu');
    prog(sse, 'Ekonomika',      MAG, 2, 9500, 'Angļu');

    const turiba = ins('Biznesa augstskola Turība', 'Rīga', 'https://www.turiba.lv',
      'Privāta biznesa augstskola ar plašu studiju programmu klāstu biznesa vadībā, tūrismā, tiesībās un komunikācijā.', 16,
      'https://www.turiba.lv/storage/files/biznesa-augstskola-turiba.jpg');
    prog(turiba, 'Biznesa vadība',  BAK, 3, 2500);
    prog(turiba, 'Tiesību zinātne', BAK, 4, 2500);
    prog(turiba, 'Tūrisma vadība',  BAK, 3, 2300);
    prog(turiba, 'Biznesa vadība',  MAG, 2, 2800);

    const lka = ins('Latvijas Kristīgā akadēmija', 'Rīga', 'https://www.lka.edu.lv',
      'Privāta augstskola ar kristīgu ievirzi, kas piedāvā studijas teoloģijā, sociālajā darbā un pedagoģijā.', 17,
      'https://viss.lv/dati/latvijas_kristiga_akademija/logo_latvijas_kristiga_akademija.jpg');
    prog(lka, 'Teoloģija',      BAK, 4, 1200);
    prog(lka, 'Sociālais darbs', BAK, 3, 1200);

    save();
  }

  // ── Lietotāju sākotnējie dati ─────────────────────────────────
  const lietSk = db.exec('SELECT COUNT(*) FROM lietotaji')[0].values[0][0];
  if (lietSk === 0) {
    const luId = db.exec("SELECT id FROM universitates WHERE nosaukums = 'Latvijas Universitāte'")[0]?.values[0][0];

    db.run('INSERT INTO lietotaji (vards, epasts, parole, loma) VALUES (?,?,?,?)', [
      'Administrators',
      'admin@demo.com',
      bcrypt.hashSync('admin123', 10),
      'admin',
    ]);
    db.run('INSERT INTO lietotaji (vards, epasts, parole, loma) VALUES (?,?,?,?)', [
      'Lietotājs',
      'user@demo.com',
      bcrypt.hashSync('user123', 10),
      'user',
    ]);
    db.run('INSERT INTO lietotaji (vards, epasts, parole, loma, eksperta_uni_id) VALUES (?,?,?,?,?)', [
      'Eksperts',
      'expert@demo.com',
      bcrypt.hashSync('expert123', 10),
      'expert',
      luId || null,
    ]);
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
