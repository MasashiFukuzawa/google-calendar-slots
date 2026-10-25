(() => {
  const defaults = Object.freeze({
    startMinute: 540,
    endMinute: 1260,
    minimumMinutes: 60,
  });

  function validateSettings(settings) {
    const { startMinute, endMinute, minimumMinutes } = settings;
    if (
      ![startMinute, endMinute, minimumMinutes].every(Number.isInteger) ||
      startMinute < 0 ||
      endMinute > 1440 ||
      startMinute >= endMinute ||
      ![30, 60].includes(minimumMinutes)
    ) {
      throw new Error(
        "対象時間が不正です。開始を終了より前に設定してください。",
      );
    }
    return { startMinute, endMinute, minimumMinutes };
  }

  function validDate(date) {
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      Number.isFinite(Date.parse(`${date}T00:00:00Z`)) &&
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date
    );
  }

  // 時刻は画面のタイムゾーンにおける「その日の0時からの分数」で扱う。
  // 予定の開始は含み、終了は含まない。境界に余白や丸めは加えない。
  function findFreeSlots(dates, busy, settings = defaults) {
    const { startMinute, endMinute, minimumMinutes } =
      validateSettings(settings);
    if (
      !dates.length ||
      dates.some((date) => !validDate(date)) ||
      new Set(dates).size !== dates.length
    ) {
      throw new Error("表示日付を正しく読み取れませんでした。");
    }
    for (const event of busy) {
      if (
        !validDate(event.date) ||
        !Number.isInteger(event.start) ||
        !Number.isInteger(event.end) ||
        event.start < 0 ||
        event.end > 1440 ||
        event.start >= event.end
      ) {
        throw new Error("予定の時刻を正しく読み取れませんでした。");
      }
    }
    return dates.map((date) => {
      const intervals = busy
        .filter((event) => event.date === date)
        .map(({ start, end }) => [
          Math.max(startMinute, start),
          Math.min(endMinute, end),
        ])
        .filter(([start, end]) => start < end)
        .sort((a, b) => a[0] - b[0]);
      const slots = [];
      let cursor = startMinute;
      for (const [start, end] of intervals) {
        if (start - cursor >= minimumMinutes)
          slots.push({ start: cursor, end: start });
        cursor = Math.max(cursor, end);
      }
      if (endMinute - cursor >= minimumMinutes)
        slots.push({ start: cursor, end: endMinute });
      return { date, slots };
    });
  }

  function formatTime(minute) {
    return `${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, "0")}`;
  }

  function formatSlots(days) {
    const lines = days
      .filter((day) => day.slots.length)
      .map(({ date, slots }) => {
        const parsed = new Date(`${date}T00:00:00Z`);
        return `・${parsed.getUTCMonth() + 1}/${parsed.getUTCDate()}(${"日月火水木金土"[parsed.getUTCDay()]}) ${slots.map(({ start, end }) => `${formatTime(start)}〜${formatTime(end)}`).join("、")}`;
      });
    if (!lines.length) return "";
    return lines.join("\n");
  }

  globalThis.CalendarFreeSlots = {
    defaults,
    validateSettings,
    validDate,
    findFreeSlots,
    formatTime,
    formatSlots,
  };
})();
