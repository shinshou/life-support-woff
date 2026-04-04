/**
 * api.js
 * GAS Web App API クライアント
 */

var Api = (function () {
  var GAS_URL = ''; // デプロイ後に設定（appsscript.json の deploymentId ベース）

  /**
   * GAS_URL をランタイムで設定する
   * index.html の <script> 内で Api.setUrl(GAS_DEPLOY_URL) を呼ぶ
   */
  function setUrl(url) {
    GAS_URL = url;
  }

  /**
   * GETリクエスト
   * @param {string} action
   * @param {Object} params
   * @returns {Promise<*>}
   */
  function get(action, params) {
    var query = Object.assign({ action: action }, params);
    var qs = Object.keys(query)
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(query[k]); })
      .join('&');
    return fetch(GAS_URL + '?' + qs)
      .then(_handleResponse);
  }

  /**
   * POSTリクエスト
   * @param {string} action
   * @param {Object} body
   * @returns {Promise<*>}
   */
  function post(action, body) {
    var payload = Object.assign({ action: action }, body);
    var url = GAS_URL + '?data=' + encodeURIComponent(JSON.stringify(payload));
    _log('post送信', action + ' urlLen:' + url.length);
    return fetch(url)
      .then(_handleResponse)
      .catch(function (err) {
        _log('post失敗', action + ':' + err.message);
        throw err;
      });
  }

  function _handleResponse(res) {
    return res.json().then(function (json) {
      if (!json.success) {
        _log('APIエラー', json.error);
        throw new Error(json.error || 'APIエラーが発生しました');
      }
      return json.data;
    }).catch(function (err) {
      _log('レスポンスパース失敗', err.message);
      throw err;
    });
  }

  function _log(msg, ctx) {
    if (!GAS_URL) return;
    fetch(GAS_URL + '?action=writeLog&msg=' + encodeURIComponent(msg) + '&ctx=' + encodeURIComponent(ctx || '')).catch(function(){});
  }

  function logError(msg, ctx) { _log(msg, ctx); }

  function getUrl() { return GAS_URL; }

  return {
    setUrl: setUrl,
    getUrl: getUrl,
    get: get,
    post: post,
    logError: logError
  };
})();
