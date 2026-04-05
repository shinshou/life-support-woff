/**
 * BotEventService.gs
 * LINE WORKS Bot イベント処理
 */

var BotEventService = (function () {

  /**
   * Botイベントを処理する
   * @param {Object} event - LINE WORKSからのCallbackペイロード
   */
  function handleEvent(event) {
    var type = event.type;
    var channelId = event.source && event.source.channelId || event.channelId;
    if (type === 'joined' && channelId) {
      _onJoined(channelId);
    }
  }

  /**
   * Bot招待時: ルームを自動登録
   * @param {string} channelId
   */
  function _onJoined(channelId) {
    ensureRegistered(channelId);
  }

  /**
   * 未登録のルームを自動登録（既登録ならスキップ）
   * AuthService からも呼び出す
   * @param {string} channelId
   */
  function ensureRegistered(channelId, displayName) {
    if (!channelId) return;
    try {
      // ── ルーム登録 ──────────────────────────────
      var existing = RoomModel.getById(channelId);
      if (existing) {
        if (!existing.room_name || existing.room_name === channelId) {
          var updatedName = _fetchChannelName(channelId) || displayName || '';
          if (updatedName && updatedName !== channelId) {
            RoomModel.update(channelId, { room_name: updatedName });
          }
        }
      } else {
        var roomName = _fetchChannelName(channelId) || displayName || channelId;
        RoomModel.create({ room_id: channelId, room_name: roomName });
      }

      // ── メンバー保存 ─────────────────────────────
      _syncChannelMembers(channelId);
    } catch (e) {
      _writeLog('ルーム自動登録エラー', 'channelId:' + channelId + ' err:' + e.message);
    }
  }

  /**
   * チャンネルのメンバーをユーザーシートに同期（ページネーション対応）
   * @param {string} channelId
   */
  function _syncChannelMembers(channelId) {
    try {
      var props = PropertiesService.getScriptProperties();
      var botId = props.getProperty('LINEWORKS_BOT_ID');
      var token = NotificationService.getAccessToken();
      var cursor = null;

      do {
        var url = 'https://www.worksapis.com/v1.0/bots/' + botId + '/channels/' + channelId + '/members?limit=100';
        if (cursor) url += '&cursor=' + encodeURIComponent(cursor);

        var res = UrlFetchApp.fetch(url, {
          method: 'get',
          headers: { Authorization: 'Bearer ' + token },
          muteHttpExceptions: true,
          deadline: 10
        });

        if (res.getResponseCode() !== 200) break;

        var data = JSON.parse(res.getContentText());
        var members = data.members || [];

        members.forEach(function (m) {
          if (m.userId) {
            MemberModel.upsert(m.userId, m.displayName || '');
          }
        });

        cursor = data.responseMetaData && data.responseMetaData.nextCursor
          ? data.responseMetaData.nextCursor
          : null;

      } while (cursor);
    } catch (e) {
      _writeLog('メンバー同期エラー', 'channelId:' + channelId + ' err:' + e.message);
    }
  }

  /**
   * LINE WORKS API でチャンネル名を取得
   * @param {string} channelId
   * @returns {string|null}
   */
  function _fetchChannelName(channelId) {
    try {
      var props = PropertiesService.getScriptProperties();
      var botId = props.getProperty('LINEWORKS_BOT_ID');
      var token = NotificationService.getAccessToken();

      var res = UrlFetchApp.fetch(
        'https://www.worksapis.com/v1.0/bots/' + botId + '/channels/' + channelId,
        {
          method: 'get',
          headers: { Authorization: 'Bearer ' + token },
          muteHttpExceptions: true
        }
      );

      if (res.getResponseCode() !== 200) return null;
      var data = JSON.parse(res.getContentText());
      return data.title || data.channelName || data.name || null;
    } catch (e) {
      return null;
    }
  }

  return {
    handleEvent: handleEvent,
    ensureRegistered: ensureRegistered
  };
})();
