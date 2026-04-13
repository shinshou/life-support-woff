/**
 * cache.js
 * ページ間遷移用メモリキャッシュ
 * ミューテーション（保存・更新・削除）以外の遷移で再APIを不要にする
 */

var Cache = (function () {
  var _store = {};

  function set(key, data) {
    _store[key] = data;
  }

  function get(key) {
    return Object.prototype.hasOwnProperty.call(_store, key) ? _store[key] : undefined;
  }

  function has(key) {
    return Object.prototype.hasOwnProperty.call(_store, key);
  }

  function invalidate(key) {
    delete _store[key];
  }

  return { set: set, get: get, has: has, invalidate: invalidate };
})();
