/**
 * MemberModel.gs
 * ユーザー CRUD
 */

var MemberModel = (function () {
  var SHEET = 'ユーザー';

  function getAll() {
    return SpreadsheetUtil.getAllRows(SpreadsheetUtil.getSheet(SHEET));
  }

  function getById(userId) {
    var rows = SpreadsheetUtil.findRowsByField(SpreadsheetUtil.getSheet(SHEET), 'user_id', userId);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * @param {{user_id:string, display_name:string}} data
   */
  function create(data) {
    SpreadsheetUtil.appendRow(SpreadsheetUtil.getSheet(SHEET), {
      user_id: data.user_id,
      display_name: data.display_name
    });
  }

  function update(userId, data) {
    var row = getById(userId);
    if (!row) throw new Error('ユーザーが見つかりません: ' + userId);
    SpreadsheetUtil.updateRow(SpreadsheetUtil.getSheet(SHEET), row._rowIndex, data);
  }

  /**
   * 未登録なら追加、登録済みで表示名が変わっていれば更新
   * @param {string} userId
   * @param {string} displayName
   */
  function upsert(userId, displayName) {
    if (!userId) return;
    var existing = getById(userId);
    if (!existing) {
      create({ user_id: userId, display_name: displayName || '' });
    } else if (displayName && existing.display_name !== displayName) {
      update(userId, { display_name: displayName });
    }
  }

  /**
   * @param {string} userId
   * @returns {boolean}
   */
  function isAdmin(userId) {
    var row = getById(userId);
    if (!row) return false;
    return row['is_admin'] === true || row['is_admin'] === 'TRUE';
  }

  return {
    getAll: getAll,
    getById: getById,
    create: create,
    update: update,
    upsert: upsert,
    isAdmin: isAdmin
  };
})();
