/**
 * TaskListView.js
 * P04 タスク一覧
 */

var TaskListView = (function () {
  var _project = null;
  var _tasks = [];
  var _filter = 'all';
  var _selectMode = false;
  var _selectedIds = {};

  function mount(params) {
    _project = params.project;
    _tasks = params.tasks || [];
    _filter = 'all';
    _selectMode = false;
    _selectedIds = {};

    _renderHeader();
    _bindFilterTabs();
    _renderTasks();
    _renderFab();
    _bindSelectMode();
  }

  function _renderHeader() {
    var title = document.getElementById('task-list-title');
    if (title) title.textContent = _project.project_name;

    var defaultBtn = document.getElementById('btn-add-default-tasks');
    if (defaultBtn) {
      defaultBtn.onclick = function () {
        if (Cache.has('defaultTasks')) {
          App.navigate('task-from-default', { project: _project, defaultTasks: Cache.get('defaultTasks') });
          return;
        }
        Api.get('getDefaultTasks', {}).then(function (defaultTasks) {
          Cache.set('defaultTasks', defaultTasks || []);
          App.navigate('task-from-default', { project: _project, defaultTasks: defaultTasks || [] });
        }).catch(function (err) {
          alert('デフォルトタスク取得に失敗しました: ' + err.message);
        });
      };
    }

    var backBtn = document.getElementById('btn-back-task-list');
    if (backBtn) {
      backBtn.onclick = function () {
        if (_selectMode) {
          _exitSelectMode();
          return;
        }
        if (Cache.has('projects')) {
          App.navigate('project-list', {
            projects: Cache.get('projects'),
            canCreate: Cache.has('canCreate') ? Cache.get('canCreate') : false,
            isAdmin: Cache.has('isAdmin') ? Cache.get('isAdmin') : false
          });
          return;
        }
        Api.get('getInitialData', { userId: App.getUserId(), roomId: App.getRoomId(), displayName: App.getDisplayName() })
          .then(function (res) {
            var projects = res.projects || [];
            var canCreate = !!res.canCreate;
            var isAdmin = !!res.isAdmin;
            Cache.set('projects', projects);
            Cache.set('canCreate', canCreate);
            Cache.set('isAdmin', isAdmin);
            App.navigate('project-list', { projects: projects, canCreate: canCreate, isAdmin: isAdmin });
          });
      };
    }
  }

  function _bindSelectMode() {
    var selectBtn = document.getElementById('btn-task-select-mode');
    if (selectBtn) {
      selectBtn.onclick = function () { _enterSelectMode(); };
    }

    var cancelBtn = document.getElementById('btn-cancel-task-select');
    if (cancelBtn) {
      cancelBtn.onclick = function () { _exitSelectMode(); };
    }

    var selectAllChk = document.getElementById('chk-task-select-all');
    if (selectAllChk) {
      selectAllChk.onchange = function () {
        var filtered = _getFilteredTasks();
        if (selectAllChk.checked) {
          filtered.forEach(function (t) { _selectedIds[t.task_id] = true; });
        } else {
          filtered.forEach(function (t) { delete _selectedIds[t.task_id]; });
        }
        _renderTasks();
        _updateSelectBar();
      };
    }

    var deleteBtn = document.getElementById('btn-bulk-delete-tasks');
    if (deleteBtn) {
      deleteBtn.onclick = function () { _bulkDelete(); };
    }
  }

  function _enterSelectMode() {
    _selectMode = true;
    _selectedIds = {};
    var bar = document.getElementById('task-select-bar');
    if (bar) bar.style.display = 'flex';
    var selectBtn = document.getElementById('btn-task-select-mode');
    if (selectBtn) selectBtn.style.display = 'none';
    var fab = document.getElementById('fab-task');
    if (fab) fab.style.display = 'none';
    _renderTasks();
    _updateSelectBar();
  }

  function _exitSelectMode() {
    _selectMode = false;
    _selectedIds = {};
    var bar = document.getElementById('task-select-bar');
    if (bar) bar.style.display = 'none';
    var selectBtn = document.getElementById('btn-task-select-mode');
    if (selectBtn) selectBtn.style.display = '';
    var fab = document.getElementById('fab-task');
    if (fab) fab.style.display = '';
    _renderTasks();
  }

  function _updateSelectBar() {
    var count = Object.keys(_selectedIds).length;

    var countEl = document.getElementById('task-select-count');
    if (countEl) countEl.textContent = count + '件選択中';

    var deleteBtn = document.getElementById('btn-bulk-delete-tasks');
    if (deleteBtn) deleteBtn.disabled = (count === 0);

    var selectAllChk = document.getElementById('chk-task-select-all');
    if (selectAllChk) {
      var filtered = _getFilteredTasks();
      if (filtered.length === 0) {
        selectAllChk.checked = false;
        selectAllChk.indeterminate = false;
      } else {
        var selectedCount = filtered.filter(function (t) { return _selectedIds[t.task_id]; }).length;
        if (selectedCount === 0) {
          selectAllChk.checked = false;
          selectAllChk.indeterminate = false;
        } else if (selectedCount === filtered.length) {
          selectAllChk.checked = true;
          selectAllChk.indeterminate = false;
        } else {
          selectAllChk.checked = false;
          selectAllChk.indeterminate = true;
        }
      }
    }
  }

  function _bulkDelete() {
    var ids = Object.keys(_selectedIds);
    if (ids.length === 0) return;
    if (!confirm(ids.length + '件のタスクを削除しますか？')) return;

    Api.post('deleteTasks', {
      userId: App.getUserId(),
      roomId: App.getRoomId(),
      projectId: _project.project_id,
      taskIds: ids
    }).then(function () {
      _tasks = _tasks.filter(function (t) { return !_selectedIds[t.task_id]; });
      _exitSelectMode();
    }).catch(function (err) {
      alert('削除に失敗しました: ' + err.message);
    });
  }

  function _bindFilterTabs() {
    document.querySelectorAll('#page-task-list .filter-tab').forEach(function (tab) {
      tab.onclick = function () {
        document.querySelectorAll('#page-task-list .filter-tab').forEach(function (t) {
          t.classList.remove('active');
        });
        tab.classList.add('active');
        _filter = tab.dataset.filter;
        if (_selectMode) {
          _selectedIds = {};
          _updateSelectBar();
        }
        _renderTasks();
      };
    });
  }

  function _getFilteredTasks() {
    return _filter === 'all'
      ? _tasks
      : _tasks.filter(function (t) { return _statusKey(t.status) === _filter; });
  }

  function _renderTasks() {
    var container = document.getElementById('task-list-container');
    if (!container) return;

    var today = _getToday();
    var filtered = _getFilteredTasks();

    if (filtered.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-state-icon">✅</div>' +
        '<div class="empty-state-text">タスクがありません</div>' +
        '</div>';
      return;
    }

    container.innerHTML = filtered.map(function (t) {
      return _buildTaskCard(t, today);
    }).join('');

    if (_selectMode) {
      container.querySelectorAll('.card[data-task-id]').forEach(function (el) {
        el.addEventListener('click', function (e) {
          if (e.target.classList.contains('card-check')) return;
          _toggleCard(el);
        });
        var chk = el.querySelector('.card-check');
        if (chk) {
          chk.addEventListener('change', function () {
            var taskId = el.dataset.taskId;
            if (chk.checked) {
              _selectedIds[taskId] = true;
              el.classList.add('card-checked');
            } else {
              delete _selectedIds[taskId];
              el.classList.remove('card-checked');
            }
            _updateSelectBar();
          });
        }
      });
    } else {
      container.querySelectorAll('.card[data-task-id]').forEach(function (el) {
        el.addEventListener('click', function () {
          var taskId = el.dataset.taskId;
          var task = _tasks.find(function (t) { return t.task_id === taskId; });
          App.navigate('task-edit', { project: _project, task: task, isNew: false });
        });
      });
    }
  }

  function _toggleCard(el) {
    var taskId = el.dataset.taskId;
    var chk = el.querySelector('.card-check');
    if (_selectedIds[taskId]) {
      delete _selectedIds[taskId];
      if (chk) chk.checked = false;
      el.classList.remove('card-checked');
    } else {
      _selectedIds[taskId] = true;
      if (chk) chk.checked = true;
      el.classList.add('card-checked');
    }
    _updateSelectBar();
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
    var isChecked = _selectMode && !!_selectedIds[t.task_id];
    var cardClass = (t.status === '完了' ? 'card card-done' : 'card') + (isChecked ? ' card-checked' : '');

    var innerHtml = [
      '<div class="card-title">' + _esc(t.task_name) + '</div>',
      '<div class="card-sub">',
      '  <span class="badge ' + statusClass + '">' + _esc(t.status) + '</span>',
      due ? '<span class="badge ' + dueBadgeClass + '">' + _esc(dueLabel) + '</span>' : '',
      t.assignee ? '<span>' + _esc(t.assignee) + '</span>' : '',
      '</div>',
    ].join('');

    if (_selectMode) {
      return [
        '<div class="' + cardClass + '" data-task-id="' + _esc(t.task_id) + '">',
        '  <div class="card-select-wrap">',
        '    <input type="checkbox" class="card-check" data-task-id="' + _esc(t.task_id) + '"' + (isChecked ? ' checked' : '') + '>',
        '    <div class="card-content">' + innerHtml + '</div>',
        '  </div>',
        '</div>',
      ].join('');
    }

    return '<div class="' + cardClass + '" data-task-id="' + _esc(t.task_id) + '">' + innerHtml + '</div>';
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
