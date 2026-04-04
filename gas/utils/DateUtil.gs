/**
 * DateUtil.gs
 * 日付計算ユーティリティ
 */

var DateUtil = (function () {

  /**
   * 今日の日付を YYYY-MM-DD 文字列で返す
   * @returns {string}
   */
  function getToday() {
    return formatDate(new Date());
  }

  /**
   * Date を YYYY-MM-DD 文字列に変換
   * @param {Date} date
   * @returns {string}
   */
  function formatDate(date) {
    var y = date.getFullYear();
    var m = ('0' + (date.getMonth() + 1)).slice(-2);
    var d = ('0' + date.getDate()).slice(-2);
    return y + '-' + m + '-' + d;
  }

  /**
   * YYYY-MM-DD 文字列を Date に変換
   * @param {string} str
   * @returns {Date}
   */
  function parseDate(str) {
    if (str instanceof Date) return str;
    var parts = String(str).split('-');
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  /**
   * 日付に指定日数を加算
   * @param {string|Date} dateOrStr
   * @param {number} days
   * @returns {string} YYYY-MM-DD
   */
  function addDays(dateOrStr, days) {
    var date = parseDate(dateOrStr);
    date.setDate(date.getDate() + Number(days));
    return formatDate(date);
  }

  /**
   * 2つの日付の差分日数（date2 - date1）
   * @param {string|Date} date1
   * @param {string|Date} date2
   * @returns {number}
   */
  function diffDays(date1, date2) {
    var d1 = parseDate(date1);
    var d2 = parseDate(date2);
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  }

  return {
    getToday: getToday,
    formatDate: formatDate,
    parseDate: parseDate,
    addDays: addDays,
    diffDays: diffDays
  };
})();
