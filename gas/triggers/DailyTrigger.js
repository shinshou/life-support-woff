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
  // タスクシートの読み込みを1回にまとめ、各条件はメモリ上でフィルタする
  var allTasks = TaskModel.getAll();

  _checkStartTodayTasks(today, allTasks);
  _checkOverdueTasks(today, allTasks);
  _checkDueTodayTasks(today, allTasks);
  _checkDueSoonTasks(today, 3, allTasks);
}

function _checkStartTodayTasks(today, allTasks) {
  var tasks = allTasks.filter(function (t) {
    return t.start_date && t.status !== '完了' && String(t.start_date) === today;
  });
  tasks.forEach(function (task) {
    NotificationService.sendStartToday(task);
  });
}

function _checkOverdueTasks(today, allTasks) {
  var tasks = allTasks.filter(function (t) {
    return t.due_date && t.status !== '完了' && String(t.due_date) < today;
  });
  tasks.forEach(function (task) {
    NotificationService.sendOverdue(task);
  });
}

function _checkDueTodayTasks(today, allTasks) {
  var tasks = allTasks.filter(function (t) {
    return t.due_date && t.status !== '完了' && String(t.due_date) === today;
  });
  tasks.forEach(function (task) {
    NotificationService.sendDueToday(task);
  });
}

function _checkDueSoonTasks(today, days, allTasks) {
  var limit = DateUtil.addDays(today, days);
  var tasks = allTasks.filter(function (t) {
    return t.due_date && t.status !== '完了' &&
      String(t.due_date) > today && String(t.due_date) <= limit;
  });
  tasks.forEach(function (task) {
    var daysLeft = DateUtil.diffDays(today, String(task.due_date));
    NotificationService.sendDueSoon(task, daysLeft);
  });
}
