/**
 * SpreadsheetUtil.gs
 * スプレッドシート共通操作
 */

var SpreadsheetUtil = (function () {
  var _ss = null;

  // ── リクエスト内シートキャッシュ ─────────────────────────────
  // GAS は1リクエスト = 1実行環境のため、このキャッシュはリクエスト間で共有されない。
  // 同一リクエスト内で同じシートを複数回読む際の重複 I/O を排除する。
  var _rowsCache = {};

  function _invalidateCache(sheet) {
    delete _rowsCache[sheet.getSheetId()];
  }

  function _getSpreadsheet() {
    if (!_ss) {
      var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      _ss = SpreadsheetApp.openById(id);
    }
    return _ss;
  }

  /**
   * シート取得
   * @param {string} sheetName
   * @returns {GoogleAppsScript.Spreadsheet.Sheet}
   */
  function getSheet(sheetName) {
    var sheet = _getSpreadsheet().getSheetByName(sheetName);
    if (!sheet) throw new Error('シートが見つかりません: ' + sheetName);
    return sheet;
  }

  /**
   * 全行をオブジェクト配列で返す（1行目をヘッダとして使用）
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @returns {Object[]}
   */
  function getAllRows(sheet) {
    var cacheKey = sheet.getSheetId();
    if (_rowsCache[cacheKey]) return _rowsCache[cacheKey];

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      _rowsCache[cacheKey] = [];
      return [];
    }
    var headers = data[0];
    var tz = Session.getScriptTimeZone();
    var result = data.slice(1).map(function (row, i) {
      var obj = { _rowIndex: i + 2 };
      headers.forEach(function (h, j) {
        var v = row[j];
        // Date オブジェクトはスクリプトのタイムゾーンで YYYY-MM-DD に変換
        if (v instanceof Date && !isNaN(v.getTime())) {
          obj[h] = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
        } else {
          obj[h] = v;
        }
      });
      return obj;
    });
    _rowsCache[cacheKey] = result;
    return result;
  }

  /**
   * 特定フィールドで行検索
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {string} key
   * @param {*} value
   * @returns {Object[]}
   */
  function findRowsByField(sheet, key, value) {
    return getAllRows(sheet).filter(function (row) {
      return row[key] === value;
    });
  }

  /**
   * 行追加（ヘッダ順にマッピング）
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {Object} obj
   */
  function appendRow(sheet, obj) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var row = headers.map(function (h) {
      return obj[h] !== undefined ? obj[h] : '';
    });
    sheet.appendRow(row);
    _invalidateCache(sheet);
  }

  /**
   * IDフィールドで行を特定してから更新（ロック付き・行ズレ対策・楽観的ロック対応）
   *
   * ロック取得後に行番号を再検索するため、削除による行ズレや
   * 同時更新による上書きを防止する。
   *
   * expectedUpdatedAt を渡した場合は楽観的ロックが有効になる:
   *   - シートに updated_at 列が存在し、かつ現在値と expectedUpdatedAt が一致しない場合、
   *     code=409 のエラーを throw する。
   *   - 一致した場合（または expectedUpdatedAt が undefined の場合）は通常どおり更新し、
   *     updated_at 列があれば自動的に現在時刻（ISO文字列）で上書きする。
   *
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {string} idField           - IDとなるフィールド名
   * @param {*}     idValue           - IDの値
   * @param {Object} obj              - 更新するフィールドと値（存在するキーのみ更新）
   * @param {string} [expectedUpdatedAt] - 楽観的ロック用: 読み込み時の updated_at 値
   */
  function updateRowById(sheet, idField, idValue, obj, expectedUpdatedAt) {
    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var allData = sheet.getDataRange().getValues();
      var headers = allData[0];
      var colIndex = headers.indexOf(idField);
      if (colIndex === -1) throw new Error('フィールドが見つかりません: ' + idField);

      var rowIndex = -1;
      for (var i = 1; i < allData.length; i++) {
        if (String(allData[i][colIndex]) === String(idValue)) {
          rowIndex = i + 1;
          break;
        }
      }
      if (rowIndex === -1) throw new Error('行が見つかりません: ' + idField + '=' + idValue);

      var currentRow = allData[rowIndex - 1];
      var updatedAtColIndex = headers.indexOf('updated_at');

      // 楽観的ロックチェック（expectedUpdatedAt が指定され、かつ updated_at 列が存在する場合のみ）
      if (expectedUpdatedAt !== undefined && updatedAtColIndex !== -1) {
        var stored = currentRow[updatedAtColIndex];
        var storedStr = stored instanceof Date ? stored.toISOString() : String(stored);
        if (storedStr !== String(expectedUpdatedAt)) {
          var conflictErr = new Error('他のユーザーが更新しています。最新の内容を確認してから再度お試しください。');
          conflictErr.code = 409;
          throw conflictErr;
        }
      }

      // 既存行の値をベースに obj のフィールドだけ上書きし、1回の setValues で書き込む
      // updated_at 列があれば常に現在時刻で更新する
      var newRow = headers.map(function (h, j) {
        if (h === 'updated_at') return new Date().toISOString();
        return obj[h] !== undefined ? obj[h] : currentRow[j];
      });
      sheet.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
      _invalidateCache(sheet);
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * IDフィールドで行を特定してから削除（ロック付き・行ズレ対策）
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {string} idField
   * @param {*}     idValue
   */
  function deleteRowById(sheet, idField, idValue) {
    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var allData = sheet.getDataRange().getValues();
      var headers = allData[0];
      var colIndex = headers.indexOf(idField);
      if (colIndex === -1) throw new Error('フィールドが見つかりません: ' + idField);

      var rowIndex = -1;
      for (var i = 1; i < allData.length; i++) {
        if (String(allData[i][colIndex]) === String(idValue)) {
          rowIndex = i + 1;
          break;
        }
      }
      if (rowIndex === -1) throw new Error('行が見つかりません: ' + idField + '=' + idValue);
      sheet.deleteRow(rowIndex);
      _invalidateCache(sheet);
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * 特定フィールドが指定値に一致する行をすべて削除（ロック付き）
   * deleteByProjectId など複数行削除に使用する。
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {string} field
   * @param {*}     value
   */
  function deleteRowsByField(sheet, field, value) {
    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var allData = sheet.getDataRange().getValues();
      var headers = allData[0];
      var colIndex = headers.indexOf(field);
      if (colIndex === -1) throw new Error('フィールドが見つかりません: ' + field);

      var rowsToDelete = [];
      for (var i = 1; i < allData.length; i++) {
        if (String(allData[i][colIndex]) === String(value)) rowsToDelete.push(i + 1);
      }
      // 降順で削除することで行番号のズレを防ぐ
      rowsToDelete.sort(function (a, b) { return b - a; });
      rowsToDelete.forEach(function (rowIndex) { sheet.deleteRow(rowIndex); });
      _invalidateCache(sheet);
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * 複数フィールドの条件すべてに一致する行をすべて削除（ロック付き）
   * deleteByProjectIdAndRoomId など複合キーの削除に使用する。
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {Object} conditions - { fieldName: value, ... }
   */
  function deleteRowsByFields(sheet, conditions) {
    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var allData = sheet.getDataRange().getValues();
      var headers = allData[0];
      var condEntries = Object.keys(conditions).map(function (f) {
        var idx = headers.indexOf(f);
        if (idx === -1) throw new Error('フィールドが見つかりません: ' + f);
        return { colIndex: idx, value: String(conditions[f]) };
      });

      var rowsToDelete = [];
      for (var i = 1; i < allData.length; i++) {
        var match = condEntries.every(function (e) {
          return String(allData[i][e.colIndex]) === e.value;
        });
        if (match) rowsToDelete.push(i + 1);
      }
      rowsToDelete.sort(function (a, b) { return b - a; });
      rowsToDelete.forEach(function (rowIndex) { sheet.deleteRow(rowIndex); });
      _invalidateCache(sheet);
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * ユニークID生成
   * @param {string} prefix
   * @returns {string}
   */
  function generateId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  return {
    getSheet: getSheet,
    getAllRows: getAllRows,
    findRowsByField: findRowsByField,
    appendRow: appendRow,
    updateRowById: updateRowById,
    deleteRowById: deleteRowById,
    deleteRowsByField: deleteRowsByField,
    deleteRowsByFields: deleteRowsByFields,
    generateId: generateId
  };
})();
