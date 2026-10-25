const api = globalThis.CalendarFreeSlots;
const start = document.getElementById("start");
const end = document.getElementById("end");
const minimum = document.getElementById("minimum");
const status = document.getElementById("status");
const toMinute = (value) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

chrome.storage.local
  .get("settings")
  .then(({ settings }) => {
    const current = api.validateSettings({ ...api.defaults, ...settings });
    start.value = api.formatTime(current.startMinute).padStart(5, "0");
    end.value = api.formatTime(current.endMinute).padStart(5, "0");
    minimum.value = String(current.minimumMinutes);
  })
  .catch(() => {
    status.textContent = "設定を読み込めませんでした。再度保存してください。";
  });

document
  .getElementById("settings")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const settings = api.validateSettings({
        startMinute: toMinute(start.value),
        endMinute: toMinute(end.value),
        minimumMinutes: Number(minimum.value),
      });
      await chrome.storage.local.set({ settings });
      status.textContent = "保存しました。次のコピーから適用されます。";
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : "保存できませんでした。";
    }
  });

document.getElementById("reset").addEventListener("click", async () => {
  try {
    await chrome.storage.local.set({ settings: api.defaults });
    start.value = api.formatTime(api.defaults.startMinute).padStart(5, "0");
    end.value = api.formatTime(api.defaults.endMinute).padStart(5, "0");
    minimum.value = String(api.defaults.minimumMinutes);
    status.textContent =
      "初期値（9:00〜21:00・60分以上）に戻して保存しました。";
  } catch {
    status.textContent =
      "初期値を保存できませんでした。もう一度お試しください。";
  }
});
