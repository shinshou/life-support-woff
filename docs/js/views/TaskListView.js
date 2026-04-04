/**
 * TaskListView.js
 * P04 タスク一覧
 */

var TaskListView = (function () {
  var _project = null;
  var _tasks = [];
  var _filter = 'all';

  function mount(params) {
    _project = params.project;
    _tasks = params.tasks || [];
    _filter = 'all';
    Api.logError('TaskListView件数', String(_tasks.length) + ' projectId:' + (_project ? _project.project_id : 'none'));

    _renderHeader();
    _bindFilterTabs();
    _renderTasks();
    _renderFab();
  }

  function _renderHeader() {
    var title = document.getElementById('task-list-title');
    if (title) title.textContent = _project.project_name;

    var backBtn = document.getElementById('btn-back-task-list');
    if (backBtn) {
      backBtn.onclick = function () {
        Api.get('getProjects', { userId: App.getUserId(), roomId: App.getRoomId(), displayName: App.getDisplayName() })
          .then(function (res) {
            var projects = Array.isArray(res) ? res : (res.projects || []);
            var canCreate = Array.isArray(res) ? false : !!res.canCreate;
            App.navigate('project-list', { projects: projects, canCreate: canCreate });
          });
      };
    }
  }

  function _bindFilterTabs() {
    document.querySelectorAll('#page-task-list .filter-tab').forEach(function (tab) {
      tab.onclick = function () {
        document.querySelectorAll('#page-task-list .filter-tab').forEach(function (t) {
          t.classList.remove('active');
        });
        tab.classList.add('active');
        _filter = tab.dataset.filter;
        _renderTasks();
      };
    });
  }

  function _renderTasks() {
    var container = document.getElementById('task-list-container');
    if (!container) return;

    var today = _getToday();

    var filtered = _filter === 'all'
      ? _tasks
      : _tasks.filter(function (t) { return _statusKey(t.status) === _filter; });

    if (filtered.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-state-icon">✅</div>' +
        '<div class="empty-state-text">タスクがありません</div>' +
        '</div>';
      return;
    }

    var html = filtered.map(function (t) {
      return _buildTaskCard(t, today);
    }).join('');
    container.innerHTML = html;

    container.querySelectorAll('.card[data-task-id]').forEach(function (el) {
      el.addEventListener('click', function () {
        var taskId = el.dataset.taskId;
        var task = _tasks.find(function (t) { return t.task_id === taskId; });
        App.navigate('task-edit', { project: _project, task: task, isNew: false });
      });
    });
  }

  function _buildTaskCard(t, today) {
    var dueLabel = '';
    var dueBadgeClass = '';
    var due = t.due_date ? String(t.due_date).slice(0, 10) : '';

    if (t.status === '完了') {
      dueBadgeClass = 'badge-due-normal';
      dueLabel = due || '';
    } else if (due) {
      if (due < today) {
        dueBadgeClass = 'badge-due-overdue';
        dueLabel = due + ' 期限超過';
      } else if (due === today) {
        dueBadgeClass = 'badge-due-today';
        dueLabel = '本日期限';
      } else {
        var diff = _diffDays(today, due);
        if (diff <= 3) {
          dueBadgeClass = 'badge-due-soon';
          dueLabel = due + ' あと' + diff + '日';
        } else {
          dueBadgeClass = 'badge-due-normal';
          dueLabel = due;
        }
      }
    }

    var statusClass = 'badge-status-' + _statusKey(t.status);

    return [
      '<div class="card" data-task-id="' + _esc(t.task_id) + '">',
      '  <div class="card-title">' + _esc(t.task_name) + '</div>',
      '  <div class="card-sub">',
      '    <span class="badge ' + statusClass + '">' + _esc(t.status) + '</span>',
      due ? '<span class="badge ' + dueBadgeClass + '">' + _esc(dueLabel) + '</span>' : '',
      t.assignee ? '<span>' + _esc(t.assignee) + '</span>' : '',
      '  </div>',
      '</div>'
    ].join('');
  }

  function _renderFab() {
    var fab = document.getElementById('fab-task');
    if (!fab) return;
    fab.onclick = function () {
      App.navigate('task-edit', { project: _project, task: null, isNew: true });
    };
  }

  function _statusKey(status) {
    if (status === '進行中') return 'progress';
    if (status === '完了')  return 'done';
    return 'pending';
  }

  function _getToday() {
    var d = new Date();
    return d.getFullYear() + '-' +
      ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
      ('0' + d.getDate()).slice(-2);
  }

  function _diffDays(from, to) {
    var d1 = new Date(from);
    var d2 = new Date(to);
    return Math.round((d2 - d1) / 86400000);
  }

  function _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { mount: mount };
})();
