/**
 * UserModel.gs
 * 作成者管理 CRUD
 */

var UserModel = (function () {
  function getAll() {
    return MemberModel.getAll();
  }

  function getByUserId(userId) {
    return MemberModel.getById(userId);
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
