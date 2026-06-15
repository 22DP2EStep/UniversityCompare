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
      db.exec('SELECT 1');
    } catch {
      fs.unlinkSync(DB_PATH);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON;');

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
      parole          TEXT NOT NULL,
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

    // ── 1. Latvijas Universitāte ──────────────────────────────
    const lu = ins('Latvijas Universitāte', 'Rīga', 'https://www.lu.lv',
      'Latvijas lielākā un vecākā augstskola, dibināta 1919. gadā. Zinātnes universitāte ar plašu studiju programmu klāstu dabaszinātnēs, humanitārajās zinātnēs, sociālajās zinātnēs un medicīnā.', 1,
      'https://www.lu.lv/fileadmin/user_upload/lu_portal/projekti/cfi/zinas/2018/csm_J035_6535afd9d9.jpg');
    prog(lu, 'Datorzinātnes',                                          BAK, 4,   2800, 'Latviešu/Angļu');
    prog(lu, 'Ekonomika',                                              BAK, 3,   2800, 'Latviešu');
    prog(lu, 'Biznesa vadība',                                         BAK, 3,   2800, 'Latviešu/Angļu');
    prog(lu, 'Tiesību zinātne',                                        BAK, 4,   2800, 'Latviešu');
    prog(lu, 'Bioloģija un biomedicīna',                               BAK, 3,   2700, 'Latviešu');
    prog(lu, 'Ārstniecība',                                            DOK, 6,   3600, 'Latviešu/Angļu');
    prog(lu, 'Farmācija',                                              BAK, 3,   2550, 'Latviešu');
    prog(lu, 'Anglistikas, Eiropas valodu un biznesa studijas',        BAK, 3,   2600, 'Angļu');
    prog(lu, 'Psiholoģija',                                            BAK, 3,   2800, 'Latviešu');
    prog(lu, 'Datorzinātnes',                                          MAG, 2,   2800, 'Latviešu/Angļu');
    prog(lu, 'Ekonomika',                                              MAG, 2,   2800, 'Latviešu');
    prog(lu, 'Tiesību zinātne',                                        MAG, 2,   2600, 'Latviešu');

    // ── 2. Rīgas Tehniskā universitāte ───────────────────────
    const rtu = ins('Rīgas Tehniskā universitāte', 'Rīga', 'https://www.rtu.lv',
      'Vadošā tehniskā augstskola Baltijā, dibināta 1862. gadā. Zinātnes universitāte, specializējas inženierzinātnēs, tehnoloģijās, arhitektūrā un datorzinātnēs.', 2,
      'https://www.rtu.lv/writable/public_files/b_RTU_1_rtu_kipsala.jpg');
    prog(rtu, 'Arhitektūra',                                           BAK, 3.5, 6800, 'Latviešu/Angļu');
    prog(rtu, 'Datorzinātne un informācijas tehnoloģijas',             BAK, 4,   3990, 'Latviešu/Angļu');
    prog(rtu, 'Aeronautikas un transporta sistēmu inženierija',        BAK, 4,   3500, 'Latviešu/Angļu');
    prog(rtu, 'Elektrotehnika un elektronika',                         BAK, 4.5, 3990, 'Latviešu/Angļu');
    prog(rtu, 'Būvniecība',                                            BAK, 4,   3500, 'Latviešu');
    prog(rtu, 'Ķīmijas tehnoloģija',                                   BAK, 4,   3200, 'Latviešu');
    prog(rtu, 'Arhitektūra',                                           MAG, 2,   9580, 'Latviešu/Angļu');
    prog(rtu, 'Datorzinātne un informācijas tehnoloģijas',             MAG, 2,   5300, 'Latviešu/Angļu');
    prog(rtu, 'Elektrotehnika un elektronika',                         MAG, 2,   5650, 'Latviešu/Angļu');
    prog(rtu, 'Uzņēmējdarbības vadība',                                MAG, 1.5, 5300, 'Latviešu/Angļu');

    // ── 3. Rīgas Stradiņa universitāte ───────────────────────
    // No 01.07.2024. ietver arī bijušo LSPA.
    const rsu = ins('Rīgas Stradiņa universitāte', 'Rīga', 'https://www.rsu.lv',
      'Vadošā medicīnas un veselības zinātņu universitāte Latvijā, dibināta 1950. gadā. No 2024. gada ietver arī bijušo LSPA. Piedāvā studijas medicīnā, zobārstniecībā, farmācijā, rehabilitācijā un sociālajās zinātnēs.', 3,
      'https://www.researchlatvia.gov.lv/sites/default/files/styles/article_embed_image/public/2024-06/rsu.jpg?itok=O9Pka1Iz');
    prog(rsu, 'Ārstniecība',                          DOK, 6,   8500, 'Latviešu/Angļu');
    prog(rsu, 'Zobārstniecība',                       DOK, 5,   8500, 'Latviešu/Angļu');
    prog(rsu, 'Farmācija',                            DOK, 5,   6500, 'Latviešu/Angļu');
    prog(rsu, 'Audiologopēdija',                      BAK, 4,   6500, 'Latviešu');
    prog(rsu, 'Ergoterapija',                         BAK, 4,   6500, 'Latviešu/Angļu');
    prog(rsu, 'Sabiedrības veselība',                 BAK, 3,   4500, 'Latviešu');
    prog(rsu, 'Rehabilitācija',                       BAK, 3,   5000, 'Latviešu');
    prog(rsu, 'Sports un sporta treneris',            BAK, 3,   3500, 'Latviešu');
    prog(rsu, 'Biomedicīna',                          MAG, 2,   5000, 'Latviešu');
    prog(rsu, 'Sabiedrības veselība',                 MAG, 2,   4500, 'Latviešu/Angļu');
    prog(rsu, 'Digitālās stratēģijas un MI vadība',  MAG, 2,   5000, 'Angļu');

    // ── 4. Latvijas Biozinātņu un tehnoloģiju universitāte ───
    const lbtu = ins('Latvijas Biozinātņu un tehnoloģiju universitāte', 'Jelgava', 'https://www.lbtu.lv',
      'Zinātnes universitāte Jelgavā (agrāk — LLU). Specializējas lauksaimniecībā, pārtikas zinātnē, mežsaimniecībā, veterinārmedicīnā, vides zinātnēs un biotehnoloģijās.', 4,
      'https://www.jelgava.lv/wp-content/uploads/2023/08/lbtu_MG_0474_6.jpg');
    prog(lbtu, 'Ainavu arhitektūra un plānošana',        BAK, 3.5, 2200, 'Latviešu');
    prog(lbtu, 'Biosistēmu mašinērija un tehnoloģijas',  BAK, 3,   1345, 'Latviešu/Angļu');
    prog(lbtu, 'Lauksaimniecība',                        BAK, 4,   1600, 'Latviešu');
    prog(lbtu, 'Pārtikas kvalitāte un inovācijas',       BAK, 3,   1600, 'Latviešu');
    prog(lbtu, 'Mežzinātne',                             BAK, 4,   1600, 'Latviešu');
    prog(lbtu, 'Veterinārmedicīna',                      DOK, 5.5, 2500, 'Latviešu');
    prog(lbtu, 'Vides zinātne',                          BAK, 3,   1600, 'Latviešu/Angļu');
    prog(lbtu, 'Ainavu arhitektūra un plānošana',        MAG, 2,   2000, 'Latviešu');
    prog(lbtu, 'Lauksaimniecība',                        MAG, 2,   1800, 'Latviešu');
    prog(lbtu, 'Pārtikas zinātne',                       MAG, 2,   1800, 'Latviešu');

    // ── 5. Latvijas Mākslas akadēmija ────────────────────────
    const lma = ins('Latvijas Mākslas akadēmija', 'Rīga', 'https://www.lma.lv',
      'Latvijas vadošā vizuālās mākslas augstskola, dibināta 1919. gadā. Piedāvā studijas glezniecībā, grafikā, dizainā, skulptūrā un mākslas teorijā.', 5,
      'https://enciklopedija.lv/api/image/thumbnail?name=a3692a10b0e7-6bc8f992-4958-442c-8198-651e616ccb0b.jpg&size=title');
    prog(lma, 'Glezniecība',                    BAK, 4, 2000, 'Latviešu');
    prog(lma, 'Grafika',                        BAK, 4, 2000, 'Latviešu');
    prog(lma, 'Grafiskais dizains',             BAK, 4, 2000, 'Latviešu');
    prog(lma, 'Skulptūra',                      BAK, 4, 2000, 'Latviešu');
    prog(lma, 'Tekstilmāksla un modes dizains', BAK, 4, 2000, 'Latviešu');
    prog(lma, 'Mākslas teorija un vēsture',     BAK, 4, 2000, 'Latviešu');
    prog(lma, 'Glezniecība',                    MAG, 2, 2200, 'Latviešu');
    prog(lma, 'Dizains',                        MAG, 2, 2200, 'Latviešu');

    // ── 6. Jāzepa Vītola Latvijas Mūzikas akadēmija ─────────
    const jvlma = ins('Jāzepa Vītola Latvijas Mūzikas akadēmija', 'Rīga', 'https://www.jvlma.lv',
      'Latvijas valsts mūzikas augstskola, dibināta 1919. gadā. Augstas klases muzikālā izglītība vijolē, klavierēs, diriģēšanā, kompozīcijā un citās disciplīnās.', 6,
      'https://lastatic.ams3.cdn.digitaloceanspaces.com/2018/10/Muzikas-akademija_LET_1475472.jpg');
    prog(jvlma, 'Klavierspēle',        BAK, 4, 1800, 'Latviešu');
    prog(jvlma, 'Vijolspēle',          BAK, 4, 1800, 'Latviešu');
    prog(jvlma, 'Diriģēšana',          BAK, 4, 1800, 'Latviešu');
    prog(jvlma, 'Kompozīcija',         BAK, 4, 1800, 'Latviešu');
    prog(jvlma, 'Dziedāšana',          BAK, 4, 1800, 'Latviešu');
    prog(jvlma, 'Mūzikas pedagoģija',  BAK, 4, 1800, 'Latviešu');
    prog(jvlma, 'Klavierspēle',        MAG, 2, 2000, 'Latviešu');
    prog(jvlma, 'Diriģēšana',          MAG, 2, 2000, 'Latviešu');

    // ── 7. SSE Rīga ──────────────────────────────────────────
    const sse = ins('SSE Rīga', 'Rīga', 'https://www.sseriga.edu',
      'Stokholmas Ekonomikas augstskolas filiāle Rīgā, dibināta 1994. gadā. Pilnībā angļu valodā. Ļoti konkurētspējīga uzņemšana — aptuveni 60 studenti gadā. Viena no prestižākajām biznesa skolām Baltijā.', 7,
      'https://i.jauns.lv/t/2024/11/11/3162506/490x350.webp?v=1731325007');
    prog(sse, 'Ekonomika',                   BAK, 3, 8500, 'Angļu');
    prog(sse, 'Biznesa vadība un ekonomika', BAK, 3, 8500, 'Angļu');
    prog(sse, 'Ekonomika',                   MAG, 1, 9500, 'Angļu');
    prog(sse, 'Finanšu ekonomika',           MAG, 1, 9500, 'Angļu');

    // ── 8. Rīgas Juridiskā augstskola (RGSL) ─────────────────
    const rgsl = ins('Rīgas Juridiskā augstskola', 'Rīga', 'https://www.rgsl.edu.lv',
      'Starptautiska tiesību augstskola, dibināta 1998. gadā Latvijas un Zviedrijas valdību sadarbībā. Specializējas starptautiskajās un Eiropas tiesībās. Pilnībā angļu valodā.', 8,
      'https://www.rgsl.edu.lv/uploads/news/1895/rgsl-web-140.jpg');
    prog(rgsl, 'Starptautiskās un Eiropas tiesības',        BAK, 3, 6500, 'Angļu');
    prog(rgsl, 'Starptautiskās un Eiropas tiesības',        MAG, 1, 7500, 'Angļu');
    prog(rgsl, 'Starptautiskās tiesības un cilvēktiesības', MAG, 1, 7500, 'Angļu');

    // ── 9. Banku augstskola ───────────────────────────────────
    const ba = ins('Banku augstskola', 'Rīga', 'https://www.ba.lv',
      'Specializēta finanšu un banku augstskola, tagad darbojas kā LU struktūrvienība. Piedāvā studijas finanšu vadībā, grāmatvedībā un uzņēmējdarbības vadībā.', 9,
      'https://www.lu.lv/fileadmin/_processed_/6/a/csm_Banku_augstskola_67e3aace8a.jpg');
    prog(ba, 'Biznesa procesu vadība',  BAK, 4,   3300, 'Latviešu/Angļu');
    prog(ba, 'Finanšu vadība',          BAK, 3,   3300, 'Latviešu');
    prog(ba, 'Grāmatvedība un audits',  BAK, 4,   3300, 'Latviešu');
    prog(ba, 'Finanšu vadība',          MAG, 1.5, 3500, 'Latviešu');
    prog(ba, 'Uzņēmējdarbības vadība',  MAG, 1.5, 3500, 'Latviešu/Angļu');

    // ── 10. Biznesa augstskola Turība ────────────────────────
    const turiba = ins('Biznesa augstskola Turība', 'Rīga', 'https://www.turiba.lv',
      'Privāta biznesa augstskola ar plašu studiju programmu klāstu biznesa vadībā, tūrismā, tiesībās, komunikācijā un uzturā.', 10,
      'https://www.turiba.lv/storage/files/biznesa-augstskola-turiba.jpg');
    prog(turiba, 'Uzņēmējdarbības vadība', BAK, 3,   2500, 'Latviešu');
    prog(turiba, 'Tiesību zinātne',         BAK, 4,   2500, 'Latviešu');
    prog(turiba, 'Tūrisma vadība',          BAK, 3,   2300, 'Latviešu');
    prog(turiba, 'Komunikācija',            BAK, 3,   2400, 'Latviešu');
    prog(turiba, 'Uzturs',                  BAK, 3,   2600, 'Latviešu');
    prog(turiba, 'Uzņēmējdarbības vadība', MAG, 1.5, 2800, 'Latviešu');
    prog(turiba, 'Tiesību zinātne',         MAG, 2,   2800, 'Latviešu');

    // ── 11. RISEBA ───────────────────────────────────────────
    const riseba = ins('RISEBA Biznesa, mākslas un tehnoloģiju augstskola', 'Rīga', 'https://www.riseba.lv',
      'Starptautiska privātā augstskola, dibināta 1992. gadā. Piedāvā biznesa administrācijas, komunikācijas, arhitektūras un IT studijas angļu un latviešu valodā.', 11,
      'https://riseba.lv/wp-content/uploads/2023/08/risebaeka.jpg');
    prog(riseba, 'Biznesa administrācija',    BAK, 3,   3200, 'Latviešu/Angļu');
    prog(riseba, 'Komunikācija',              BAK, 3,   3000, 'Latviešu/Angļu');
    prog(riseba, 'Arhitektūra',               BAK, 4,   3400, 'Angļu');
    prog(riseba, 'Informācijas tehnoloģijas', BAK, 3,   3200, 'Latviešu/Angļu');
    prog(riseba, 'Biznesa administrācija',    MAG, 1.5, 3600, 'Latviešu/Angļu');
    prog(riseba, 'Komunikācija',              MAG, 1.5, 3400, 'Latviešu/Angļu');

    // ── 12. Daugavpils Universitāte ──────────────────────────
    const du = ins('Daugavpils Universitāte', 'Daugavpils', 'https://www.du.lv',
      'Reģionālā lietišķo zinātņu universitāte Austrumlatvijā, dibināta 1921. gadā. Piedāvā studijas pedagoģijā, veselības aprūpē, humanitārajās un sociālajās zinātnēs.', 12,
      'https://du.lv/wp-content/uploads/2023/10/DJI_0041-scaled.jpg');
    prog(du, 'Skolotājs (sākumizglītība)',             BAK, 4, 1500, 'Latviešu');
    prog(du, 'Angļu valoda un literatūra',             BAK, 3, 1400, 'Latviešu');
    prog(du, 'Programmēšana',                          BAK, 4, 1600, 'Latviešu');
    prog(du, 'Sociālais darbs',                        BAK, 3, 1400, 'Latviešu');
    prog(du, 'Fizioterapija',                          BAK, 3, 2500, 'Latviešu');
    prog(du, 'Bioloģija',                              BAK, 3, 1400, 'Latviešu');
    prog(du, 'Stratēģiskie riski un krīžu pārvaldība', BAK, 3, 1600, 'Latviešu');
    prog(du, 'Skolotājs',                              MAG, 2, 1600, 'Latviešu');

    // ── 13. Liepājas Universitāte ────────────────────────────
    const liepu = ins('Liepājas Universitāte', 'Liepāja', 'https://www.liepu.lv',
      'Universitāte Latvijas rietumu piekrastē, dibināta 1954. gadā. Specializējas pedagoģijā, mūzikā, mākslā, sociālajā darbā un humanitārajās zinātnēs.', 13,
      'https://upload.wikimedia.org/wikipedia/commons/c/c0/Liep%C4%81jas_Pedago%C4%A3ijas_akad%C4%93mija_1999-09-03_-_panoramio.jpg');
    prog(liepu, 'Skolotājs',        BAK, 4, 1400, 'Latviešu');
    prog(liepu, 'Mūzika',           BAK, 4, 1500, 'Latviešu');
    prog(liepu, 'Māksla',           BAK, 4, 1500, 'Latviešu');
    prog(liepu, 'Sociālais darbs',  BAK, 3, 1300, 'Latviešu');
    prog(liepu, 'Komunikācija',     BAK, 3, 1400, 'Latviešu');
    prog(liepu, 'Pedagoģija',       MAG, 2, 1600, 'Latviešu');

    // ── 14. Latvijas Kultūras akadēmija ──────────────────────
    const lkakult = ins('Latvijas Kultūras akadēmija', 'Rīga', 'https://www.lka.edu.lv',
      'Latvijas valsts kultūras augstskola, dibināta 1990. gadā. Specializējas teātra mākslā, kultūras vadībā, kultūras vēsturē, dejā un radošajās industrijās.', 14,
      'https://lka.edu.lv/media/cms_page_media/250/lka-ludzas-iela-24_H1Uy60V.jpg');
    prog(lkakult, 'Dramatiskā teātra aktiera māksla', BAK, 4, 1700, 'Latviešu');
    prog(lkakult, 'Kultūras vadība',                  BAK, 3, 1600, 'Latviešu');
    prog(lkakult, 'Deja',                             BAK, 4, 1600, 'Latviešu');
    prog(lkakult, 'Radošās industrijas',              BAK, 3, 1600, 'Latviešu');
    prog(lkakult, 'Kultūras vadība',                  MAG, 2, 1800, 'Latviešu');
    prog(lkakult, 'Teātra zinātne',                   MAG, 2, 1800, 'Latviešu');

    // ── 15. Vidzemes Augstskola ───────────────────────────────
    const via = ins('Vidzemes Augstskola', 'Valmiera', 'https://www.va.lv',
      'Reģionālā augstskola Vidzemē, dibināta 1996. gadā. Specializējas komunikācijā, informācijas tehnoloģijās, tūrismā, uzņēmējdarbībā un spēļu realitātē.', 15,
      'https://www.researchlatvia.gov.lv/sites/default/files/styles/article_embed_image/public/2024-06/ViA.jpg?itok=8fzGQHSy');
    prog(via, 'Informācijas tehnoloģijas', BAK, 3, 1600, 'Latviešu');
    prog(via, 'Komunikācija un mediji',    BAK, 3, 1500, 'Latviešu');
    prog(via, 'Tūrisma vadība',            BAK, 3, 1500, 'Latviešu');
    prog(via, 'Uzņēmējdarbības vadība',   BAK, 3, 1500, 'Latviešu');
    prog(via, 'Informācijas tehnoloģijas', MAG, 2, 1800, 'Latviešu/Angļu');
    prog(via, 'Komunikācija',              MAG, 2, 1700, 'Latviešu');

    // ── 16. Rēzeknes Tehnoloģiju akadēmija ───────────────────
    const rta = ins('Rēzeknes Tehnoloģiju akadēmija', 'Rēzekne', 'https://www.rta.lv',
      'Tehnoloģiju un mākslas akadēmija Latgalē, dibināta 1993. gadā. Piedāvā studijas inženierzinātnēs, pedagoģijā, mākslā un datorzinātnēs.', 16,
      'https://rsez.lv/wp-content/uploads/2023/08/2-scaled-e1699603766178.jpg');
    prog(rta, 'Datorzinātnes',          BAK, 4, 1500, 'Latviešu');
    prog(rta, 'Inženiermehānika',       BAK, 4, 1400, 'Latviešu');
    prog(rta, 'Pedagoģija',             BAK, 4, 1300, 'Latviešu');
    prog(rta, 'Dizains',                BAK, 4, 1500, 'Latviešu');
    prog(rta, 'Uzņēmējdarbības vadība', BAK, 3, 1400, 'Latviešu');

    // ── 17. Transporta un sakaru institūts (TSI) ─────────────
    const tsi = ins('Transporta un sakaru institūts', 'Rīga', 'https://www.tsi.lv',
      'Privātā augstskola ar specializāciju transporta, loģistikas, IT un telekomunikāciju jomā, dibināta 1919. gadā. Piedāvā studijas latviešu, krievu un angļu valodā.', 17,
      'https://www.lk-group.lv/site-files/gallery/2020-06/1591340400_7b8e2c38293a7b22f00afb5a50df09ff.jpg');
    prog(tsi, 'Datorzinātnes',                      BAK, 4, 2200, 'Latviešu/Krievu');
    prog(tsi, 'Loģistika un piegādes ķēžu vadība', BAK, 4, 2000, 'Latviešu/Krievu');
    prog(tsi, 'Aviācijas transports',               BAK, 4, 2400, 'Angļu');
    prog(tsi, 'Elektronika un telekomunikācijas',   BAK, 4, 2200, 'Latviešu/Krievu');
    prog(tsi, 'Uzņēmējdarbības vadība',            BAK, 4, 2000, 'Latviešu/Krievu');
    prog(tsi, 'Datorzinātnes',                      MAG, 2, 2400, 'Latviešu/Krievu');
    prog(tsi, 'Loģistika un piegādes ķēžu vadība', MAG, 2, 2200, 'Latviešu/Krievu');

    // ── 18. Ventspils Augstskola ──────────────────────────────
    const vea = ins('Ventspils Augstskola', 'Ventspils', 'https://www.venta.lv',
      'Reģionālā augstskola Ventspilī, dibināta 1997. gadā. Specializējas tulkošanā, informācijas tehnoloģijās, starptautiskajās attiecībās un uzņēmējdarbībā.', 18,
      'https://www.researchlatvia.gov.lv/sites/default/files/styles/article_embed_image/public/2024-06/vea.PNG?itok=2FEZy82x');
    prog(vea, 'Tulkošana (angļu/vācu/franču)', BAK, 3, 1800, 'Latviešu/Angļu');
    prog(vea, 'Informācijas tehnoloģijas',      BAK, 3, 1700, 'Latviešu');
    prog(vea, 'Starptautiskās attiecības',       BAK, 3, 1800, 'Latviešu');
    prog(vea, 'Uzņēmējdarbības vadība',         BAK, 3, 1700, 'Latviešu');
    prog(vea, 'Tulkošana',                       MAG, 2, 2000, 'Latviešu/Angļu');

    // ── 19. Baltic International Academy (BIA) ───────────────
    const bia = ins('Baltic International Academy', 'Rīga', 'https://www.bsa.edu.lv',
      'Starptautiska privātā augstskola, dibināta 1992. gadā. Daudzvalodu studiju vide — latviešu, krievu un angļu valodā. Piedāvā studijas tiesībās, ekonomikā, vadībzinātnē un IT.', 19,
      'https://www.lk-group.lv/images/cobalt_thumbs/image/861/8879c6b2c2869518dbf22a6d5d43b9ed.jpg');
    prog(bia, 'Tiesību zinātne',        BAK, 4, 1800, 'Latviešu/Krievu/Angļu');
    prog(bia, 'Uzņēmējdarbības vadība', BAK, 3, 1700, 'Latviešu/Krievu');
    prog(bia, 'Datorzinātnes',          BAK, 4, 1900, 'Latviešu/Krievu');
    prog(bia, 'Psiholoģija',            BAK, 3, 1900, 'Latviešu/Krievu');
    prog(bia, 'Sociālais darbs',        BAK, 3, 1600, 'Latviešu/Krievu');
    prog(bia, 'Tiesību zinātne',        MAG, 2, 2000, 'Latviešu/Krievu/Angļu');

    // ── 20. Rīgas Ziemeļvalstu augstskola (ISMA) ─────────────
    // Nosaukums mainīts 24.08.2025.
    const isma = ins('Rīgas Ziemeļvalstu augstskola (ISMA)', 'Rīga', 'https://www.isma.lv',
      'Privāta augstskola (līdz 2025. gadam — ISMA) ar specializāciju uzņēmumu vadībā, mārketingā, informācijas tehnoloģijās un psiholoģijā. Mācības latviešu un krievu valodā.', 20,
      'https://cukursaldi.lv/wp-content/uploads/2025/02/ISMA-e1739369285324.jpg');
    prog(isma, 'Uzņēmumu vadība',                   BAK, 3, 1900, 'Latviešu/Krievu');
    prog(isma, 'Informācijas sistēmas',             BAK, 4, 2000, 'Latviešu/Krievu');
    prog(isma, 'Bezpilota sistēmu programmēšana',   BAK, 4, 2100, 'Latviešu/Krievu');
    prog(isma, 'Psiholoģija',                       BAK, 3, 2000, 'Latviešu/Krievu');
    prog(isma, 'Uzņēmumu vadība',                   MAG, 2, 2100, 'Latviešu/Krievu');
    prog(isma, 'Psiholoģija',                       MAG, 2, 2200, 'Latviešu/Krievu');

    // ── 21. Ekonomikas un kultūras augstskola (EKA) ──────────
    const eka = ins('Ekonomikas un kultūras augstskola', 'Rīga', 'https://www.eka.edu.lv',
      'Privāta augstskola, kas piedāvā studijas ekonomikā, kultūras vadībā, tiesībās un uzņēmējdarbībā latviešu un krievu valodā.', 21,
      'https://www.hotelamella.lv/wp-content/uploads/sites/115/2024/09/eka.jpg');
    prog(eka, 'Ekonomika',       BAK, 3, 1700, 'Latviešu/Krievu');
    prog(eka, 'Kultūras vadība', BAK, 3, 1600, 'Latviešu/Krievu');
    prog(eka, 'Tiesību zinātne', BAK, 4, 1800, 'Latviešu/Krievu');
    prog(eka, 'Uzņēmējdarbība', BAK, 3, 1700, 'Latviešu/Krievu');
    prog(eka, 'Uzņēmējdarbība', MAG, 2, 1900, 'Latviešu/Krievu');

    // ── 22. Eiropas Kristīgā akadēmija ───────────────────────
    const lkristiga = ins('Eiropas Kristīgā akadēmija', 'Jūrmala', 'https://www.kra.lv',
      'Privāta augstskola ar kristīgu ievirzi, kas piedāvā studijas teoloģijā, sociālajā darbā un pedagoģijā.', 22,
      'https://www.jurmala.lv/files/jurmala-s3/s3fs-public/styles/50_style/public/gallery_images/kristiga_akademija.jpg?itok=MjGa2Awv');
    prog(lkristiga, 'Teoloģija',      BAK, 4, 1200, 'Latviešu');
    prog(lkristiga, 'Sociālais darbs', BAK, 3, 1200, 'Latviešu');
    prog(lkristiga, 'Pedagoģija',      BAK, 4, 1200, 'Latviešu');

    // ── 23. Latvijas Sporta pedagoģijas akadēmija ────────────
    // No 01.07.2024. pievienota RSU. Saglabāta vēsturiskajiem datiem.
    const lspa = ins('Latvijas Sporta pedagoģijas akadēmija', 'Rīga', 'https://www.lspa.lv',
      'Specializēta augstskola sporta zinātnē, fiziskajā audzināšanā un veselības izglītībā. No 2024. gada 1. jūlija pievienota Rīgas Stradiņa universitātei.', 23,
      'https://enciklopedija.lv/api/image/thumbnail?name=d996465d5be9-86ef50d0-e6cc-41ca-9ad4-7a9d307bfb66.jpg&size=title');
    prog(lspa, 'Sports un fiziskā audzināšana',    BAK, 3, 1500, 'Latviešu');
    prog(lspa, 'Sporta zinātne',                    BAK, 3, 1500, 'Latviešu');
    prog(lspa, 'Sporta un izglītības speciālists',  BAK, 2, 1500, 'Latviešu');
    prog(lspa, 'Sporta zinātne',                    MAG, 2, 1700, 'Latviešu');

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
