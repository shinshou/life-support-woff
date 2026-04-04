/**
 * SpreadsheetUtil.gs
 * スプレッドシート共通操作
 */

var SpreadsheetUtil = (function () {
  var _ss = null;

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
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    var headers = data[0];
    var tz = Session.getScriptTimeZone();
    return data.slice(1).map(function (row, i) {
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
  }

  /**
   * 行更新
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {number} rowIndex - 実際の行番号（1始まり）
   * @param {Object} obj
   */
  function updateRow(sheet, rowIndex, obj) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    headers.forEach(function (h, j) {
      if (obj[h] !== undefined) {
        sheet.getRange(rowIndex, j + 1).setValue(obj[h]);
      }
    });
  }

  /**
   * 行削除
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {number} rowIndex - 実際の行番号（1始まり）
   */
  function deleteRow(sheet, rowIndex) {
    sheet.deleteRow(rowIndex);
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
    updateRow: updateRow,
    deleteRow: deleteRow,
    generateId: generateId
  };
})();
