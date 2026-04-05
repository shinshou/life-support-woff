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
   * ユーザーシートに委譲
   * @param {string} userId
   * @returns {boolean}
   */
  function canCreate(userId) {
    return MemberModel.canCreate(userId);
  }

  /**
   * ユーザーシートに委譲
   * @param {string} userId
   * @param {boolean} canCreateFlag
   */
  function create(userId, canCreateFlag) {
    MemberModel.upsert(userId, '');
    MemberModel.setCanCreate(userId, !!canCreateFlag);
  }

  function update(userId, canCreateFlag) {
    MemberModel.setCanCreate(userId, !!canCreateFlag);
  }

  return {
    getAll: getAll,
    getByUserId: getByUserId,
    canCreate: canCreate,
    create: create,
    update: update
  };
})();
