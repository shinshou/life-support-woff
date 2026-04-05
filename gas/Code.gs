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

  // POST互換: dataパラメータがある場合は書き込み系処理
  if (params.data) {
    try {
      var ctx = JSON.parse(params.data);
      return Router.routeByData(ctx);
    } catch (err) {
      return ResponseUtil.error('dataパラメータのパースに失敗しました');
    }
  }

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
  try {
    var body = JSON.parse(e.postData.contents);

    // LINE WORKS Bot Callback（typeフィールドあり）
    if (body.type) {
      BotEventService.handleEvent(body);
      return ResponseUtil.success(null);
    }
  } catch (err) {
    // パース失敗はAPIリクエストとして処理
  }

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
