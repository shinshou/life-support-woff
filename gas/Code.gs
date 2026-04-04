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
  return Router.routePost(e);
}
