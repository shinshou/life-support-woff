/**
 * app.js
 * アプリ初期化・SPA画面遷移管理
 */

var App = (function () {
  var _userId = '';
  var _roomId = '';
  var _displayName = '';
  var _canCreate = false;

  var _currentPage = '';
  var _history = [];
  var _pageCache = {};

  // ページコンポーネント登録
  var _views = {};

  function registerView(pageId, viewModule) {
    _views[pageId] = viewModule;
  }

  /**
   * アプリ起動
   * @param {string} woffId
   * @param {string} gasUrl
   */
  function start(woffId, gasUrl) {
    Api.setUrl(gasUrl);

    WoffClient.init(woffId)
      .then(function (info) {
        _userId = info.userId;
        _roomId = info.roomId;
        _displayName = info.displayName;
        return Api.get('getProjects', { userId: _userId, roomId: _roomId, displayName: _displayName });
      })
      .then(function (res) {
        var projects = Array.isArray(res) ? res : (res.projects || []);
        _canCreate = Array.isArray(res) ? false : !!res.canCreate;
        var isAdmin = Array.isArray(res) ? false : !!res.isAdmin;
        navigate('project-list', { projects: projects, canCreate: _canCreate, isAdmin: isAdmin });
      })
      .catch(function (err) {
        _showInitError(err.message);
        _sendLog(err.message, 'init');
      });
  }

  /**
   * 画面遷移
   * @param {string} pageId
   * @param {Object} [params]
   */
  function navigate(pageId, params) {
    if (_currentPage) _history.push(_currentPage);
    _render(pageId, params || {});
  }

  /**
   * 前画面へ戻る
   */
  function back() {
    var prev = _history.pop();
    if (prev) {
      _render(prev.id, prev.params || {});
    }
  }

  function _render(pageId, params) {
    // 全ページを非表示
    document.querySelectorAll('.page').forEach(function (el) {
      el.classList.remove('active');
    });

    // 対象ページを表示
    var pageEl = document.getElementById('page-' + pageId);
    if (!pageEl) {
      console.error('ページが見つかりません: ' + pageId);
      return;
    }
    pageEl.classList.add('active');
    _currentPage = { id: pageId, params: params };

    // 対応 View の mount を呼ぶ
    if (_views[pageId]) {
      _views[pageId].mount(params);
    }

    window.scrollTo(0, 0);
  }

  function _showInitError(msg) {
    var el = document.getElementById('init-error');
    if (el) {
      el.textContent = msg || '初期化に失敗しました';
      el.style.display = 'block';
    }
    var spinner = document.getElementById('init-spinner');
    if (spinner) spinner.style.display = 'none';
  }

  function _sendLog(msg, ctx) {
    try {
      var url = Api.getUrl();
      if (!url) return;
      fetch(url + '?action=writeLog&msg=' + encodeURIComponent(msg) + '&ctx=' + encodeURIComponent(ctx || ''));
    } catch (e) { /* 無視 */ }
  }

  // ── ユーザー情報アクセサ ───────────────────────
  function getUserId()     { return _userId; }
  function getRoomId()     { return _roomId; }
  function getDisplayName(){ return _displayName; }
  function canCreate()     { return _canCreate; }
  function setCanCreate(v) { _canCreate = !!v; }

  return {
    registerView: registerView,
    start: start,
    navigate: navigate,
    back: back,
    getUserId: getUserId,
    getRoomId: getRoomId,
    getDisplayName: getDisplayName,
    canCreate: canCreate,
    setCanCreate: setCanCreate
  };
})();
