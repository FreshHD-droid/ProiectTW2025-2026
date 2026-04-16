/* ==============================================
   INDEX.JS — Server Express, Etapa 4
   Apex Auto Shop
   ============================================== */

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 8080;

// ------------------------------------------
// Task 3: Afisare cai
// __dirname = folderul in care se afla index.js
// __filename = calea completa a fisierului index.js
// process.cwd() = folderul din care a fost lansat procesul node
// NU sunt intotdeauna identice: daca rulam "node subfolder/index.js"
// din alt director, process.cwd() va diferi de __dirname.
// ------------------------------------------
console.log("__dirname:", __dirname);
console.log("__filename:", __filename);
console.log("process.cwd():", process.cwd());

// ------------------------------------------
// Configurare EJS ca motor de vizualizare
// ------------------------------------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ------------------------------------------
// Task 6: Folder static pentru resurse
// ------------------------------------------
app.use("/resurse", express.static(path.join(__dirname, "resurse")));

// ------------------------------------------
// Task 20: Creare automata foldere generate
// ------------------------------------------
const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];

vect_foldere.forEach(function (folder) {
  const caleFull = path.join(__dirname, folder);
  if (!fs.existsSync(caleFull)) {
    fs.mkdirSync(caleFull, { recursive: true });
    console.log("Folder creat:", caleFull);
  }
});

// ------------------------------------------
// Task 13: Variabila globala obGlobal
// ------------------------------------------
const obGlobal = {
  obErori: null,
};

// ------------------------------------------
// Bonus: Validare structura erori.json
// ------------------------------------------

/**
 * Bonus 6: Verifica duplicate de proprietati in textul brut JSON.
 * JSON.parse ignora duplicatele (pastreaza ultima valoare),
 * asa ca trebuie sa verificam pe string, nu pe obiect.
 */
function verificaDuplicateProprietati(textJSON) {
  const probleme = [];
  let nivel = 0;
  const stivaObiecte = []; // stiva cu Set-uri de proprietati per obiect
  let i = 0;

  while (i < textJSON.length) {
    const ch = textJSON[i];

    // Sarim whitespace
    if (" \t\n\r".includes(ch)) {
      i++;
      continue;
    }

    // Deschidere obiect — cream un nivel nou
    if (ch === "{") {
      nivel++;
      stivaObiecte.push(new Set());
      i++;
      continue;
    }

    // Inchidere obiect — scoatem nivelul curent
    if (ch === "}") {
      stivaObiecte.pop();
      nivel--;
      i++;
      continue;
    }

    // Array brackets — le ignoram (nu au proprietati)
    if (ch === "[" || ch === "]") {
      i++;
      continue;
    }

    // String — il extragem complet
    if (ch === '"') {
      let str = "";
      i++; // sarim ghilimelele de deschidere
      while (i < textJSON.length) {
        if (textJSON[i] === "\\") {
          str += textJSON[i] + textJSON[i + 1];
          i += 2;
        } else if (textJSON[i] === '"') {
          i++; // sarim ghilimelele de inchidere
          break;
        } else {
          str += textJSON[i];
          i++;
        }
      }

      // Verificam daca urmeaza ':' (e cheie de proprietate)
      let j = i;
      while (j < textJSON.length && " \t\n\r".includes(textJSON[j])) j++;

      if (j < textJSON.length && textJSON[j] === ":") {
        const obiectCurent = stivaObiecte[stivaObiecte.length - 1];
        if (obiectCurent) {
          if (obiectCurent.has(str)) {
            probleme.push(
              `Proprietatea "${str}" apare de mai multe ori in acelasi obiect (nivel ${nivel})`
            );
          }
          obiectCurent.add(str);
        }
      }
      continue;
    }

    // Orice alt caracter (numere, virgule, true/false/null)
    i++;
  }

  return probleme;
}

/**
 * Task 13 + Bonus 1-7: Citeste si valideaza erori.json
 */
function initErori() {
  const caleJSON = path.join(__dirname, "erori.json");

  // Bonus 1: Verificam daca fisierul exista
  if (!fs.existsSync(caleJSON)) {
    console.error("EROARE CRITICA: Fisierul erori.json nu exista! Aplicatia se opreste.");
    process.exit(1);
  }

  const continutRaw = fs.readFileSync(caleJSON, "utf-8");

  // Bonus 6: Verificam duplicate de proprietati in textul brut
  const duplicateProps = verificaDuplicateProprietati(continutRaw);
  if (duplicateProps.length > 0) {
    console.error("AVERTISMENT: Proprietati duplicate gasite in erori.json:");
    duplicateProps.forEach(function (msg) {
      console.error("  -", msg);
    });
  }

  const dateErori = JSON.parse(continutRaw);

  // Bonus 2: Verificam proprietatile obligatorii de nivel superior
  const propObligatorii = ["cale_baza", "eroare_default", "info_erori"];
  propObligatorii.forEach(function (prop) {
    if (!(prop in dateErori)) {
      console.error(
        `EROARE: Proprietatea obligatorie "${prop}" lipseste din erori.json.`
      );
    }
  });

  // Bonus 3: Verificam campurile din eroare_default
  if (dateErori.eroare_default) {
    ["titlu", "text", "imagine"].forEach(function (camp) {
      if (!(camp in dateErori.eroare_default)) {
        console.error(
          `EROARE: Campul "${camp}" lipseste din eroare_default.`
        );
      }
    });
  }

  // Bonus 4: Verificam daca folderul cale_baza exista pe disc
  if (dateErori.cale_baza) {
    // cale_baza e cale web (ex: "/resurse/imagini/erori/"), o transformam in cale pe disc
    const caleBazaDisc = path.join(__dirname, dateErori.cale_baza);
    if (!fs.existsSync(caleBazaDisc)) {
      console.error(
        `EROARE: Folderul din cale_baza nu exista pe disc: ${caleBazaDisc}`
      );
    }
  }

  // Bonus 5: Verificam ca toate imaginile erorilor exista
  // + Setam cai absolute pentru imagine
  if (dateErori.eroare_default && dateErori.eroare_default.imagine) {
    const caleImgDefault = path.join(
      __dirname,
      dateErori.cale_baza,
      dateErori.eroare_default.imagine
    );
    if (!fs.existsSync(caleImgDefault)) {
      console.error(
        `EROARE: Imaginea erorii default nu exista: ${caleImgDefault}`
      );
    }
    // Setam calea web absoluta
    dateErori.eroare_default.imagine =
      dateErori.cale_baza + dateErori.eroare_default.imagine;
  }

  if (dateErori.info_erori && Array.isArray(dateErori.info_erori)) {
    // Bonus 7: Verificam identificatori duplicati
    const mapIdentificatori = {};
    dateErori.info_erori.forEach(function (eroare, index) {
      const id = eroare.identificator;
      if (mapIdentificatori[id] !== undefined) {
        const prima = dateErori.info_erori[mapIdentificatori[id]];
        console.error(
          `EROARE: Identificator duplicat "${id}" gasit in info_erori:` +
            `\n  - Prima aparitie: titlu="${prima.titlu}", text="${prima.text}", imagine="${prima.imagine}"` +
            `\n  - A doua aparitie: titlu="${eroare.titlu}", text="${eroare.text}", imagine="${eroare.imagine}"`
        );
      } else {
        mapIdentificatori[id] = index;
      }

      // Bonus 5: Verificam daca imaginea exista pe disc
      const caleImg = path.join(__dirname, dateErori.cale_baza, eroare.imagine);
      if (!fs.existsSync(caleImg)) {
        console.error(
          `EROARE: Imaginea pentru eroarea ${id} nu exista: ${caleImg}`
        );
      }

      // Setam calea web absoluta pentru imagine
      eroare.imagine = dateErori.cale_baza + eroare.imagine;
    });
  }

  obGlobal.obErori = dateErori;
  console.log("Sistemul de erori incarcat cu succes.");
}

// Initializam erorile la pornirea serverului
initErori();

// ------------------------------------------
// Task 14: Functia de afisare a erorilor
// ------------------------------------------

/**
 * Randeaza pagina de eroare cu datele corespunzatoare.
 * @param {object} res - obiectul Response din Express
 * @param {number} [identificator] - codul erorii (400, 403, 404, etc.)
 * @param {string} [titlu] - suprascrie titlul din JSON daca e dat
 * @param {string} [text] - suprascrie textul din JSON daca e dat
 * @param {string} [imagine] - suprascrie imaginea din JSON daca e data
 */
function afisareEroare(res, identificator, titlu, text, imagine) {
  const erori = obGlobal.obErori;

  // Cautam eroarea dupa identificator, sau folosim eroare_default
  let dateEroare = erori.eroare_default;
  let statusHTTP = 200;

  if (identificator && erori.info_erori) {
    const gasita = erori.info_erori.find(function (e) {
      return e.identificator === identificator;
    });
    if (gasita) {
      dateEroare = gasita;
      if (gasita.status) {
        statusHTTP = identificator; // codul HTTP = identificatorul erorii
      }
    }
  }

  // Argumentele explicite au prioritate asupra datelor din JSON
  const titluFinal = titlu || dateEroare.titlu;
  const textFinal = text || dateEroare.text;
  const imagineFinal = imagine || dateEroare.imagine;

  res.status(statusHTTP).render("pagini/eroare", {
    titlu: titluFinal,
    text: textFinal,
    imagine: imagineFinal,
  });
}

// ------------------------------------------
// Task 19: Ruta pentru favicon.ico
// ------------------------------------------
app.get("/favicon.ico", function (req, res) {
  res.sendFile(path.join(__dirname, "resurse", "ico", "favicon.ico"));
});

// ------------------------------------------
// Task 18: Blocare acces direct la fisiere .ejs → 400
// ------------------------------------------
app.use(function (req, res, next) {
  if (req.path.endsWith(".ejs")) {
    afisareEroare(res, 400);
  } else {
    next();
  }
});

// ------------------------------------------
// Task 17: Blocare acces la directoare din /resurse/ → 403
// Trebuie pus DUPA express.static ca sa prinda doar cererile
// catre foldere (fara fisier specificat).
// Daca calea se termina cu "/" e cerere de folder → 403.
// Daca nu, e un fisier care nu exista → lasam sa cada in 404.
// ------------------------------------------
app.get("/resurse/{*cale}", function (req, res) {
  if (req.path.endsWith("/")) {
    afisareEroare(res, 403); // cerere de folder → 403
  } else {
    afisareEroare(res, 404); // fisier inexistent → 404
  }
});

// ------------------------------------------
// Task 8: Pagina principala accesibila pe mai multe cai
// Folosim un vector de cai conform cerintei.
// ------------------------------------------
app.get(["/", "/index", "/home"], function (req, res) {
  res.render("pagini/index", { ip: req.ip });
});

// ------------------------------------------
// Task 15: Pagina suplimentara — Despre
// ------------------------------------------
app.get("/despre", function (req, res) {
  res.render("pagini/despre");
});

// ------------------------------------------
// Task 9 + 10: Ruta generica (catch-all)
// TREBUIE sa fie ULTIMA ruta declarata.
// Incearca sa randeze views/pagini/<pagina>.ejs
// In Express 5 sintaxa pentru catch-all e "{*param}"
// ------------------------------------------
app.get("/{*cale}", function (req, res) {
  // Extragem numele paginii din URL (fara slash-ul initial)
  const pagina = req.params.cale;

  res.render("pagini/" + pagina, function (eroare, rezultatRandare) {
    if (eroare) {
      if (eroare.message.startsWith("Failed to lookup view")) {
        // Pagina nu exista → 404
        afisareEroare(res, 404);
      } else {
        // Alta eroare de randare → eroare generica
        afisareEroare(res);
      }
    } else {
      res.send(rezultatRandare);
    }
  });
});

// ------------------------------------------
// Task 2: Pornire server
// ------------------------------------------
app.listen(PORT, function () {
  console.log(`Server Apex Auto Shop pornit: http://localhost:${PORT}`);
});
