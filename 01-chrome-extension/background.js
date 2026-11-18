chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "scheduleTimer") {
    chrome.alarms.clear("aurora-focus").then(() => {
      chrome.alarms.create("aurora-focus", { when: message.endAt });
      chrome.storage.local.set({ activeTimer: { endAt: message.endAt, mode: message.mode, minutes: message.minutes } });
      sendResponse({ ok: true });
    });
    return true;
  }
  if (message?.type === "clearTimer") {
    chrome.alarms.clear("aurora-focus");
    chrome.storage.local.remove("activeTimer");
    sendResponse({ ok: true });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== "aurora-focus") return;
  chrome.storage.local.get("activeTimer", ({ activeTimer }) => {
    const isBreak = activeTimer?.mode === "break";
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: isBreak ? "Break complete" : "Focus session complete",
      message: isBreak ? "Ready to return to your goal?" : "Well done. Take a mindful break.",
      priority: 2
    });
    chrome.storage.local.remove("activeTimer");
  });
});
