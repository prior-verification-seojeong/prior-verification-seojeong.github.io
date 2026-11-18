(function () {
var API = 'https://script.google.com/macros/s/AKfycbwQKpB23Y3qUUBHvh1JHkaSyYuEF3KdxBzVvRLeXIlxVkv11siy0AZnWWDkw76rTs6j4w/exec';
var KEY = 'cp_admin_key';
var pending = null;
function getKey() { try { return sessionStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
function setKey(v) { try { sessionStorage.setItem(KEY, v); } catch (e) {} }
function askKey() {
if (pending) return pending;
pending = new Promise(function (resolve) {
var o = document.createElement('div');
o.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center';
o.innerHTML = '<form style="background:#fff;padding:24px;border-radius:8px;width:min(92vw,360px);font:14px sans-serif;color:#222"><b style="display:block;margin-bottom:12px;font-size:16px">관리자 키 입력</b><input type="password" autocomplete="current-password" placeholder="관리자 키" style="width:100%;box-sizing:border-box;height:40px;padding:0 10px;border:1px solid #bbb;border-radius:6px;font-size:15px"><div style="margin-top:14px;text-align:right"><button type="button" data-c="1" style="height:36px;padding:0 14px;margin-right:6px;cursor:pointer">취소</button><button type="submit" style="height:36px;padding:0 14px;background:#1c6fb0;color:#fff;border:0;border-radius:6px;cursor:pointer">확인</button></div></form>';
document.body.appendChild(o);
var f = o.firstChild, i = f.querySelector('input');
function done(v) { o.parentNode.removeChild(o); pending = null; resolve(v); }
f.onsubmit = function (e) { e.preventDefault(); done(i.value); };
f.querySelector('[data-c]').onclick = function () { done(''); };
setTimeout(function () { i.focus(); }, 0);
});
return pending;
}
function call(fn, args, tried) {
var sent = getKey();
var body = { fn: fn, args: args };
if (sent) body.key = sent;
return fetch(API, {
method: 'POST',
redirect: 'follow',
headers: { 'Content-Type': 'text/plain;charset=utf-8' },
body: JSON.stringify(body)
}).then(function (r) { return r.json(); }, function () {
throw new Error('서버에 연결하지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.');
}).then(function (j) {
if (j && j.ok) return j.result;
if (j && j.code === 'AUTH') {
if (tried) { setKey(''); throw new Error('관리자 키가 올바르지 않습니다.'); }
if (getKey() && getKey() !== sent) return call(fn, args, true);
return askKey().then(function (v) {
v = String(v || '').trim();
if (!v) throw new Error('관리자 키가 필요합니다.');
setKey(v);
return call(fn, args, true);
});
}
throw new Error((j && j.error) || '요청을 처리하지 못했습니다.');
});
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
