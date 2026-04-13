/**
 * TaskEditView.js
 * P05 タスク編集（新規・更新 兼用）
 */

var TaskEditView = (function () {
  var _project = null;
  var _task = null;
  var _isNew = true;

  function mount(params) {
    _project = params.project;
    _task = params.task || null;
    _isNew = params.isNew !== false || !_task;

    _renderHeader();
    _fillForm();
    _bindForm();
  }

  function _renderHeader() {
    var title = document.getElementById('task-edit-title');
    if (title) title.textContent = _isNew ? 'タスク追加' : 'タスク編集';

    var backBtn = document.getElementById('btn-back-task-edit');
    if (backBtn) {
      backBtn.onclick = function () { _goBackToTaskList(); };
    }
  }

  function _fillForm() {
    _val('input-task-name', _isNew ? '' : _task.task_name);
    _val('input-task-assignee', _isNew ? '' : _task.assignee);
    _val('input-task-start', _isNew ? '' : String(_task.start_date || '').slice(0, 10));
    _val('input-task-due', _isNew ? '' : String(_task.due_date || '').slice(0, 10));
    _val('select-task-status', _isNew ? '未着手' : _task.status);
    _val('input-task-comment', _isNew ? '' : _task.comment);

    var deleteBtn = document.getElementById('btn-delete-task');
    if (deleteBtn) deleteBtn.style.display = _isNew ? 'none' : 'block';

    var defaultBtn = document.getElementById('btn-save-as-default');
    if (defaultBtn) defaultBtn.style.display = 'block';

    var errorEl = document.getElementById('task-edit-error');
    if (errorEl) errorEl.style.display = 'none';
  }

  function _bindForm() {
    var form = document.getElementById('form-task-edit');
    if (form) form.onsubmit = function (e) { e.preventDefault(); _submit(); };

    var deleteBtn = document.getElementById('btn-delete-task');
    if (deleteBtn) deleteBtn.onclick = _deleteTask;

    var defaultBtn = document.getElementById('btn-save-as-default');
    if (defaultBtn) defaultBtn.onclick = _saveAsDefault;
  }

  function _submit() {
    var taskName = document.getElementById('input-task-name').value.trim();
    if (!taskName) {
      _showError('タスク名を入力してください');
      return;
    }

    var data = {
      userId: App.getUserId(),
      roomId: App.getRoomId(),
      projectId: _project.project_id,
      task_name: taskName,
      assignee: document.getElementById('input-task-assignee').value.trim(),
      start_date: document.getElementById('input-task-start').value,
      due_date: document.getElementById('input-task-due').value,
      status: document.getElementById('select-task-status').value,
      comment: document.getElementById('input-task-comment').value.trim()
    };

    _setLoading(true);

    var promise;
    if (_isNew) {
      promise = Api.post('createTask', data);
    } else {
      data.taskId = _task.task_id;
      if (_task.updated_at) data.updated_at = _task.updated_at;
      promise = Api.post('updateTask', data);
    }

    promise
      .then(function () {
        _setLoading(false);
        _goBackToTaskList();
      })
      .catch(function (err) {
        _setLoading(false);
        if (err.code === 409) {
          alert(err.message);
          _goBackToTaskList();
        } else {
          _showError(err.message);
        }
      });
  }

  function _deleteTask() {
    if (!confirm('このタスクを削除しますか？')) return;

    Api.post('deleteTask', {
      userId: App.getUserId(),
      roomId: App.getRoomId(),
      projectId: _project.project_id,
      taskId: _task.task_id
    }).then(function () {
      _goBackToTaskList();
    }).catch(function (err) {
      _showError(err.message);
    });
  }

  function _saveAsDefault() {
    var taskName = document.getElementById('input-task-name').value.trim();
    if (!taskName) { _showError('タスク名を入力してください'); return; }

    var startDate = document.getElementById('input-task-start').value;
    var dueDate = document.getElementById('input-task-due').value;
    var offsetDays = 0;
    if (startDate && dueDate) {
      var diff = (new Date(dueDate) - new Date(startDate)) / 86400000;
      offsetDays = Math.max(0, Math.round(diff));
    }

    Api.post('saveAsDefaultTask', {
      task_name: taskName,
      offset_days: offsetDays
    }).then(function () {
      alert('デフォルトタスクとして保存しました（工数: ' + offsetDays + '日）');
    }).catch(function (err) {
      _showError(err.message);
    });
  }

  function _goBackToTaskList() {
    Api.get('getTasks', {
      userId: App.getUserId(),
      roomId: App.getRoomId(),
      projectId: _project.project_id
    }).then(function (tasks) {
      App.navigate('task-list', { project: _project, tasks: tasks || [] });
    }).catch(function () {
      App.navigate('task-list', { project: _project, tasks: [] });
    });
  }

  function _setLoading(flag) {
    var btn = document.getElementById('btn-save-task');
    if (!btn) return;
    btn.disabled = flag;
    btn.textContent = flag ? '保存中...' : '保存する';
  }

  function _showError(msg) {
    var el = document.getElementById('task-edit-error');
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
    }
  }

  function _val(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value || '';
  }

  return { mount: mount };
})();
