const running = new Set();

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || running.has(tab.id)) return;
  const tabId = tab.id;
  if (!tab.url || new URL(tab.url).origin !== "https://calendar.google.com") {
    await chrome.action.setBadgeText({ tabId, text: "!" });
    await chrome.action.setTitle({
      tabId,
      title: "Googleカレンダーの5日／7日表示でクリックしてください。",
    });
    return;
  }
  running.add(tabId);
  try {
    await chrome.action.setBadgeText({ tabId, text: "…" });
    const saved = await chrome.storage.local.get("settings");
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["core.js", "reader.js", "content.js"],
    });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (settings) => globalThis.CalendarFreeSlots.run(settings),
      args: [saved.settings ?? null],
    });
    await chrome.action.setBadgeBackgroundColor({
      tabId,
      color: result.ok ? "#147d64" : "#b45309",
    });
    await chrome.action.setBadgeText({ tabId, text: result.ok ? "✓" : "!" });
    await chrome.action.setTitle({ tabId, title: result.message });
  } catch {
    await chrome.action.setBadgeText({ tabId, text: "!" }).catch(() => {});
    await chrome.action
      .setTitle({
        tabId,
        title:
          "読み取りに失敗しました。カレンダーの読み込み後にもう一度クリックしてください。",
      })
      .catch(() => {});
  } finally {
    running.delete(tabId);
  }
});
