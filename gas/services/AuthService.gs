/**
 * AuthService.gs
 * WOFF認証・アクセス制御
 */

var AuthService = (function () {

  /**
   * アクセス検証（全エンドポイント共通）
   * roomId がスプレッドシートに存在し、
   * projectId が指定されている場合は projectId と roomId の紐付けも確認する
   *
   * @param {string} userId
   * @param {string} roomId
   * @param {string} [projectId]
   * @throws {Error} アクセス不可の場合
   */
  function verifyAccess(userId, roomId, projectId) {
    if (!roomId) return; // 1:1トークの場合はroomIdなしで許可

    var room = RoomModel.getById(roomId);
    if (!room) throw new Error('ルームが登録されていません: ' + roomId);

    if (projectId) {
      var linked = ProjectRoomModel.exists(projectId, roomId);
      if (!linked) throw new Error('このルームからはアクセスできないプロジェクトです');
    }
  }

  /**
   * プロジェクト作成権限確認
   * @param {string} userId
   * @throws {Error} 権限がない場合
   */
  function requireCreatePermission(userId) {
    if (!userId) throw new Error('userId が指定されていません');
    if (!UserModel.canCreate(userId)) {
      throw new Error('プロジェクト作成権限がありません');
    }
  }

  /**
   * doPost のボディをパースしてコンテキストを返す
   * @param {GoogleAppsScript.Events.DoPost} e
   * @returns {Object}
   */
  function extractContext(e) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      throw new Error('リクエストのパースに失敗しました');
    }
  }

  /**
   * doGet のパラメータを返す
   * @param {GoogleAppsScript.Events.DoGet} e
   * @returns {Object}
   */
  function extractGetParams(e) {
    return e.parameter || {};
  }

  return {
    verifyAccess: verifyAccess,
    requireCreatePermission: requireCreatePermission,
    extractContext: extractContext,
    extractGetParams: extractGetParams
  };
})();
