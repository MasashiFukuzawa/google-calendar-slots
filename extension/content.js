(() => {
  const api = globalThis.CalendarFreeSlots;

  function showResult(message, { error = false, text = "" } = {}) {
    document.getElementById("calendar-free-slots-notice")?.remove();
    const host = document.createElement("div");
    host.id = "calendar-free-slots-notice";
    host.style.cssText =
      "position:fixed;right:24px;bottom:24px;z-index:2147483647;";
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `
      :host { color-scheme: light; }
      section { box-sizing:border-box; width:min(420px,calc(100vw - 48px)); padding:20px;
        background:#fff; color:#17362e; border:1px solid #d7e4df; border-radius:16px;
        box-shadow:0 6px 32px #16392f26; font:14px/1.7 system-ui,sans-serif; }
      section.error { border-color:#e4c594; color:#783e0a; }
      p { margin:0; padding-right:18px; white-space:pre-line; }
      button { float:right; border:0; background:transparent; color:inherit; font-size:20px; cursor:pointer; }
      textarea { box-sizing:border-box; width:100%; height:160px; margin-top:12px; padding:8px;
        border:1px solid #ccd8d3; border-radius:6px; font:13px/1.6 system-ui; resize:vertical; }
    `;
    const section = document.createElement("section");
    section.setAttribute("role", error ? "alert" : "status");
    if (error) section.className = "error";
    const close = document.createElement("button");
    close.textContent = "×";
    close.setAttribute("aria-label", "閉じる");
    close.addEventListener("click", () => host.remove());
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    section.append(close, paragraph);
    if (text) {
      const textarea = document.createElement("textarea");
      textarea.readOnly = true;
      textarea.value = text;
      textarea.setAttribute("aria-label", "コピーする空き時間");
      section.append(textarea);
    }
    shadow.append(style, section);
    document.documentElement.append(host);
    if (!error) setTimeout(() => host.remove(), 6000);
  }

  api.run = async (savedSettings) => {
    let text = "";
    try {
      const settings = api.validateSettings({
        ...api.defaults,
        ...savedSettings,
      });
      const calendar = api.readCalendar(document);
      const days = api.findFreeSlots(calendar.dates, calendar.busy, settings);
      text = api.formatSlots(days);
      if (!text) {
        const message = `表示中の日程に${settings.minimumMinutes}分以上の空きはありません。\nクリップボードは変更していません。`;
        showResult(message);
        return { ok: true, message };
      }
      await navigator.clipboard.writeText(text);
      const count = days.reduce((total, day) => total + day.slots.length, 0);
      const message = `${count}件の空き時間をコピーしました。\n${calendar.dates.length}日分・${api.formatTime(settings.startMinute)}〜${api.formatTime(settings.endMinute)}・${settings.minimumMinutes}分以上（${calendar.timezone}）`;
      showResult(message);
      return { ok: true, message };
    } catch (error) {
      const message = text
        ? "自動コピーできませんでした。以下の文面を選択してコピーしてください。"
        : error instanceof Error
          ? error.message
          : "画面を読み取れませんでした。";
      showResult(message, { error: true, text });
      return { ok: false, message };
    }
  };
})();
