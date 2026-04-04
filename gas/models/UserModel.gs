/**
 * UserModel.gs
 * 作成者管理 CRUD
 */

var UserModel = (function () {
  var SHEET = '作成者管理';

  function getAll() {
    return SpreadsheetUtil.getAllRows(SpreadsheetUtil.getSheet(SHEET));
  }

  function getByUserId(userId) {
    var rows = SpreadsheetUtil.findRowsByField(SpreadsheetUtil.getSheet(SHEET), 'user_id', userId);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * @param {string} userId
   * @returns {boolean}
   */
  function canCreate(userId) {
    var row = getByUserId(userId);
    if (!row) return false;
    return row['作成可否'] === true || row['作成可否'] === 'TRUE';
  }

  function create(userId, canCreateFlag) {
    SpreadsheetUtil.appendRow(SpreadsheetUtil.getSheet(SHEET), {
      user_id: userId,
      '作成可否': canCreateFlag ? true : false
    });
  }

  function update(userId, canCreateFlag) {
    var row = getByUserId(userId);
    if (!row) throw new Error('ユーザーが見つかりません: ' + userId);
    SpreadsheetUtil.updateRow(SpreadsheetUtil.getSheet(SHEET), row._rowIndex, {
      '作成可否': canCreateFlag ? true : false
    });
  }

  return {
    getAll: getAll,
    getByUserId: getByUserId,
    canCreate: canCreate,
    create: create,
    update: update
  };
})();
