/**
 * TaskService.gs
 * タスク業務ロジック
 */

var TaskService = (function () {

  /**
   * タスク一覧取得（プロジェクト配下）
   * @param {string} projectId
   * @returns {Object[]}
   */
  function getTasks(projectId) {
    return TaskModel.getByProjectId(projectId);
  }

  /**
   * タスク作成
   * @param {Object} data
   * @returns {string} task_id
   */
  function createTask(data) {
    return TaskModel.create(data);
  }

  /**
   * タスク更新
   * ステータスが「完了」になった場合は完了通知を送信する
   * @param {string} taskId
   * @param {Object} data
   */
  function updateTask(taskId, data) {
    var before = TaskModel.getById(taskId);
    if (!before) throw new Error('タスクが見つかりません: ' + taskId);

    TaskModel.update(taskId, data);

    if (data.status === '完了' && before.status !== '完了') {
      var updated = TaskModel.getById(taskId);
      NotificationService.sendTaskComplete(updated);
    }
  }

  /**
   * タスク削除
   * @param {string} taskId
   */
  function deleteTask(taskId) {
    TaskModel.deleteById(taskId);
  }

  /**
   * デフォルトタスクをプロジェクトに一括展開
   * @param {string} projectId
   * @param {string} startDate YYYY-MM-DD
   * @param {string[]} selectedDefaultTaskIds
   */
  function createDefaultTasks(projectId, startDate, selectedDefaultTaskIds) {
    selectedDefaultTaskIds.forEach(function (id) {
      var defaultTask = DefaultTaskModel.getById(id);
      if (!defaultTask) return;
      var dueDate = DateUtil.addDays(startDate, Number(defaultTask.offset_days));
      TaskModel.create({
        project_id: projectId,
        default_task_id: defaultTask.default_task_id,
        task_name: defaultTask.task_name,
        due_date: dueDate,
        status: '未着手'
      });
    });
  }

  return {
    getTasks: getTasks,
    createTask: createTask,
    updateTask: updateTask,
    deleteTask: deleteTask,
    createDefaultTasks: createDefaultTasks
  };
})();
