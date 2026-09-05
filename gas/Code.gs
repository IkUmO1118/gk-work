/**
 * GK WORK — コンタクトフォーム受信スクリプト
 *
 * 役割は 2 つ:
 *   1. 送信内容を Google スプレッドシートに 1 行追記する
 *   2. 管理者へ通知メール、送信者へ自動返信メールを送る
 *
 * 設定値はコードに直書きせず、スクリプトプロパティから読む。
 * 設定手順は gas/README.md を参照。
 *
 * 必要なスクリプトプロパティ:
 *   SHEET_ID      … 保存先スプレッドシートの ID（URL の /d/ と /edit の間）
 *   NOTIFY_EMAIL  … 通知メールの宛先（カンマ区切りで複数可）
 *   ALLOW_ORIGIN  … 任意。指定するとその Origin 以外の送信を拒否する
 */

var SHEET_NAME = '問い合わせ';
var HEADERS = [
  '受信日時', '会社名', 'ご担当者名', 'メールアドレス', '電話番号',
  'ご相談内容', 'ご希望のプラン', '公開希望時期', '現在のHP', 'その他',
  '送信元URL', 'User-Agent'
];

/** ブラウザから URL を開いたときの死活確認用。 */
function doGet() {
  return json({ ok: true, service: 'GK WORK contact endpoint' });
}

function doPost(e) {
  try {
    var data = parseBody(e);

    // ハニーポット。bot は隠しフィールドを埋めるので、成功を返して黙って捨てる。
    if (data.website) {
      return json({ ok: true });
    }

    var errors = validate(data);
    if (errors.length) {
      return json({ ok: false, error: errors.join(' / ') });
    }

    var record = normalize(data);

    var sheetUrl = appendToSheet(record);   // 1. スプレッドシートへ保存
    notifyByEmail(record, sheetUrl);        // 2. メール通知（保存が済んでから）

    return json({ ok: true });
  } catch (err) {
    // 失敗しても実行ログには残るので、原因は Apps Script の実行数から追える
    console.error(err);
    return json({ ok: false, error: '処理中にエラーが発生しました' });
  }
}

// ---------------------------------------------------------------------------
// 入力の取り出しと検証
// ---------------------------------------------------------------------------

function parseBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('リクエスト本文がありません');
  }
  return JSON.parse(e.postData.contents);
}

function validate(data) {
  var errors = [];
  if (!str(data.company)) errors.push('会社名が未入力です');
  if (!str(data.person)) errors.push('ご担当者名が未入力です');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(str(data.email))) {
    errors.push('メールアドレスの形式が不正です');
  }
  if (str(data.other).length > 5000) errors.push('本文が長すぎます');
  return errors;
}

/** 受け取った値を、シートの列順に対応する固定形へ落とす。 */
function normalize(data) {
  return {
    receivedAt: new Date(),
    company: str(data.company, 200),
    person: str(data.person, 100),
    email: str(data.email, 200),
    tel: str(data.tel, 40),
    topic: str(data.topic, 100),
    plan: str(data.plan, 100),
    timing: str(data.timing, 100),
    current: str(data.current, 100),
    other: str(data.other, 5000),
    pageUrl: str(data.pageUrl, 500),
    userAgent: str(data.userAgent, 500)
  };
}

function str(value, max) {
  var s = (value === null || value === undefined) ? '' : String(value).trim();
  return max ? s.slice(0, max) : s;
}

// ---------------------------------------------------------------------------
// 1. スプレッドシートへの保存
// ---------------------------------------------------------------------------

/** 1 行追記し、通知メールに載せるシートの URL を返す。 */
function appendToSheet(r) {
  var sheet = getSheet();
  sheet.appendRow([
    r.receivedAt, r.company, r.person, r.email, r.tel,
    r.topic, r.plan, r.timing, r.current, r.other,
    r.pageUrl, r.userAgent
  ]);
  return sheet.getParent().getUrl();
}

function getSheet() {
  var id = prop('SHEET_ID', true);
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  }
  return sheet;
}

// ---------------------------------------------------------------------------
// 2. メール通知
// ---------------------------------------------------------------------------

function notifyByEmail(r, sheetUrl) {
  var to = prop('NOTIFY_EMAIL', true);

  var body = [
    '無料相談の申し込みがありました。',
    '',
    '受信日時 : ' + Utilities.formatDate(r.receivedAt, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
    '会社名   : ' + r.company,
    '担当者名 : ' + r.person,
    'メール   : ' + r.email,
    '電話番号 : ' + (r.tel || '（未入力）'),
    '',
    'ご相談内容     : ' + r.topic,
    'ご希望のプラン : ' + r.plan,
    '公開希望時期   : ' + r.timing,
    '現在のHP       : ' + r.current,
    '',
    'その他・伝えたいこと:',
    r.other || '（未入力）',
    '',
    '---',
    '送信元: ' + r.pageUrl,
    'シート: ' + sheetUrl
  ].join('\n');

  MailApp.sendEmail({
    to: to,
    subject: '【GK WORK】無料相談の申し込み — ' + r.company,
    body: body,
    replyTo: r.email,
    name: 'GK WORK サイト'
  });

  sendAutoReply(r);
}

/** 送信者への自動返信。失敗しても受付自体は成功とみなす。 */
function sendAutoReply(r) {
  try {
    var body = [
      r.company + '　' + r.person + ' 様',
      '',
      'GK WORK です。無料相談のお申し込みをいただき、ありがとうございます。',
      '以下の内容で承りました。2営業日以内にご返信します。',
      '',
      '─────────────────────',
      'ご相談内容     : ' + r.topic,
      'ご希望のプラン : ' + r.plan,
      '公開希望時期   : ' + r.timing,
      '現在のHP       : ' + r.current,
      'その他         : ' + (r.other || '（未入力）'),
      '─────────────────────',
      '',
      'お急ぎの場合は 050-3590-0212（平日 10:00–18:00）へお電話ください。',
      '',
      'GK WORK',
      '050-3590-0212 / 東京都',
      'https://gk-work.netlify.app/'
    ].join('\n');

    MailApp.sendEmail({
      to: r.email,
      subject: '【GK WORK】お申し込みを受け付けました',
      body: body,
      name: 'GK WORK'
    });
  } catch (err) {
    console.error('自動返信の送信に失敗: ' + err);
  }
}

// ---------------------------------------------------------------------------
// 共通
// ---------------------------------------------------------------------------

function prop(key, required) {
  var value = PropertiesService.getScriptProperties().getProperty(key);
  if (required && !value) {
    throw new Error('スクリプトプロパティ ' + key + ' が未設定です');
  }
  return value;
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// 動作確認用。エディタから実行して、シートとメールの両方を確かめる。
// ---------------------------------------------------------------------------

function testSubmit() {
  var res = doPost({
    postData: {
      contents: JSON.stringify({
        company: 'テスト株式会社',
        person: '山田 太郎',
        email: prop('NOTIFY_EMAIL', true).split(',')[0].trim(),
        tel: '03-0000-0000',
        topic: '新規でHPを作りたい',
        plan: 'スタンダード（〜10ページ・298,000円）',
        timing: '3ヶ月以内',
        current: 'ない',
        other: 'これはテスト送信です。',
        pageUrl: 'https://gk-work.netlify.app/contact.html',
        userAgent: 'Apps Script test'
      })
    }
  });
  console.log(res.getContent());
}
