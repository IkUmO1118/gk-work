/* GK WORK — よくある質問の絞り込み
   カテゴリのピルとキーワード検索で、質問カードの表示・非表示を切り替える。

   CSP が script-src 'self' なので、インラインの onclick は使わずここから配線する。
   JS が動かない環境では全件が出たままになる（絞り込みだけが効かない）。
   検索対象は質問文＋回答文の両方。data-category は HTML 側が持つ。 */
(function () {
  'use strict';

  var list = document.getElementById('faq-list');
  if (!list) return;

  var items = Array.prototype.slice.call(list.querySelectorAll('.faq-item'));
  var cats = Array.prototype.slice.call(document.querySelectorAll('.faq-cat'));
  var search = document.getElementById('faq-search');
  var empty = document.getElementById('faq-empty');

  var current = 'all';

  // 検索用のテキストは最初に一度だけ作る。毎回 textContent を読むと
  // 入力のたびに全件分のレイアウト参照が走る。
  var haystacks = items.map(function (item) {
    return item.textContent.replace(/\s+/g, '').toLowerCase();
  });

  function apply() {
    var q = search ? search.value.replace(/\s+/g, '').toLowerCase() : '';
    var shown = 0;

    items.forEach(function (item, i) {
      var okCat = current === 'all' || item.getAttribute('data-category') === current;
      var okText = !q || haystacks[i].indexOf(q) !== -1;
      var show = okCat && okText;
      item.hidden = !show;
      if (show) shown++;
    });

    if (empty) empty.hidden = shown > 0;
  }

  cats.forEach(function (btn) {
    btn.addEventListener('click', function () {
      current = btn.getAttribute('data-category') || 'all';
      cats.forEach(function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      apply();
    });
  });

  if (search) {
    search.addEventListener('input', apply);
    // 検索欄で Enter を押してもフォーム送信は起きないが、
    // IME 確定の Enter で意図せず何かが動かないよう明示的に止める。
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') e.preventDefault();
    });
  }

  apply();
})();
