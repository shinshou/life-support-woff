/**
 * woff.js
 * WOFF SDK ラッパー・認証
 */

var WoffClient = (function () {
  var _context = null;
  var _profile = null;
  var _roomId = null;

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
        return Promise.resolve(woff.getChannelId()).catch(function () { return null; })
          .then(function (channelId) {
            _roomId = channelId || ('user_' + profile.userId);
            return {
              userId: profile.userId,
              roomId: _roomId,
              displayName: profile.displayName
            };
          });
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
    if (!_roomId) throw new Error('WoffClient が初期化されていません');
    return _roomId;
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
