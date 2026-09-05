/* ==========================================================================
   GK CRAFT — コンタクトフォーム
   Google Apps Script のウェブアプリへ JSON を POST する。

   CORS について:
   GAS の doPost は OPTIONS プリフライトに応答できないため、
   Content-Type を "text/plain;charset=utf-8" にして
   「単純リクエスト」として送る。GAS 側は e.postData.contents を
   JSON.parse して受け取る。
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = window.GKCRAFT_CONFIG || {};
  var TIMEOUT_MS = 15000;

  var form = document.getElementById('contact-form');
  if (!form) return;

  var formPanel = document.getElementById('form-panel');
  var thanksPanel = document.getElementById('thanks-panel');
  var submitBtn = document.getElementById('submit-btn');
  var statusEl = document.getElementById('form-status');
  var resetBtn = document.getElementById('reset-btn');

  var FIELDS = ['topic', 'plan', 'timing', 'current', 'company', 'person', 'email', 'tel', 'other'];
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setStatus(message, state) {
    statusEl.textContent = message || '';
    if (state) {
      statusEl.setAttribute('data-state', state);
    } else {
      statusEl.removeAttribute('data-state');
    }
  }

  function markField(id, invalid) {
    var el = document.getElementById(id);
    if (!el) return;
    var field = el.closest('.field');
    if (!field) return;
    field.classList.toggle('is-invalid', invalid);
    el.setAttribute('aria-invalid', invalid ? 'true' : 'false');
    if (invalid) {
      el.setAttribute('aria-describedby', id + '-error');
    } else {
      el.removeAttribute('aria-describedby');
    }
  }

  /** 必須項目を検証し、最初の不正な項目の id を返す（問題なければ null）。 */
  function validate(values) {
    var firstInvalid = null;
    var checks = [
      ['company', values.company.length > 0],
      ['person', values.person.length > 0],
      ['email', EMAIL_RE.test(values.email)]
    ];
    checks.forEach(function (check) {
      var ok = check[1];
      markField(check[0], !ok);
      if (!ok && !firstInvalid) firstInvalid = check[0];
    });
    return firstInvalid;
  }

  function collect() {
    var values = {};
    FIELDS.forEach(function (name) {
      var el = document.getElementById(name);
      values[name] = el ? String(el.value || '').trim() : '';
    });
    return values;
  }

  function fallbackNotice() {
    var mail = CONFIG.FALLBACK_EMAIL || '';
    var tel = CONFIG.FALLBACK_TEL || '';
    return '送信できませんでした。時間をおいて再度お試しいただくか、'
      + (mail ? mail + ' ' : '')
      + (tel ? '／ お電話 ' + tel + ' ' : '')
      + 'へご連絡ください。';
  }

  function post(payload) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

    return fetch(CONFIG.GAS_ENDPOINT, {
      method: 'POST',
      // プリフライトを起こさないため text/plain で送る（本文は JSON）
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    }).then(function (text) {
      var data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('想定外の応答を受け取りました');
      }
      if (!data || data.ok !== true) {
        throw new Error((data && data.error) || '受付処理に失敗しました');
      }
      return data;
    }).finally(function () {
      clearTimeout(timer);
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    // ハニーポットに入力があれば bot。成功したように見せて何も送らない。
    var honeypot = document.getElementById('website');
    if (honeypot && honeypot.value) {
      showThanks();
      return;
    }

    var values = collect();
    var firstInvalid = validate(values);
    if (firstInvalid) {
      setStatus('未入力・不正な項目があります。', 'error');
      var el = document.getElementById(firstInvalid);
      if (el) el.focus();
      return;
    }

    if (!CONFIG.GAS_ENDPOINT || CONFIG.GAS_ENDPOINT.indexOf('PASTE_YOUR') === 0) {
      setStatus('送信先が未設定です。サイト管理者にお知らせください。', 'error');
      return;
    }

    submitBtn.disabled = true;
    setStatus('送信しています…');

    values.pageUrl = location.href;
    values.userAgent = navigator.userAgent;
    values.submittedAt = new Date().toISOString();

    post(values).then(function () {
      showThanks();
    }).catch(function (err) {
      submitBtn.disabled = false;
      setStatus(fallbackNotice(), 'error');
      if (window.console) console.error('[contact]', err);
    });
  });

  function showThanks() {
    formPanel.hidden = true;
    thanksPanel.hidden = false;
    setStatus('');
    submitBtn.disabled = false;
    thanksPanel.querySelector('h2').setAttribute('tabindex', '-1');
    thanksPanel.querySelector('h2').focus();
    thanksPanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      form.reset();
      FIELDS.forEach(function (id) { markField(id, false); });
      thanksPanel.hidden = true;
      formPanel.hidden = false;
      var first = document.getElementById('topic');
      if (first) first.focus();
    });
  }

  // 入力し直したらエラー表示を消す
  ['company', 'person', 'email'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function () { markField(id, false); });
  });
})();
