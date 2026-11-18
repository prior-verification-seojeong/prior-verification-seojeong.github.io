(function () {
var API = 'https://script.google.com/macros/s/AKfycbwQKpB23Y3qUUBHvh1JHkaSyYuEF3KdxBzVvRLeXIlxVkv11siy0AZnWWDkw76rTs6j4w/exec';
var KEY = 'cp_admin_key';
var pending = null, inflight = 0, verifying = false, showTimer = null;
function getKey() { try { return sessionStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
function setKey(v) { try { sessionStorage.setItem(KEY, v); } catch (e) {} }

// ---------- 로딩 표시 ----------
var css = '#apiLoad{position:fixed;top:0;left:0;right:0;height:3px;z-index:9500;overflow:hidden;opacity:0;transition:opacity .2s;pointer-events:none}#apiLoad.on{opacity:1}#apiLoad i{position:absolute;top:0;left:-30%;width:30%;height:100%;background:linear-gradient(90deg,transparent,#2e86c1,transparent);animation:apiSlide 1.1s ease-in-out infinite}' +
  '#apiPill{position:fixed;right:20px;bottom:20px;z-index:9500;display:none;align-items:center;gap:8px;padding:9px 14px;border-radius:999px;background:#1b2233;color:#fff;font-size:13px;font-weight:600;box-shadow:0 10px 24px -10px rgba(27,34,51,.6)}#apiPill.on{display:flex}' +
  '.api-spin{width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;animation:apiRot .8s linear infinite}' +
  '#apiVerify{position:fixed;inset:0;z-index:99998;display:none;align-items:center;justify-content:center;background:rgba(244,246,250,.75);backdrop-filter:blur(2px)}#apiVerify.on{display:flex}#apiVerify .card{display:flex;flex-direction:column;align-items:center;gap:10px;min-width:280px;padding:26px 30px;border-radius:10px;background:#fff;box-shadow:0 18px 40px -12px rgba(27,34,51,.35);text-align:center;font-family:inherit}#apiVerify b{font-size:16px;color:#1b2233}#apiVerify span{font-size:13px;color:#5a6577}' +
  '#apiVerify .big{width:40px;height:40px;border-radius:50%;border:4px solid #dbe6f3;border-top-color:#2e86c1;animation:apiRot .8s linear infinite}' +
  '@keyframes apiRot{to{transform:rotate(360deg)}}@keyframes apiSlide{0%{left:-30%}100%{left:100%}}';
function ui() {
  if (document.getElementById('apiLoad') || !document.body) return;
  var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
  var bar = document.createElement('div'); bar.id = 'apiLoad'; bar.innerHTML = '<i></i>'; document.body.appendChild(bar);
  var pill = document.createElement('div'); pill.id = 'apiPill'; pill.setAttribute('role', 'status'); pill.innerHTML = '<span class="api-spin"></span><span>데이터를 불러오는 중…</span>'; document.body.appendChild(pill);
  var v = document.createElement('div'); v.id = 'apiVerify'; v.setAttribute('role', 'status'); v.innerHTML = '<div class="card"><div class="big"></div><b>관리자 키를 확인하는 중입니다…</b><span>확인되면 현황과 이력을 불러옵니다.</span></div>'; document.body.appendChild(v);
}
function refresh() {
  ui();
  var bar = document.getElementById('apiLoad'), pill = document.getElementById('apiPill'), v = document.getElementById('apiVerify');
  if (!bar) return;
  if (inflight > 0) {
    bar.classList.add('on');
    if (!showTimer) showTimer = setTimeout(function () { if (inflight > 0) pill.classList.add('on'); }, 400);
  } else {
    bar.classList.remove('on'); pill.classList.remove('on'); clearTimeout(showTimer); showTimer = null;
  }
  v.classList.toggle('on', verifying);
}
function begin() { inflight++; refresh(); }
function end() { inflight = Math.max(0, inflight - 1); refresh(); }

// ---------- 관리자 키 입력 ----------
function askKey() {
  if (pending) return pending;
  pending = new Promise(function (resolve) {
    var o = document.createElement('div');
    o.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center';
    o.innerHTML = '<form style="background:#fff;padding:24px;border-radius:8px;width:min(92vw,360px);font:14px sans-serif;color:#222"><b style="display:block;margin-bottom:12px;font-size:16px">관리자 키 입력</b><input type="password" autocomplete="current-password" placeholder="관리자 키" style="width:100%;box-sizing:border-box;height:40px;padding:0 10px;border:1px solid #bbb;border-radius:6px;font-size:15px"><div style="margin-top:14px;text-align:right"><button type="button" data-c="1" style="height:36px;padding:0 14px;margin-right:6px;cursor:pointer">취소</button><button type="submit" style="height:36px;padding:0 14px;background:#1c6fb0;color:#fff;border:0;border-radius:6px;cursor:pointer">확인</button></div></form>';
    document.body.appendChild(o);
    var f = o.firstChild, i = f.querySelector('input');
    function done(v) { o.parentNode.removeChild(o); pending = null; if (String(v || '').trim()) { verifying = true; refresh(); } resolve(v); }
    f.onsubmit = function (e) { e.preventDefault(); done(i.value); };
    f.querySelector('[data-c]').onclick = function () { done(''); };
    setTimeout(function () { i.focus(); }, 0);
  });
  return pending;
}

// ---------- 서버 호출 ----------
function call(fn, args, tried) {
  var sent = getKey();
  var body = { fn: fn, args: args };
  if (sent) body.key = sent;
  begin();
  return fetch(API, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  }).then(function (r) { return r.json(); }, function () {
    throw new Error('서버에 연결하지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.');
  }).then(function (j) {
    end();
    if (j && j.ok) { if (verifying) { verifying = false; refresh(); } return j.result; }
    if (j && j.code === 'AUTH') {
      if (tried) { setKey(''); verifying = false; refresh(); throw new Error('관리자 키가 올바르지 않습니다.'); }
      if (getKey() && getKey() !== sent) return call(fn, args, true);
      return askKey().then(function (v) {
        v = String(v || '').trim();
        if (!v) throw new Error('관리자 키가 필요합니다.');
        setKey(v);
        return call(fn, args, true);
      });
    }
    if (verifying) { verifying = false; refresh(); }
    throw new Error((j && j.error) || '요청을 처리하지 못했습니다.');
  }, function (e) { end(); if (verifying) { verifying = false; refresh(); } throw e; });
}
function make(ok, fail) {
  return new Proxy({}, {
    get: function (_, name) {
      if (name === 'withSuccessHandler') return function (f) { return make(f, fail); };
      if (name === 'withFailureHandler') return function (f) { return make(ok, f); };
      return function () {
        var a = Array.prototype.slice.call(arguments);
        call(String(name), a).then(function (r) { if (ok) ok(r); }, function (e) { if (fail) fail(e); else console.error(e); });
      };
    }
  });
}
window.google = { script: { run: make(null, null) } };
})();
