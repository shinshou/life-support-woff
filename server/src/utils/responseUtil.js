'use strict';

function success(data) {
  return { success: true, data: data ?? null, error: null };
}

function error(message, code = 400) {
  return { success: false, data: null, error: message, code };
}

module.exports = { success, error };
