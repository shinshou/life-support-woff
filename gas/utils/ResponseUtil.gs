/**
 * ResponseUtil.gs
 * JSON レスポンス生成
 */

var ResponseUtil = (function () {

  function _output(obj) {
    return ContentService
      .createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON);
  }

  /**
   * 成功レスポンス
   * @param {*} data
   * @returns {GoogleAppsScript.Content.TextOutput}
   */
  function success(data) {
    return _output({ success: true, data: data, error: null });
  }

  /**
   * エラーレスポンス
   * @param {string} message
   * @param {number} [code]
   * @returns {GoogleAppsScript.Content.TextOutput}
   */
  function error(message, code) {
    return _output({ success: false, data: null, error: message, code: code || 400 });
  }

  return {
    success: success,
    error: error
  };
})();
