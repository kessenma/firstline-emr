/**
 * Simple console capture client for React Native.
 * No dependencies, no compilation helpers needed.
 */

var SERVER_URL = 'http://localhost:9093';
var logBuffer = [];
var flushTimer = null;
var BATCH_INTERVAL = 1000;
var originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  info: console.info
};

function flushLogs() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (logBuffer.length === 0) return;

  var logs = logBuffer.slice();
  logBuffer = [];

  fetch(SERVER_URL + '/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logs: logs })
  }).catch(function() {});
}

function formatArg(arg) {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return arg.name + ': ' + arg.message;
  try {
    return JSON.stringify(arg);
  } catch (e) {
    return String(arg);
  }
}

function createInterceptor(type, original) {
  return function() {
    var args = Array.prototype.slice.call(arguments);
    original.apply(console, args);

    var tag = 'console';
    var message = args.map(formatArg).join(' ');

    if (typeof args[0] === 'string') {
      var match = args[0].match(/^\[([^\]]+)\]/);
      if (match) tag = match[1];
    }

    var entry = {
      type: type,
      message: message,
      tag: tag,
      timestamp: new Date().toISOString()
    };

    if (args.length > 1) {
      try {
        entry.data = args.length === 2 ? args[1] : args.slice(1);
      } catch (e) {}
    }

    logBuffer.push(entry);
    if (!flushTimer) {
      flushTimer = setTimeout(flushLogs, BATCH_INTERVAL);
    }
  };
}

function enableConsoleCapture(options) {
  options = options || {};
  if (options.serverUrl) SERVER_URL = options.serverUrl;

  console.log = createInterceptor('info', originalConsole.log);
  console.info = createInterceptor('info', originalConsole.info);
  console.warn = createInterceptor('warn', originalConsole.warn);
  console.error = createInterceptor('error', originalConsole.error);
  console.debug = createInterceptor('debug', originalConsole.debug);
}

function disableConsoleCapture() {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
}

module.exports = {
  enableConsoleCapture: enableConsoleCapture,
  disableConsoleCapture: disableConsoleCapture
};
