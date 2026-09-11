/* GK WORK — モバイル用ドロワーナビ
   CSP が script-src 'self' なので、インラインの onclick は使わず
   このファイルから配線する。開閉状態は button の aria-expanded が唯一の真で、
   表示の分岐は body.nav-open を CSS 側が読む。 */
(function () {
  'use strict';

  var toggle = document.getElementById('nav-toggle');
  var drawer = document.getElementById('nav-drawer');
  if (!toggle || !drawer) return;

  var LABEL_OPEN = 'メニューを開く';
  var LABEL_CLOSE = 'メニューを閉じる';

  function isOpen() {
    return toggle.getAttribute('aria-expanded') === 'true';
  }

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? LABEL_CLOSE : LABEL_OPEN);
    document.body.classList.toggle('nav-open', open);
  }

  function close(refocus) {
    if (!isOpen()) return;
    setOpen(false);
    if (refocus) toggle.focus();
  }

  toggle.addEventListener('click', function () {
    setOpen(!isOpen());
  });

  // 背景タップ、およびドロワー内リンクのタップで閉じる。
  drawer.addEventListener('click', function (e) {
    if (e.target.closest('[data-nav-close]') || e.target.closest('a')) close(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close(true);
  });

  // 開いたままデスクトップ幅に戻ると、リンク列とドロワーが二重になる。
  // 切り替え幅は index（home.css）が 900px、contact/404（style.css）が 860px と
  // 違うので、数値では判定しない。バーガー自体が CSS で消えた＝デスクトップ表示。
  window.addEventListener('resize', function () {
    if (window.getComputedStyle(toggle).display === 'none') close(false);
  });

  // JS 到達前に開いて見えることはないが、初期状態を明示しておく。
  setOpen(false);
})();
