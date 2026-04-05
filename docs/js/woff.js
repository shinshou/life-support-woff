/**
 * woff.js
 * WOFF SDK ラッパー・認証
 */

var WoffClient = (function () {
  var _context = null;
  var _profile = null;

  /**
   * WOFF SDK 初期化と認証情報の取得
   * @param {string} woffId
   * @returns {Promise<{userId:string, roomId:string, displayName:string}>}
   */
  function init(woffId) {
    return woff.init({ woffId: woffId })
      .then(function () {
        if (!woff.isInClient()) {
          throw new Error('LINE WORKSアプリ内から開いてください');
        }
        _context = woff.getContext();
        if (!woff.isLoggedIn()) {
          return woff.login().then(function () {
            return woff.getProfile();
          });
        }
        return woff.getProfile();
      })
      .then(function (profile) {
        _profile = profile;
        // DEBUGコンテキスト確認用ログ（確認後削除）
        if (window._debugGasUrl) {
          var ctx = { type: _context.type, channelId: _context.channelId, roomId: _context.roomId, userId: _context.userId };
          fetch(window._debugGasUrl + '?action=writeLog&msg=WOFFcontext&ctx=' + encodeURIComponent(JSON.stringify(ctx)));
        }
        return {
          userId: profile.userId,
          roomId: _context.channelId || ('user_' + profile.userId),
          displayName: profile.displayName
        };
      });
  }

  /**
   * 現在のユーザーID（初期化後に利用可能）
   * @returns {string}
   */
  function getUserId() {
    if (!_profile) throw new Error('WoffClient が初期化されていません');
    return _profile.userId;
  }

  /**
   * 現在のルームID（初期化後に利用可能）
   * @returns {string}
   */
  function getRoomId() {
    if (!_context) throw new Error('WoffClient が初期化されていません');
    return _context.channelId || ('user_' + _profile.userId);
  }

  /**
   * 表示名
   * @returns {string}
   */
  function getDisplayName() {
    if (!_profile) throw new Error('WoffClient が初期化されていません');
    return _profile.displayName;
  }

  /**
   * WOFF ミニアプリを閉じる
   */
  function close() {
    woff.closeWindow();
  }

  return {
    init: init,
    getUserId: getUserId,
    getRoomId: getRoomId,
    getDisplayName: getDisplayName,
    close: close
  };
})();
