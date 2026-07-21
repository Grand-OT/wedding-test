/**
 * Google Apps Script для связанной Google Таблицы.
 * Создайте лист с названием "Ответы" и вставьте этот файл в редактор Apps Script.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const params = (e && e.parameter) || {};

    // Поле-ловушка: обычный посетитель его не видит и не заполняет.
    if (params.website) {
      return jsonResponse({ ok: true });
    }

    const guestName = cleanCell(params.guestName, 100);
    if (!guestName) {
      return jsonResponse({ ok: false, error: "Не указано имя" });
    }

    const sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName("Ответы");

    if (!sheet) {
      throw new Error('Создайте лист с названием "Ответы"');
    }

    sheet.appendRow([
      new Date(),
      guestName,
      cleanCell(params.drinks, 300),
      cleanCell(params.food, 500),
      cleanCell(params.transfer, 20),
      cleanCell(params.message, 1000)
    ]);

    return jsonResponse({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function cleanCell(value, maxLength) {
  let text = String(value || "").trim().slice(0, maxLength);

  // Защита от интерпретации пользовательского текста как формулы таблицы.
  if (/^[=+\-@]/.test(text)) {
    text = "'" + text;
  }

  return text;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
