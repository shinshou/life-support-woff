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
    _showOverlay();
    return fetch(GAS_URL + '?' + qs)
      .then(_handleResponse)
      .then(function (data) { _hideOverlay(); return data; })
      .catch(function (err) { _hideOverlay(); throw err; });
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
    _showOverlay();
    return fetch(url)
      .then(_handleResponse)
      .then(function (data) { _hideOverlay(); return data; })
      .catch(function (err) { _hideOverlay(); throw err; });
  }

  function _handleResponse(res) {
    return res.json().then(function (json) {
      if (!json.success) throw new Error(json.error || 'APIエラーが発生しました');
      return json.data;
    });
  }

  function _showOverlay() {
    var el = document.getElementById('loading-overlay');
    if (el) el.classList.add('active');
  }

  function _hideOverlay() {
    var el = document.getElementById('loading-overlay');
    if (el) el.classList.remove('active');
  }

  function getUrl() { return GAS_URL; }

  return {
    setUrl: setUrl,
    getUrl: getUrl,
    get: get,
    post: post
  };
})();
