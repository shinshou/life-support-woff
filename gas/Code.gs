/**
 * Code.gs
 * GAS Web App エントリポイント
 */

/**
 * GET リクエスト処理
 * - action パラメータなし → WOFF フロントエンド HTML を返す
 * - action パラメータあり → Router.routeGet に委譲
 */
function doGet(e) {
  var params = e.parameter || {};

  if (!params.action) {
    return HtmlService.createTemplateFromFile('frontend/index')
      .evaluate()
      .setTitle('タスク管理')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return Router.routeGet(e);
}

/**
 * POST リクエスト処理
 * Router.routePost に委譲
 */
function doPost(e) {
  _writeLog('doPost受信', JSON.stringify({
    postData: e.postData ? e.postData.contents : 'null',
    params: JSON.stringify(e.parameter)
  }));
  return Router.routePost(e);
}

function _writeLog(msg, ctx) {
  try {
    var ss = SpreadsheetApp.openById(
      PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
    );
    var sheet = ss.getSheetByName('ログ') || ss.insertSheet('ログ');
    if (sheet.getLastRow() === 0) sheet.appendRow(['日時', 'メッセージ', 'コンテキスト']);
    sheet.appendRow([new Date(), msg || '', ctx || '']);
  } catch (e) { /* 無視 */ }
}
