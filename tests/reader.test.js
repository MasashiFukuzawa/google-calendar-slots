import assert from "node:assert/strict";
import test from "node:test";
import "../extension/core.js";
import "../extension/reader.js";

const { readDate, readTimeRange } = globalThis.CalendarFreeSlots;

// 実画面で観測した日本語のラベル形式。予定名・アカウント情報は架空データに置換。
test("年を含む日本語の日付だけを採用し、年の推測をしない", () => {
  assert.equal(readDate("2037年10月26日、月曜日"), "2037-10-26");
  assert.equal(readDate("10月26日、月曜日"), null);
  assert.equal(readDate("2037年2月30日"), null);
});

test("午前午後・24時間・全角の明示された時刻範囲を読む", () => {
  assert.deepEqual(readTimeRange("午前10時から午前11時まで、予定"), {
    start: 600,
    end: 660,
  });
  assert.deepEqual(readTimeRange("午後1時30分～午後2時30分、予定"), {
    start: 810,
    end: 870,
  });
  assert.deepEqual(readTimeRange("１０：００〜１１：００、予定"), {
    start: 600,
    end: 660,
  });
  assert.deepEqual(readTimeRange("午後12時〜午後1時、予定"), {
    start: 720,
    end: 780,
  });
});

test("タイトル中の数字・開始だけの時刻・日付またぎを推測しない", () => {
  assert.equal(readTimeRange("予定 10:00〜11:00"), null);
  assert.equal(readTimeRange("午後1時、予定"), null);
  assert.equal(readTimeRange("午後11時〜午前1時、予定"), null);
  assert.equal(readTimeRange("10:90〜11:30、予定"), null);
});

test("年が省略された列の日付を表示期間の見出しと照合する", () => {
  const { resolveColumnDate } = globalThis.CalendarFreeSlots;
  assert.equal(
    resolveColumnDate("2 件の予定、11月 1日 (日曜日)", "2037-10-26"),
    "2037-11-01",
  );
  assert.equal(
    resolveColumnDate("予定はありません、1月 1日 (金曜日)", "2037-12-28"),
    "2038-01-01",
  );
  assert.equal(resolveColumnDate("10月 26日 (月曜日)", null), null);
  assert.equal(resolveColumnDate("6月 1日", "2037-10-26"), null);
});

test("日付つきの23時から翌0時の予定をその日の終わりまで除外する", () => {
  const { readEventInterval } = globalThis.CalendarFreeSlots;
  assert.deepEqual(
    readEventInterval(
      "2037年 10月 26日 午後11時～2037年 10月 27日 午前12時、「予定」、",
      "2037-10-26",
    ),
    { start: 1380, end: 1440 },
  );
});

test("日付またぎの予定を各列の日付で切り分ける", () => {
  const { readEventInterval } = globalThis.CalendarFreeSlots;
  const label = "2037年 12月 31日 午後5時～2038年 1月 1日 午前11時、「予定」、";
  assert.deepEqual(readEventInterval(label, "2037-12-31"), {
    start: 1020,
    end: 1440,
  });
  assert.deepEqual(readEventInterval(label, "2038-01-01"), {
    start: 0,
    end: 660,
  });
});

test("予定タイトル中の日付ではなく末尾の開催日と列の日付を照合する", () => {
  const { readEventInterval } = globalThis.CalendarFreeSlots;
  const label =
    "午後1:30～午後2時、「2037年 12月 1日について相談」、2037年 10月 26日";
  assert.deepEqual(readEventInterval(label, "2037-10-26"), {
    start: 810,
    end: 840,
  });
  assert.equal(readEventInterval(label, "2037-12-01"), null);
});
