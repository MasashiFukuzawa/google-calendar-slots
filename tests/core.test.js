import assert from "node:assert/strict";
import test from "node:test";
import "../extension/core.js";

const { findFreeSlots, formatSlots, validateSettings, defaults } =
  globalThis.CalendarFreeSlots;
const date = "2037-10-26";
const event = (start, end) => ({ date, start, end });

test("60分ちょうどの空きは含め、59分の空きは含めない", () => {
  const result = findFreeSlots([date], [event(600, 660), event(719, 1200)]);
  assert.deepEqual(result, [
    {
      date,
      slots: [
        { start: 540, end: 600 },
        { start: 1200, end: 1260 },
      ],
    },
  ]);
});

test("複数カレンダーの重複・包含・隣接する予定をまとめて除外する", () => {
  const result = findFreeSlots(
    [date],
    [
      event(720, 810),
      event(660, 750),
      event(680, 700),
      event(810, 900),
      event(660, 750),
    ],
  );
  assert.deepEqual(result[0].slots, [
    { start: 540, end: 660 },
    { start: 900, end: 1260 },
  ]);
});

test("対象時間をまたぐ予定を除外する", () => {
  const result = findFreeSlots([date], [event(0, 660), event(1020, 1440)]);
  assert.deepEqual(result[0].slots, [{ start: 660, end: 1020 }]);
});

test("予定がなければ対象時間全体、終日予定があれば空きなし", () => {
  assert.deepEqual(findFreeSlots([date], [])[0].slots, [
    { start: 540, end: 1260 },
  ]);
  assert.deepEqual(findFreeSlots([date], [event(0, 1440)])[0].slots, []);
});

test("7日表示は月またぎと土日を含めて表示順のまま出力する", () => {
  const dates = [
    date,
    "2037-10-27",
    "2037-10-28",
    "2037-10-29",
    "2037-10-30",
    "2037-10-31",
    "2037-11-01",
  ];
  const result = formatSlots(findFreeSlots(dates, []));
  assert.equal(
    result,
    "・10/26(月) 9:00〜21:00\n・10/27(火) 9:00〜21:00\n・10/28(水) 9:00〜21:00\n・10/29(木) 9:00〜21:00\n・10/30(金) 9:00〜21:00\n・10/31(土) 9:00〜21:00\n・11/1(日) 9:00〜21:00",
  );
});

test("空きがない日はコピー文面から除き、全日空きなしなら空文字を返す", () => {
  assert.equal(formatSlots(findFreeSlots([date], [event(0, 1440)])), "");
});

test("壊れた予定を空き扱いで無視しない", () => {
  assert.throws(() => findFreeSlots([date], [event(NaN, 900)]));
  assert.throws(() => findFreeSlots([date], [event(900, 800)]));
  assert.throws(() => findFreeSlots(["2037-02-30"], []));
});

test("30分を選ぶと30分ちょうどを含め、29分の空きを除外する", () => {
  const result = findFreeSlots([date], [event(570, 600), event(629, 1260)], {
    ...defaults,
    minimumMinutes: 30,
  });
  assert.deepEqual(result[0].slots, [{ start: 540, end: 570 }]);
});

test("同じ予定でも60分指定では30分の空きを出さない", () => {
  const result = findFreeSlots([date], [event(570, 600), event(629, 1260)], {
    ...defaults,
    minimumMinutes: 60,
  });
  assert.deepEqual(result[0].slots, []);
});

test("保存済みの時間帯と30分設定をそのまま適用する", () => {
  const settings = validateSettings({
    ...defaults,
    startMinute: 600,
    endMinute: 1080,
    minimumMinutes: 30,
  });
  assert.deepEqual(findFreeSlots([date], [], settings)[0].slots, [
    { start: 600, end: 1080 },
  ]);
});

test("設定にない最小長を保存しない", () => {
  assert.throws(() => validateSettings({ ...defaults, minimumMinutes: 45 }));
});
