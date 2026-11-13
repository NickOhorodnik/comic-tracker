export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * Google Apps Script для "Моя бібліотека коміксів"
 * Підтримує всі таблиці:
 * COMICS, COLLECTIONS, TAGS, PUBLISHERS, PRIORITIES, STATUSES, SETTINGS
 *
 * СТРУКТУРА ПАПОК:
 * 1. Окрема сторінка (sheet) "COLLECTIONS": кожна папка зберігається як окремий рядок
 *    [id, name, comic_ids, created_at, updated_at]
 * 2. У таблиці "COMICS" додано колонку "folders": у клітинці рядка коміксу записано
 *    список назв папок, у яких він знаходиться (наприклад: "Marvel, Улюблені")
 */

function doGet(e) {
  try {
    var ss = getSpreadsheet(e);
    initSheetsIfMissing(ss);

    var comicsSheet = ss.getSheetByName("COMICS");
    var collectionsSheet = ss.getSheetByName("COLLECTIONS");

    var comics = getSheetData(comicsSheet);
    var collections = getSheetData(collectionsSheet);

    // Зчитуємо папки з окремої сторінки COLLECTIONS
    var collectionsMap = {};
    for (var cIdx = 0; cIdx < collections.length; cIdx++) {
      var rawCol = collections[cIdx];
      var cName = String(rawCol.name || "").trim();
      if (!cName) continue;
      var cIds = [];
      if (typeof rawCol.comic_ids === "string") {
        try {
          cIds = JSON.parse(rawCol.comic_ids);
        } catch(errJson) {
          cIds = rawCol.comic_ids.split(",").map(function(s) { return s.trim(); }).filter(Boolean);
        }
      } else if (Array.isArray(rawCol.comic_ids)) {
        cIds = rawCol.comic_ids;
      }
      collectionsMap[cName.toLowerCase()] = {
        id: String(rawCol.id || ("col_" + (cIdx + 1))),
        name: cName,
        comic_ids: cIds,
        created_at: rawCol.created_at || new Date().toISOString(),
        updated_at: rawCol.updated_at || new Date().toISOString()
      };
    }

    // Перетворюємо комікси (tags та folders)
    var formattedComics = comics.map(function(item) {
      if (typeof item.tags === 'string') {
        try {
          item.tags = JSON.parse(item.tags);
        } catch(e) {
          item.tags = item.tags.split(',').map(function(t) { return t.trim(); }).filter(Boolean);
        }
      }
      if (!Array.isArray(item.tags)) {
        item.tags = [];
      }

      // Обробка колонки folders для кожного коміксу
      var comicFolders = [];
      if (typeof item.folders === 'string') {
        try {
          comicFolders = JSON.parse(item.folders);
        } catch(e) {
          comicFolders = item.folders.split(',').map(function(f) { return f.trim(); }).filter(Boolean);
        }
      } else if (Array.isArray(item.folders)) {
        comicFolders = item.folders;
      }
      item.folders = comicFolders;

      // Синхронізуємо зі словником collectionsMap
      var cId = String(item.id || "");
      if (cId && comicFolders.length > 0) {
        comicFolders.forEach(function(fName) {
          var fKey = fName.trim().toLowerCase();
          if (collectionsMap[fKey]) {
            if (collectionsMap[fKey].comic_ids.indexOf(cId) === -1) {
              collectionsMap[fKey].comic_ids.push(cId);
            }
          }
          // ПАПКИ БІЛЬШЕ НЕ СТВОРЮЮТЬСЯ АВТОМАТИЧНО: 
          // Якщо папки немає в COLLECTIONS, ми просто пропускаємо її.
          // Папки створюються тільки вручну через інтерфейс (action: "addCollection").
        });
      }

      item.current_page = item.current_page !== undefined && item.current_page !== null && item.current_page !== "" ? Number(item.current_page) : null;
      item.total_issues = item.total_issues !== undefined && item.total_issues !== null && item.total_issues !== "" ? Number(item.total_issues) : null;
      item.priority_order = item.priority_order ? Number(item.priority_order) : 3;
      item.progress_updated_at = item.progress_updated_at || item.updated_at || new Date().toISOString();
      item.last_read_at = item.last_read_at || null;
      return item;
    });

    var formattedCollections = Object.keys(collectionsMap).map(function(k) {
      return collectionsMap[k];
    });

    var tags = getSheetData(ss.getSheetByName("TAGS"));
    var publishers = getSheetData(ss.getSheetByName("PUBLISHERS"));
    var priorities = getSheetData(ss.getSheetByName("PRIORITIES"));
    var statuses = getSheetData(ss.getSheetByName("STATUSES"));
    var settings = getSheetData(ss.getSheetByName("SETTINGS"));

    return respondJson({
      success: true,
      data: {
        comics: formattedComics,
        collections: formattedCollections,
        tags: tags,
        publishers: publishers,
        priorities: priorities,
        statuses: statuses,
        settings: settings
      }
    });
  } catch (err) {
    return respondJson({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    var ss = getSpreadsheet(e);
    initSheetsIfMissing(ss);

    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    var action = body.action || "get";

    if (action === "init") {
      initSheetsIfMissing(ss, true);
      return respondJson({ success: true, message: "Таблиці успішно ініціалізовано" });
    }

    if (action === "addComic") {
      var comic = body.comic;
      var sheet = ss.getSheetByName("COMICS");
      appendComicRow(sheet, comic);
      return respondJson({ success: true, comic: comic });
    }

    if (action === "updateComic") {
      var comic = body.comic;
      var sheet = ss.getSheetByName("COMICS");
      var updated = updateComicRow(sheet, comic);
      return respondJson({ success: updated, comic: comic });
    }

    if (action === "quickProgress") {
      var sheet = ss.getSheetByName("COMICS");
      var updated = updateQuickProgress(sheet, body);
      return respondJson({ success: updated });
    }

    if (action === "deleteComic") {
      var comicId = body.id;
      var sheet = ss.getSheetByName("COMICS");
      var deleted = deleteRowById(sheet, comicId);
      return respondJson({ success: deleted, id: comicId });
    }

    // 1. Створення папки: додає рядок на сторінку COLLECTIONS
    if (action === "addCollection") {
      var col = body.collection;
      var colSheet = ss.getSheetByName("COLLECTIONS");
      if (colSheet) {
        appendCollectionRow(colSheet, col);
      }
      return respondJson({ success: true, collection: col });
    }

    // 2. Оновлення папки та її складу: оновлює COLLECTIONS та колонку folders у COMICS
    if (action === "updateCollection") {
      var col = body.collection;
      var colSheet = ss.getSheetByName("COLLECTIONS");
      if (colSheet) {
        updateCollectionRow(colSheet, col);
      }
      // Оновлюємо колонку folders у таблиці COMICS
      var comicsSheet = ss.getSheetByName("COMICS");
      if (comicsSheet) {
        syncFolderToComicsColumn(comicsSheet, col);
      }
      return respondJson({ success: true, collection: col });
    }

    // 3. Перейменування папки: оновлює назву в COLLECTIONS та колонку folders у COMICS
    if (action === "renameCollection") {
      var colId = body.id;
      var oldName = String(body.oldName || "").trim();
      var newName = String(body.newName || "").trim();
      var colSheet = ss.getSheetByName("COLLECTIONS");
      if (colSheet) {
        renameCollectionRow(colSheet, colId, newName);
      }
      var comicsSheet = ss.getSheetByName("COMICS");
      if (comicsSheet && oldName && newName) {
        renameFolderInComicsColumn(comicsSheet, oldName, newName);
      }
      return respondJson({ success: true, newName: newName });
    }

    // 4. Видалення папки: видаляє рядок з COLLECTIONS та з колонки folders у COMICS
    if (action === "deleteCollection") {
      var colId = body.id;
      var folderName = String(body.name || "").trim();
      var colSheet = ss.getSheetByName("COLLECTIONS");
      if (colSheet) {
        deleteRowById(colSheet, colId);
      }
      var comicsSheet = ss.getSheetByName("COMICS");
      if (comicsSheet && folderName) {
        removeFolderFromComicsColumn(comicsSheet, folderName);
      }
      return respondJson({ success: true, id: colId });
    }

    if (action === "addTag") {
      var tag = body.tag;
      var sheet = ss.getSheetByName("TAGS");
      var existingData = getSheetData(sheet);
      var exists = false;
      var lowerName = (tag.name || "").toString().trim().toLowerCase();
      for (var i = 0; i < existingData.length; i++) {
        if (String(existingData[i].id) === String(tag.id) ||
            String(existingData[i].name).trim().toLowerCase() === lowerName) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        sheet.appendRow([tag.id, tag.name, tag.created_at || new Date().toISOString()]);
      }
      return respondJson({ success: true, tag: tag });
    }

    if (action === "addPublisher") {
      var pub = body.publisher;
      var sheet = ss.getSheetByName("PUBLISHERS");
      var existingPubData = getSheetData(sheet);
      var pubExists = false;
      var lowerPubName = (pub.name || "").toString().trim().toLowerCase();
      for (var p = 0; p < existingPubData.length; p++) {
        if (String(existingPubData[p].id) === String(pub.id) ||
            String(existingPubData[p].name).trim().toLowerCase() === lowerPubName) {
          pubExists = true;
          break;
        }
      }
      if (!pubExists) {
        sheet.appendRow([pub.id, pub.name, pub.created_at || new Date().toISOString()]);
      }
      return respondJson({ success: true, publisher: pub });
    }

    // Повна синхронізація
    if (action === "syncAll") {
      var sheetComics = ss.getSheetByName("COMICS");
      if (body.comics && Array.isArray(body.comics)) {
        sheetComics.clearContents();
        sheetComics.appendRow(getComicsHeaders());
        body.comics.forEach(function(c) {
          appendComicRow(sheetComics, c);
        });
      }

      if (body.collections && Array.isArray(body.collections)) {
        var sheetCols = ss.getSheetByName("COLLECTIONS");
        sheetCols.clearContents();
        sheetCols.appendRow(["id", "name", "comic_ids", "created_at", "updated_at"]);
        body.collections.forEach(function(c) {
          appendCollectionRow(sheetCols, c);
        });
      }

      if (body.tags && Array.isArray(body.tags)) {
        var sheetTags = ss.getSheetByName("TAGS");
        var existingTagRows = getSheetData(sheetTags);
        var tagMapById = {};
        var tagMapByName = {};
        for (var tIdx = 0; tIdx < existingTagRows.length; tIdx++) {
          var tRow = existingTagRows[tIdx];
          if (tRow.id) tagMapById[String(tRow.id)] = true;
          if (tRow.name) tagMapByName[String(tRow.name).trim().toLowerCase()] = true;
        }

        body.tags.forEach(function(t) {
          if (!t || !t.name) return;
          var tId = String(t.id || "");
          var tName = String(t.name).trim();
          var tLower = tName.toLowerCase();

          if (!tagMapById[tId] && !tagMapByName[tLower]) {
            sheetTags.appendRow([tId || ("tag_" + Date.now()), tName, t.created_at || new Date().toISOString()]);
            if (tId) tagMapById[tId] = true;
            tagMapByName[tLower] = true;
          }
        });
      }

      if (body.publishers && Array.isArray(body.publishers)) {
        var sheetPubs = ss.getSheetByName("PUBLISHERS");
        var existingPubRows = getSheetData(sheetPubs);
        var pubMapById = {};
        var pubMapByName = {};
        for (var pIdx = 0; pIdx < existingPubRows.length; pIdx++) {
          var pRow = existingPubRows[pIdx];
          if (pRow.id) pubMapById[String(pRow.id)] = true;
          if (pRow.name) pubMapByName[String(pRow.name).trim().toLowerCase()] = true;
        }

        body.publishers.forEach(function(p) {
          if (!p || !p.name) return;
          var pId = String(p.id || "");
          var pName = String(p.name).trim();
          var pLower = pName.toLowerCase();

          if (!pubMapById[pId] && !pubMapByName[pLower]) {
            sheetPubs.appendRow([pId || ("pub_" + Date.now()), pName, p.created_at || new Date().toISOString()]);
            if (pId) pubMapById[pId] = true;
            pubMapByName[pLower] = true;
          }
        });
      }

      return respondJson({ success: true, message: "Повна синхронізація завершена" });
    }

    return respondJson({ success: false, error: "Невідома дія: " + action });
  } catch (err) {
    return respondJson({ success: false, error: err.toString() });
  }
}

function getComicsHeaders() {
  return [
    "id","title","cover_url","series_url","reading_url",
    "current_issue","current_page","total_issues","publisher",
    "priority","priority_order","status","tags","folders","note",
    "source_domain","created_at","updated_at","progress_updated_at","last_read_at"
  ];
}

function getSpreadsheet(e) {
  var ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch(err) {}

  if (!ss && e) {
    var idOrUrl = "";
    if (e.parameter) {
      idOrUrl = e.parameter.spreadsheetId || e.parameter.sheetId || e.parameter.sheetUrl || e.parameter.spreadsheetUrl;
    }
    if (!idOrUrl && e.postData && e.postData.contents) {
      try {
        var parsed = JSON.parse(e.postData.contents);
        idOrUrl = parsed.spreadsheetId || parsed.sheetId || parsed.sheetUrl;
      } catch(pErr) {}
    }
    if (idOrUrl) {
      try {
        if (idOrUrl.indexOf("http") === 0) {
          ss = SpreadsheetApp.openByUrl(idOrUrl);
        } else {
          ss = SpreadsheetApp.openById(idOrUrl);
        }
      } catch(openErr) {}
    }
  }

  if (!ss) {
    throw new Error("Не знайдено активну таблицю Google Sheets. Переконайтеся, що ви відкрили таблицю і в меню натиснули «Розширення» -> «Apps Script».");
  }
  return ss;
}

function respondJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var rowObj = {};
    for (var j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = data[i][j];
    }
    if (rowObj.id || rowObj.key || rowObj.name) {
      rows.push(rowObj);
    }
  }
  return rows;
}

function formatFoldersCell(folders) {
  if (Array.isArray(folders)) {
    return folders.join(", ");
  }
  return String(folders || "");
}

function parseFoldersCell(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  var str = String(val).trim();
  if (!str) return [];
  try {
    var parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed;
  } catch(e) {}
  return str.split(",").map(function(s) { return s.trim(); }).filter(Boolean);
}

function buildComicRowByHeaders(headers, c, existingRow) {
  var tagsStr = Array.isArray(c.tags) ? JSON.stringify(c.tags) : (c.tags || "[]");
  var foldersIdx = headers.indexOf("folders");
  var foldersStr = c.folders !== undefined
    ? formatFoldersCell(c.folders)
    : (existingRow && foldersIdx !== -1 ? (existingRow[foldersIdx] || "") : "");

  var nowIso = new Date().toISOString();
  var createdIdx = headers.indexOf("created_at");
  var progIdx = headers.indexOf("progress_updated_at");
  var lastReadIdx = headers.indexOf("last_read_at");

  var existingCreated = existingRow && createdIdx !== -1 ? existingRow[createdIdx] : "";
  var existingProgUpdated = existingRow && progIdx !== -1 ? existingRow[progIdx] : "";
  var existingLastRead = existingRow && lastReadIdx !== -1 ? existingRow[lastReadIdx] : "";

  var fieldMap = {
    id: c.id || Utilities.getUuid(),
    title: c.title || "",
    cover_url: c.cover_url || "",
    series_url: c.series_url || "",
    reading_url: c.reading_url || "",
    current_issue: c.current_issue || "",
    current_page: c.current_page !== null && c.current_page !== undefined ? c.current_page : "",
    total_issues: c.total_issues !== null && c.total_issues !== undefined ? c.total_issues : "",
    publisher: c.publisher || (existingRow ? "" : "Marvel Comics"),
    priority: c.priority || (existingRow ? "" : "3 Звичайний"),
    priority_order: c.priority_order || 3,
    status: c.status || (existingRow ? "" : "Хочу прочитати"),
    tags: tagsStr,
    folders: foldersStr,
    note: c.note || "",
    source_domain: c.source_domain || "",
    created_at: existingCreated || c.created_at || nowIso,
    updated_at: c.updated_at || nowIso,
    progress_updated_at: c.progress_updated_at || existingProgUpdated || c.updated_at || nowIso,
    last_read_at: c.last_read_at !== undefined && c.last_read_at !== null ? c.last_read_at : (existingLastRead || "")
  };

  return headers.map(function(h, idx) {
    if (Object.prototype.hasOwnProperty.call(fieldMap, h)) {
      return fieldMap[h];
    }
    return existingRow && existingRow[idx] !== undefined ? existingRow[idx] : "";
  });
}

function appendComicRow(sheet, c) {
  var lastCol = sheet.getLastColumn();
  var headers = lastCol > 0
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim(); })
    : getComicsHeaders();
  if (headers.length === 0 || !headers[0]) {
    headers = getComicsHeaders();
  }
  sheet.appendRow(buildComicRowByHeaders(headers, c, null));
}

function updateComicRow(sheet, c) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var idCol = headers.indexOf("id");
  if (idCol === -1) return false;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(c.id)) {
      var rowIndex = i + 1;
      var rowValues = buildComicRowByHeaders(headers, c, data[i]);
      sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      return true;
    }
  }
  return false;
}

function updateQuickProgress(sheet, body) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var idCol = headers.indexOf("id");
  var issueCol = headers.indexOf("current_issue");
  var pageCol = headers.indexOf("current_page");
  var readingCol = headers.indexOf("reading_url");
  var statusCol = headers.indexOf("status");
  var updatedCol = headers.indexOf("updated_at");
  var progUpdatedCol = headers.indexOf("progress_updated_at");
  var lastReadCol = headers.indexOf("last_read_at");

  var nowIso = new Date().toISOString();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(body.id)) {
      var rowIndex = i + 1;
      if (issueCol !== -1 && body.current_issue !== undefined) {
        sheet.getRange(rowIndex, issueCol + 1).setValue(body.current_issue);
      }
      if (pageCol !== -1 && body.current_page !== undefined) {
        sheet.getRange(rowIndex, pageCol + 1).setValue(body.current_page !== null ? body.current_page : "");
      }
      if (readingCol !== -1 && body.reading_url !== undefined) {
        sheet.getRange(rowIndex, readingCol + 1).setValue(body.reading_url);
      }
      if (statusCol !== -1 && body.status !== undefined) {
        sheet.getRange(rowIndex, statusCol + 1).setValue(body.status);
      }
      if (updatedCol !== -1) {
        sheet.getRange(rowIndex, updatedCol + 1).setValue(nowIso);
      }
      if (progUpdatedCol !== -1) {
        sheet.getRange(rowIndex, progUpdatedCol + 1).setValue(nowIso);
      }
      if (lastReadCol !== -1) {
        sheet.getRange(rowIndex, lastReadCol + 1).setValue(nowIso);
      }
      return true;
    }
  }
  return false;
}

function appendCollectionRow(sheet, col) {
  var cidsStr = Array.isArray(col.comic_ids) ? JSON.stringify(col.comic_ids) : "[]";
  sheet.appendRow([
    col.id || ("col_" + Date.now()),
    col.name || "",
    cidsStr,
    col.created_at || new Date().toISOString(),
    col.updated_at || new Date().toISOString()
  ]);
}

function updateCollectionRow(sheet, col) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    appendCollectionRow(sheet, col);
    return true;
  }
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var idCol = headers.indexOf("id");
  var nameCol = headers.indexOf("name");
  var cidsCol = headers.indexOf("comic_ids");
  var updatedCol = headers.indexOf("updated_at");

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(col.id) || String(data[i][nameCol]).trim().toLowerCase() === String(col.name).trim().toLowerCase()) {
      var rowIndex = i + 1;
      var cidsStr = Array.isArray(col.comic_ids) ? JSON.stringify(col.comic_ids) : "[]";
      if (nameCol !== -1) sheet.getRange(rowIndex, nameCol + 1).setValue(col.name);
      if (cidsCol !== -1) sheet.getRange(rowIndex, cidsCol + 1).setValue(cidsStr);
      if (updatedCol !== -1) sheet.getRange(rowIndex, updatedCol + 1).setValue(new Date().toISOString());
      return true;
    }
  }
  appendCollectionRow(sheet, col);
  return true;
}

function renameCollectionRow(sheet, id, newName) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var idCol = headers.indexOf("id");
  var nameCol = headers.indexOf("name");
  var updatedCol = headers.indexOf("updated_at");

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      var rowIndex = i + 1;
      if (nameCol !== -1) sheet.getRange(rowIndex, nameCol + 1).setValue(newName);
      if (updatedCol !== -1) sheet.getRange(rowIndex, updatedCol + 1).setValue(new Date().toISOString());
      return true;
    }
  }
  return false;
}

function deleteRowById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;
  var idCol = data[0].indexOf("id");
  if (idCol === -1) return false;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

// Оновлення колонки folders у таблиці COMICS для папки
function syncFolderToComicsColumn(comicsSheet, col) {
  var data = comicsSheet.getDataRange().getValues();
  if (data.length <= 1) return;
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var idColIdx = headers.indexOf("id");
  var foldersColIdx = headers.indexOf("folders");
  if (idColIdx === -1 || foldersColIdx === -1) return;

  var folderName = String(col.name || "").trim();
  var comicIds = Array.isArray(col.comic_ids) ? col.comic_ids : [];
  var idSet = {};
  comicIds.forEach(function(cid) { idSet[String(cid)] = true; });

  for (var i = 1; i < data.length; i++) {
    var cId = String(data[i][idColIdx] || "");
    var curFolders = parseFoldersCell(data[i][foldersColIdx]);
    var shouldBeIn = Boolean(idSet[cId]);
    var isCurrentlyIn = curFolders.indexOf(folderName) !== -1;

    if (shouldBeIn && !isCurrentlyIn) {
      curFolders.push(folderName);
      comicsSheet.getRange(i + 1, foldersColIdx + 1).setValue(curFolders.join(", "));
    } else if (!shouldBeIn && isCurrentlyIn) {
      curFolders = curFolders.filter(function(fn) { return fn !== folderName; });
      comicsSheet.getRange(i + 1, foldersColIdx + 1).setValue(curFolders.join(", "));
    }
  }
}

// Перейменування назви папки в колонці folders для всіх коміксів
function renameFolderInComicsColumn(comicsSheet, oldName, newName) {
  var data = comicsSheet.getDataRange().getValues();
  if (data.length <= 1) return;
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var foldersColIdx = headers.indexOf("folders");
  if (foldersColIdx === -1) return;

  for (var i = 1; i < data.length; i++) {
    var curFolders = parseFoldersCell(data[i][foldersColIdx]);
    var idx = curFolders.indexOf(oldName);
    if (idx !== -1) {
      curFolders[idx] = newName;
      comicsSheet.getRange(i + 1, foldersColIdx + 1).setValue(curFolders.join(", "));
    }
  }
}

// Видалення назви папки з колонки folders для всіх коміксів
function removeFolderFromComicsColumn(comicsSheet, folderName) {
  var data = comicsSheet.getDataRange().getValues();
  if (data.length <= 1) return;
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var foldersColIdx = headers.indexOf("folders");
  if (foldersColIdx === -1) return;

  for (var i = 1; i < data.length; i++) {
    var curFolders = parseFoldersCell(data[i][foldersColIdx]);
    if (curFolders.indexOf(folderName) !== -1) {
      curFolders = curFolders.filter(function(fn) { return fn !== folderName; });
      comicsSheet.getRange(i + 1, foldersColIdx + 1).setValue(curFolders.join(", "));
    }
  }
}

function initSheetsIfMissing(ss, forceReset) {
  if (!ss) return;

  // 1. COMICS
  var sComics = ss.getSheetByName("COMICS");
  var standardHeaders = getComicsHeaders();
  if (!sComics) {
    sComics = ss.insertSheet("COMICS");
    sComics.appendRow(standardHeaders);
  } else {
    // Перевіряємо наявність колонки folders у існуючій таблиці
    var existingData = sComics.getDataRange().getValues();
    if (existingData.length > 0) {
      var headers = existingData[0].map(function(h) { return String(h).trim(); });
      if (headers.indexOf("folders") === -1) {
        var lastCol = sComics.getLastColumn();
        sComics.getRange(1, lastCol + 1).setValue("folders");
      }
    }
  }

  // 2. COLLECTIONS (окрема сторінка для папок)
  var sCollections = ss.getSheetByName("COLLECTIONS");
  if (!sCollections) {
    sCollections = ss.insertSheet("COLLECTIONS");
    sCollections.appendRow(["id", "name", "comic_ids", "created_at", "updated_at"]);
  }

  // 3. TAGS
  var sTags = ss.getSheetByName("TAGS");
  if (!sTags) {
    sTags = ss.insertSheet("TAGS");
    sTags.appendRow(["id","name","created_at"]);
    var defaultTags = ["Супергерої", "Детектив", "Фантастика", "Темне фентезі", "Класика", "Кросовер", "Нуар"];
    defaultTags.forEach(function(t, idx) {
      sTags.appendRow(["tag_" + (idx+1), t, new Date().toISOString()]);
    });
  }

  // 4. PUBLISHERS
  var sPubs = ss.getSheetByName("PUBLISHERS");
  if (!sPubs) {
    sPubs = ss.insertSheet("PUBLISHERS");
    sPubs.appendRow(["id","name","created_at"]);
    var defaultPubs = ["Marvel Comics", "DC Comics", "Image Comics", "Dark Horse Comics", "Інше"];
    defaultPubs.forEach(function(p, idx) {
      sPubs.appendRow(["pub_" + (idx+1), p, new Date().toISOString()]);
    });
  }

  // 5. PRIORITIES
  var sPrio = ss.getSheetByName("PRIORITIES");
  if (!sPrio) {
    sPrio = ss.insertSheet("PRIORITIES");
    sPrio.appendRow(["id","name","description","sort_order"]);
    var defaultPrios = [
      ["p1", "1 Обов'язково", "Читати в першу чергу", 1],
      ["p2", "2 Високий", "Високий пріоритет", 2],
      ["p3", "3 Звичайний", "Стандартний пріоритет", 3],
      ["p4", "4 Низький", "За наявності вільного часу", 4],
      ["p5", "5 Колись", "Віддалені плани", 5]
    ];
    defaultPrios.forEach(function(p) {
      sPrio.appendRow(p);
    });
  }

  // 6. STATUSES
  var sStat = ss.getSheetByName("STATUSES");
  if (!sStat) {
    sStat = ss.insertSheet("STATUSES");
    sStat.appendRow(["id","name","sort_order"]);
    var defaultStats = [
      ["s1", "Хочу прочитати", 1],
      ["s2", "Читаю", 2],
      ["s3", "Прочитано", 3],
      ["s4", "Відкладено", 4],
      ["s5", "Кинуто", 5]
    ];
    defaultStats.forEach(function(s) {
      sStat.appendRow(s);
    });
  }

  // 7. SETTINGS
  var sSet = ss.getSheetByName("SETTINGS");
  if (!sSet) {
    sSet = ss.insertSheet("SETTINGS");
    sSet.appendRow(["key","value"]);
    sSet.appendRow(["app_version", "1.0.0"]);
    sSet.appendRow(["default_priority", "3 Звичайний"]);
    sSet.appendRow(["default_status", "Хочу прочитати"]);
    sSet.appendRow(["default_publisher", "Marvel Comics"]);
  }
}
`;
