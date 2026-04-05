/**
 * AdminView.js
 * P08 管理者画面（作成者設定）
 */

var AdminView = (function () {
  var _users = [];

  function mount(params) {
    _users = params.users || [];
    _render();
    _bindBack();
  }

  function _render() {
    var container = document.getElementById('admin-user-list');
    if (!container) return;

    if (_users.length === 0) {
      container.innerHTML = '<p style="color:#888;font-size:13px;">ユーザーがいません</p>';
      return;
    }

    var html = _users.map(function (u) {
      var checked = u.can_create ? 'checked' : '';
      var adminBadge = u.is_admin
        ? '<span style="font-size:11px;color:#0277bd;margin-left:6px;">管理者</span>'
        : '';
      return [
        '<div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;">',
        '  <div>',
        '    <div style="font-size:14px;font-weight:bold;">' + _esc(u.display_name || u.user_id) + adminBadge + '</div>',
        '    <div style="font-size:11px;color:#888;">' + _esc(u.user_id) + '</div>',
        '  </div>',
        '  <label class="toggle-switch">',
        '    <input type="checkbox" data-user-id="' + _esc(u.user_id) + '" ' + checked + '>',
        '    <span class="toggle-slider"></span>',
        '  </label>',
        '</div>'
      ].join('');
    }).join('');

    container.innerHTML = html;

    container.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        _setCreator(cb.dataset.userId, cb.checked);
      });
    });
  }

  function _setCreator(targetUserId, canCreate) {
    var errorEl = document.getElementById('admin-error');
    if (errorEl) errorEl.style.display = 'none';

    Api.post('setCreator', {
      userId: App.getUserId(),
      roomId: App.getRoomId(),
      targetUserId: targetUserId,
      canCreate: canCreate
    }).catch(function (err) {
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    });
  }

  function _bindBack() {
    var btn = document.getElementById('btn-back-admin');
    if (btn) btn.onclick = function () { App.back(); };
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
