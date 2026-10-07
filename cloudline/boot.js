/* Cloudline 1.2.1 startup guard. No network, telemetry, or gameplay changes.
 * Kept separate from the main scripts so their parse/load errors can be shown.
 * A static HTML panel remains visible when no scripts can execute at all.
 */
(function () {
  'use strict';
  var panel = document.getElementById('bootPanel');
  if (!panel) return;
  var title = document.getElementById('bootTitle');
  var step = document.getElementById('bootStep');
  var advice = document.getElementById('bootAdvice');
  var details = document.getElementById('bootDetails');
  var copy = document.getElementById('bootCopy');
  var start = Date.now();
  var state = {version: '1.2.1', phase: 'scripts', javascript: true, firstFrame: false, ready: false, failed: false, loaded: [], error: ''};
  var timer = null;
  var framesPending = false;
  function diagnostic() {
    return JSON.stringify({bootVersion: state.version, phase: state.phase, javascript: true,
      firstFrame: state.firstFrame, ready: state.ready, error: state.error,
      loaded: state.loaded, viewport: [window.innerWidth, window.innerHeight],
      protocol: location.protocol, elapsedMs: Date.now() - start}, null, 2);
  }
  function paint() { details.textContent = diagnostic(); }
  function show() { panel.style.display = 'flex'; panel.setAttribute('aria-hidden', 'false'); }
  function hideLoading() {
    var loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');
  }
  function fail(message) {
    if (state.failed) return;
    state.failed = true; state.ready = false; state.phase = 'failed';
    state.error = String(message || '未知启动错误').slice(0, 1400);
    clearTimeout(timer); clearInterval(poll); hideLoading();
    title.textContent = '游戏未能启动';
    step.textContent = state.error;
    advice.textContent = /WebGL|着色|shader|图形|graphics/i.test(state.error)
      ? '3D 图形初始化失败。请在支持 WebGL 的浏览器页面中打开；可尝试关闭其他占用图形资源的页面后重试。'
      : '游戏脚本未能正常运行。若通过聊天附件预览打开，请改用可执行网页脚本的浏览器页面；若访问网站，请检查文件是否完整发布。';
    paint(); show();
  }
  function check() {
    if (state.failed || state.ready) return;
    var fatal = document.getElementById('fatal');
    if (fatal && !fatal.classList.contains('hidden')) {
      fail(document.getElementById('fatalText').textContent); return;
    }
    var app = window.__cloudline;
    var button = document.getElementById('startBtn');
    if (!app || !button || button.disabled) return;
    if (!app.renderer || !app.renderer.gl || app.renderer.lost) {
      fail('WebGL 图形上下文不可用。'); return;
    }
    if (framesPending) return;
    framesPending = true; state.phase = 'first-frame';
    step.textContent = '3D 初始化完成，正在确认第一帧。'; paint();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (state.failed) return;
        if (app.renderer.lost) { fail('WebGL 图形上下文已丢失。'); return; }
        if (!app.renderer.drawCalls) {
          framesPending = false; return;
        }
        state.firstFrame = true; state.ready = true; state.phase = 'ready';
        clearTimeout(timer); clearInterval(poll); paint(); hideLoading();
        panel.style.display = 'none'; panel.setAttribute('aria-hidden', 'true');
      });
    });
  }
  window.CloudlineBoot = {state: state, check: check, fail: fail, diagnostic: diagnostic};
  title.textContent = '正在启动游戏';
  step.textContent = 'JavaScript 已执行；正在加载游戏代码并初始化 3D。';
  advice.textContent = '只有确认画面实际绘制后，才会显示可玩的游戏界面。';
  copy.disabled = false;
  copy.onclick = function () {
    var report = diagnostic(); details.textContent = report;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(report).then(function () {
        copy.textContent = '诊断信息已复制';
      }, function () { copy.textContent = '请长按选择下方诊断文字'; });
    } else { copy.textContent = '请长按选择下方诊断文字'; }
  };
  window.addEventListener('error', function (event) {
    var el = event.target;
    if (el && el.tagName === 'SCRIPT') {
      fail('脚本加载失败：' + String(el.src || '内嵌脚本').split('/').pop().split('?')[0]);
    } else if (!state.ready && event.message) {
      fail(event.message + (event.lineno ? '（第 ' + event.lineno + ' 行）' : ''));
    }
  }, true);
  window.addEventListener('unhandledrejection', function (event) {
    if (!state.ready) fail(event.reason && event.reason.message || event.reason || '异步启动失败');
  });
  document.addEventListener('load', function (event) {
    if (event.target && event.target.tagName === 'SCRIPT') {
      state.loaded.push(String(event.target.src || 'inline').split('/').pop().split('?')[0]);
      if (!state.failed && !state.ready) {
        step.textContent = '游戏脚本加载中：' + state.loaded.length + ' 个文件已完成。'; paint(); check();
      }
    }
  }, true);
  document.addEventListener('securitypolicyviolation', function (event) {
    if (!state.ready && /script-src/.test(event.effectiveDirective || '')) {
      fail('当前页面的安全策略阻止了游戏脚本执行。');
    }
  });
  var poll = setInterval(check, 200);
  timer = setTimeout(function () {
    if (state.ready || state.failed) return;
    state.phase = 'timeout';
    title.textContent = '启动尚未完成';
    step.textContent = '已等待 15 秒，尚未确认游戏第一帧。';
    advice.textContent = '这不表示仍在下载机场。请复制下方诊断信息，检查脚本加载或当前打开环境；本页会继续检测是否恢复。';
    paint(); show();
  }, 15000);
  paint();
})();
