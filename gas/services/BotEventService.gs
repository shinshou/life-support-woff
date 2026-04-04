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
      var existing = RoomModel.getById(channelId);
      if (existing) {
        // 名前がプレースホルダー（channelIdそのもの or 空）なら更新
        if (!existing.room_name || existing.room_name === channelId) {
          var updatedName = channelId.indexOf('user_') === 0
            ? (displayName || '')
            : (_fetchChannelName(channelId) || '');
          if (updatedName && updatedName !== channelId) {
            RoomModel.update(channelId, { room_name: updatedName });
          }
        }
        return;
      }
      // 新規登録
      var roomName = channelId.indexOf('user_') === 0
        ? (displayName || channelId)
        : (_fetchChannelName(channelId) || channelId);
      RoomModel.create({ room_id: channelId, room_name: roomName });
    } catch (e) {
      _writeLog('ルーム自動登録エラー', 'channelId:' + channelId + ' err:' + e.message);
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
      return data.channelName || data.name || null;
    } catch (e) {
      return null;
    }
  }

  return {
    handleEvent: handleEvent,
    ensureRegistered: ensureRegistered
  };
})();
