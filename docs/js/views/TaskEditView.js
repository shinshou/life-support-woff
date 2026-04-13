/**
 * TaskEditView.js
 * P05 タスク編集（新規・更新 兼用）
 */

var TaskEditView = (function () {
  var _project = null;
  var _task = null;
  var _isNew = true;
  var _isDirty = false;

  // ── localStorage 下書き ───────────────────────────

  function _getDraftKey() {
    return _isNew
      ? 'draft_task_new_' + _project.project_id
      : 'draft_task_' + _task.task_id;
  }

  function _saveDraft() {
    try {
      var draft = {
        task_name:  document.getElementById('input-task-name').value,
        assignee:   document.getElementById('input-task-assignee').value,
        start_date: document.getElementById('input-task-start').value,
        due_date:   document.getElementById('input-task-due').value,
        status:     document.getElementById('select-task-status').value,
        comment:    document.getElementById('input-task-comment').value,
        savedAt:    new Date().toISOString()
      };
      localStorage.setItem(_getDraftKey(), JSON.stringify(draft));
    } catch (e) { /* localStorage 使用不可環境では無視 */ }
  }

  function _loadDraft() {
    try {
      var raw = localStorage.getItem(_getDraftKey());
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function _clearDraft() {
    try { localStorage.removeItem(_getDraftKey()); } catch (e) {}
  }

  function _applyDraft(draft) {
    _val('input-task-name',    draft.task_name  || '');
    _val('input-task-assignee',draft.assignee   || '');
    _val('input-task-start',   draft.start_date || '');
    _val('input-task-due',     draft.due_date   || '');
    _val('select-task-status', draft.status     || '未着手');
    _val('input-task-comment', draft.comment    || '');
  }

  // ── mount ─────────────────────────────────────────

  function mount(params) {
    _project = params.project;
    _task = params.task || null;
    _isNew = params.isNew !== false || !_task;
    _isDirty = false;

    _renderHeader();
    _fillForm();
    _checkDraft();
    _bindForm();
  }

  function isDirty() {
    return _isDirty;
  }

  // ── 下書き確認 ────────────────────────────────────

  function _checkDraft() {
    var draft = _loadDraft();
    if (!draft) return;

    var savedAt = '';
    if (draft.savedAt) {
      try {
        savedAt = new Date(draft.savedAt).toLocaleString('ja-JP');
      } catch (e) {
        savedAt = draft.savedAt;
      }
    }

    if (confirm('前回（' + savedAt + '）の編集途中データがあります。\n復元しますか？')) {
      _applyDraft(draft);
      _isDirty = true;
    } else {
      _clearDraft();
    }
  }

  // ── ヘッダー ──────────────────────────────────────

  function _renderHeader() {
    var title = document.getElementById('task-edit-title');
    if (title) title.textContent = _isNew ? 'タスク追加' : 'タスク編集';

    var backBtn = document.getElementById('btn-back-task-edit');
    if (backBtn) {
      backBtn.onclick = function () {
        if (_confirmLeave()) _goBackToTaskList();
      };
    }
  }

  function _confirmLeave() {
    if (!_isDirty) return true;
    return confirm('編集中の内容が保存されていません。\nこのまま閉じますか？\n（下書きは次回開いたとき復元できます）');
  }

  // ── フォーム描画 ──────────────────────────────────

  function _fillForm() {
    _val('input-task-name',    _isNew ? '' : _task.task_name);
    _val('input-task-assignee',_isNew ? '' : _task.assignee);
    _val('input-task-start',   _isNew ? '' : String(_task.start_date || '').slice(0, 10));
    _val('input-task-due',     _isNew ? '' : String(_task.due_date   || '').slice(0, 10));
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
    if (form) {
      form.onsubmit = function (e) { e.preventDefault(); _submit(); };
      form.addEventListener('input',  function () { _isDirty = true; _saveDraft(); });
      form.addEventListener('change', function () { _isDirty = true; _saveDraft(); });
    }

    var deleteBtn = document.getElementById('btn-delete-task');
    if (deleteBtn) deleteBtn.onclick = _deleteTask;

    var defaultBtn = document.getElementById('btn-save-as-default');
    if (defaultBtn) defaultBtn.onclick = _saveAsDefault;
  }

  // ── 送信 ──────────────────────────────────────────

  function _submit() {
    var taskName = document.getElementById('input-task-name').value.trim();
    if (!taskName) {
      _showError('タスク名を入力してください');
      return;
    }

    var data = {
      userId:     App.getUserId(),
      roomId:     App.getRoomId(),
      projectId:  _project.project_id,
      task_name:  taskName,
      assignee:   document.getElementById('input-task-assignee').value.trim(),
      start_date: document.getElementById('input-task-start').value,
      due_date:   document.getElementById('input-task-due').value,
      status:     document.getElementById('select-task-status').value,
      comment:    document.getElementById('input-task-comment').value.trim()
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
        _isDirty = false;
        _clearDraft();
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

  // ── 削除 ──────────────────────────────────────────

  function _deleteTask() {
    if (!confirm('このタスクを削除しますか？')) return;

    Api.post('deleteTask', {
      userId:    App.getUserId(),
      roomId:    App.getRoomId(),
      projectId: _project.project_id,
      taskId:    _task.task_id
    }).then(function () {
      _isDirty = false;
      _clearDraft();
      _goBackToTaskList();
    }).catch(function (err) {
      _showError(err.message);
    });
  }

  // ── デフォルトタスクとして保存 ────────────────────

  function _saveAsDefault() {
    var taskName = document.getElementById('input-task-name').value.trim();
    if (!taskName) { _showError('タスク名を入力してください'); return; }

    var startDate = document.getElementById('input-task-start').value;
    var dueDate   = document.getElementById('input-task-due').value;
    var offsetDays = 0;
    if (startDate && dueDate) {
      var diff = (new Date(dueDate) - new Date(startDate)) / 86400000;
      offsetDays = Math.max(0, Math.round(diff));
    }

    Api.post('saveAsDefaultTask', {
      task_name:   taskName,
      offset_days: offsetDays
    }).then(function () {
      Cache.invalidate('defaultTasks');
      alert('デフォルトタスクとして保存しました（工数: ' + offsetDays + '日）');
    }).catch(function (err) {
      _showError(err.message);
    });
  }

  // ── タスク一覧へ戻る ──────────────────────────────

  function _goBackToTaskList() {
    Api.get('getTasks', {
      userId:    App.getUserId(),
      roomId:    App.getRoomId(),
      projectId: _project.project_id
    }).then(function (tasks) {
      App.navigate('task-list', { project: _project, tasks: tasks || [] });
    }).catch(function () {
      App.navigate('task-list', { project: _project, tasks: [] });
    });
  }

  // ── ユーティリティ ────────────────────────────────

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

  return { mount: mount, isDirty: isDirty };
})();
