/**
 * DailyTrigger.gs
 * 毎日 AM 8:00 に実行するスケジューラ
 *
 * 設定方法:
 *   GAS エディタ → トリガー → トリガーを追加
 *   実行関数: runDailyNotification
 *   イベントソース: 時間主導型
 *   時間ベース: 1日タイマー
 *   時刻: 午前8時〜午前9時
 */

function runDailyNotification() {
  var today = DateUtil.getToday();

  _checkOverdueTasks(today);
  _checkDueTodayTasks(today);
  _checkDueSoonTasks(today, 3);
}

function _checkOverdueTasks(today) {
  var tasks = TaskModel.getOverdueTasks(today);
  tasks.forEach(function (task) {
    NotificationService.sendOverdue(task);
  });
}

function _checkDueTodayTasks(today) {
  var tasks = TaskModel.getTasksDueToday(today);
  tasks.forEach(function (task) {
    NotificationService.sendDueToday(task);
  });
}

function _checkDueSoonTasks(today, days) {
  var tasks = TaskModel.getTasksDueSoon(today, days);
  tasks.forEach(function (task) {
    var daysLeft = DateUtil.diffDays(today, String(task.due_date));
    NotificationService.sendDueSoon(task, daysLeft);
  });
}
