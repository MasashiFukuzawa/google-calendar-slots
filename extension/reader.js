(() => {
  const api = globalThis.CalendarFreeSlots;

  function readDate(text) {
    const match = text
      .normalize("NFKC")
      .match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
    if (!match) return null;
    const date = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
    return api.validDate(date) ? date : null;
  }

  function accessibleText(element, document) {
    const labelled = element.getAttribute("aria-labelledby");
    if (labelled) {
      const text = labelled
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ")
        .trim();
      if (text) return text;
    }
    if (element.getAttribute("aria-label"))
      return element.getAttribute("aria-label");
    const copy = element.cloneNode(true);
    copy.querySelectorAll('[aria-hidden="true"]').forEach((node) => {
      node.remove();
    });
    return copy.textContent || "";
  }

  function rendered(element) {
    // ビューポート外・スクロール外の予定も残す。display:none の予定だけを除く。
    const style = element.ownerDocument.defaultView.getComputedStyle(element);
    return (
      element.getClientRects().length > 0 &&
      style.visibility !== "hidden" &&
      style.visibility !== "collapse"
    );
  }

  const clockPattern =
    "(?:午前|午後)?\\s*\\d{1,2}(?:時(?:\\s*\\d{1,2}分?)?|:\\d{2})";

  function readClock(text, defaultPeriod = "") {
    const match = text
      .trim()
      .match(/^(午前|午後)?\s*(\d{1,2})(?:時(?:\s*(\d{1,2})分?)?|:(\d{2}))$/);
    if (!match) return null;
    const hour = Number(match[2]);
    const minute = Number(match[3] ?? match[4] ?? 0);
    const period = match[1] || defaultPeriod;
    if (
      minute > 59 ||
      hour > (period ? 12 : 24) ||
      (hour === 24 && minute !== 0)
    )
      return null;
    return (
      (period ? (hour % 12) + (period === "午後" ? 12 : 0) : hour) * 60 + minute
    );
  }

  function readTimeRange(text) {
    const normalized = text.normalize("NFKC").trim();
    const match = normalized.match(
      new RegExp(
        `^(${clockPattern})\\s*(?:から|[~〜～–—−-])\\s*(${clockPattern})(?:まで)?(?=\\s|[、,。]|$)`,
      ),
    );
    if (!match) return null;
    const start = readClock(match[1]);
    const end = readClock(match[2], match[1].match(/^(午前|午後)/)?.[1] || "");
    if (start === null || end === null || start >= end) return null;
    return { start, end };
  }

  function resolveColumnDate(label, anchor) {
    const full = readDate(label);
    if (full) return full;
    const match = label.normalize("NFKC").match(/(\d{1,2})月\s*(\d{1,2})日/);
    if (!match || !anchor) return null;
    const origin = Date.parse(`${anchor}T00:00:00Z`);
    const matches = [];
    for (let offset = -6; offset <= 6; offset++) {
      const date = new Date(origin + offset * 86400000);
      if (
        date.getUTCMonth() + 1 === Number(match[1]) &&
        date.getUTCDate() === Number(match[2])
      ) {
        matches.push(date.toISOString().slice(0, 10));
      }
    }
    return matches.length === 1 ? matches[0] : null;
  }

  function readEventInterval(text, date) {
    const normalized = text.normalize("NFKC").trim();
    const boundary = "(?=\\s|[、,。]|$)";
    const dated = normalized.match(
      new RegExp(
        `^(\\d{4}年\\s*\\d{1,2}月\\s*\\d{1,2}日)\\s+(.+?)\\s*[~〜～–—−-]\\s*(\\d{4}年\\s*\\d{1,2}月\\s*\\d{1,2}日)\\s+(.+?)${boundary}`,
      ),
    );
    if (!dated) {
      const trailing = normalized.match(
        /(\d{4}年\s*\d{1,2}月\s*\d{1,2}日)\s*$/,
      );
      if (!trailing || readDate(trailing[1]) !== date) return null;
      return readTimeRange(normalized);
    }
    const startDate = readDate(dated[1]);
    const endDate = readDate(dated[3]);
    if (!startDate || !endDate) return null;
    const startClock = readClock(dated[2]);
    const endClock = readClock(dated[4]);
    if (startClock === null || endClock === null) return null;
    const start = Date.parse(`${startDate}T00:00:00Z`) / 60000 + startClock;
    const end = Date.parse(`${endDate}T00:00:00Z`) / 60000 + endClock;
    const day = Date.parse(`${date}T00:00:00Z`) / 60000;
    if (start >= end || start >= day + 1440 || end <= day) return null;
    return { start: Math.max(0, start - day), end: Math.min(1440, end - day) };
  }

  function eventCount(label) {
    if (/^(?:予定はありません|予定なし)/.test(label)) return 0;
    const match = label.match(/^(\d+)\s*件の予定/);
    return match ? Number(match[1]) : null;
  }

  function readCalendar(document) {
    const fail = (message) => {
      throw new Error(`${message}\nクリップボードは変更していません。`);
    };
    if (
      [
        ...document.querySelectorAll('[role="dialog"], [aria-busy="true"]'),
      ].some(rendered)
    ) {
      fail(
        "予定の編集画面を閉じ、カレンダーの読み込みが完了してから実行してください。",
      );
    }
    const cells = [
      ...document.querySelectorAll(
        '[role="gridcell"][data-column-index][data-datekey]',
      ),
    ].filter(rendered);
    if (![5, 7].includes(cells.length))
      fail("Googleカレンダーを5日／7日の時間軸表示にしてください。");
    const anchors = [...document.querySelectorAll("h1[aria-label]")]
      .map((element) => readDate(element.getAttribute("aria-label")))
      .filter(Boolean);
    if (new Set(anchors).size !== 1)
      fail("表示期間の年を確認できませんでした。");
    const dates = cells.map((cell) =>
      resolveColumnDate(accessibleText(cell, document), anchors[0]),
    );
    if (
      dates.some((date) => !date) ||
      new Set(dates).size !== dates.length ||
      dates.some((date, i) => i > 0 && date <= dates[i - 1])
    )
      fail("各列の日付を正しく確認できませんでした。");

    const busy = [];
    for (let index = 0; index < cells.length; index++) {
      const cell = cells[index];
      const date = dates[index];
      const events = [
        ...cell.querySelectorAll("[data-eventid][data-eventchip]"),
      ].filter(rendered);
      const count = eventCount(accessibleText(cell, document));
      if (count === null || count !== events.length)
        fail(
          "読み込まれた予定の件数が一致しません。カレンダーの読み込み後に再実行してください。",
        );
      for (const element of events) {
        const range = readEventInterval(
          accessibleText(element, document),
          date,
        );
        if (!range)
          fail(
            "開始・終了日時を読めない予定があります。推測で空き時間を作らず停止しました。",
          );
        busy.push({ date, ...range });
      }
    }
    // 祝日を含む終日予定は空き時間の判定に使わない。
    // 予定タイトルに含まれるGMT文字列をタイムゾーンと誤認しない。
    const offsets = [
      ...new Set(
        [...document.querySelectorAll(".ouBNcf")]
          .filter(rendered)
          .map((element) => element.textContent.trim())
          .filter((text) => /^GMT[+−-]\d{1,2}(?::\d{2})?$/.test(text)),
      ),
    ];
    if (offsets.length !== 1)
      fail(
        "画面のタイムゾーンを一意に確認できませんでした。追加タイムゾーンを非表示にして実行してください。",
      );
    const timezone = /^GMT\+0?9(?::00)?$/.test(offsets[0])
      ? "日本時間"
      : offsets[0];
    return { dates, busy, timezone };
  }

  Object.assign(api, {
    readDate,
    readTimeRange,
    resolveColumnDate,
    readEventInterval,
    eventCount,
    readCalendar,
  });
})();
