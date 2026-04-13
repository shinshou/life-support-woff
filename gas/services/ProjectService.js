/**
 * ProjectService.gs
 * プロジェクト業務ロジック
 */

var ProjectService = (function () {

  /**
   * プロジェクト一覧取得（ルームに紐づくもの）
   * @param {string} roomId
   * @returns {Object[]}
   */
  function getProjects(roomId) {
    return ProjectModel.getByRoomId(roomId);
  }

  /**
   * プロジェクト作成
   * roomIds に含まれるルームを紐付け、デフォルトタスクを展開する
   *
   * @param {{project_name:string, project_type:string, start_date:string,
   *          roomIds:string[], defaultTaskIds:string[]}} data
   * @returns {string} 新規 project_id
   */
  function createProject(data) {
    var projectId = ProjectModel.create({
      project_name: data.project_name,
      project_type: data.project_type,
      start_date: data.start_date
    });

    var roomIds = data.roomIds || [];
    roomIds.forEach(function (roomId) {
      var room = RoomModel.getById(roomId);
      if (!room) {
        RoomModel.create({ room_id: roomId, room_name: roomId });
      }
      ProjectRoomModel.create(projectId, roomId);
    });

    if (data.defaultTaskIds && data.defaultTaskIds.length > 0) {
      TaskService.createDefaultTasks(projectId, data.start_date, data.defaultTaskIds);
    }

    return projectId;
  }

  /**
   * プロジェクト更新
   * @param {string} projectId
   * @param {Object} data
   */
  function updateProject(projectId, data) {
    ProjectModel.update(projectId, data);
  }

  /**
   * プロジェクト削除（関連タスク・ルーム紐付けも削除）
   * @param {string} projectId
   */
  function deleteProject(projectId) {
    TaskModel.deleteByProjectId(projectId);
    ProjectRoomModel.deleteByProjectId(projectId);
    ProjectModel.deleteById(projectId);
  }

  /**
   * ルーム紐付け追加
   * @param {string} projectId
   * @param {string} roomId
   */
  function linkRoom(projectId, roomId) {
    var room = RoomModel.getById(roomId);
    if (!room) {
      RoomModel.create({ room_id: roomId, room_name: roomId });
    }
    ProjectRoomModel.create(projectId, roomId);
  }

  /**
   * ルーム紐付け解除
   * @param {string} projectId
   * @param {string} roomId
   */
  function unlinkRoom(projectId, roomId) {
    ProjectRoomModel.deleteByProjectIdAndRoomId(projectId, roomId);
  }

  return {
    getProjects: getProjects,
    createProject: createProject,
    updateProject: updateProject,
    deleteProject: deleteProject,
    linkRoom: linkRoom,
    unlinkRoom: unlinkRoom
  };
})();
