(function () {
  var API = 'https://script.google.com/macros/s/AKfycbwQKpB23Y3qUUBHvh1JHkaSyYuEF3KdxBzVvRLeXIlxVkv11siy0AZnWWDkw76rTs6j4w/exec';
  var KEY = 'cp_admin_key';
  function getKey() { try { return sessionStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function setKey(v) { try { sessionStorage.setItem(KEY, v); } catch (e) {} }
  function call(fn, args, tried) {
    var body = { fn: fn, args: args };
    var k = getKey();
    if (k) body.key = k;
    return fetch(API, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); }, function () {
      throw new Error('서버에 연결하지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.');
    }).then(function (j) {
      if (j && j.ok) return j.result;
      if (j && j.code === 'AUTH' && !tried) {
        var v = window.prompt('관리자 키를 입력하세요.');
        if (v) { setKey(v.trim()); return call(fn, args, true); }
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
