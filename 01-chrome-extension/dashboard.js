const themes = 3;
const quotes = [
  ["Clarity comes from engagement, not thought.", "Marie Forleo"],
  ["The secret of getting ahead is getting started.", "Mark Twain"],
  ["Focus is the art of knowing what to ignore.", "James Clear"],
  ["Small steps every day become remarkable results.", "Unknown"],
  ["What you do today can improve all your tomorrows.", "Ralph Marston"]
];

const $ = (id) => document.getElementById(id);
const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const readJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));

let settings = { defaultMinutes: 25, fullscreen: true, clock24: true, ...readJSON("aurora-settings", {}) };
let themeIndex = Number(localStorage.getItem("aurora-theme"));
if (!Number.isInteger(themeIndex) || themeIndex < 0 || themeIndex >= themes) themeIndex = new Date().getDate() % themes;

function applyTheme() {
  $("background").className = `background theme-${themeIndex}`;
  localStorage.setItem("aurora-theme", String(themeIndex));
}

function updateClock() {
  const now = new Date();
  $("clock").textContent = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: !settings.clock24 });
  $("date").textContent = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const hour = now.getHours();
  $("greeting").textContent = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function renderName() { $("name").textContent = localStorage.getItem("aurora-name") || "friend"; }
function renderQuote() {
  const [quote, author] = quotes[new Date().getDate() % quotes.length];
  $("quote").textContent = `“${quote}”`;
  $("quoteAuthor").textContent = `— ${author}`;
}

function getGoal() { return readJSON("aurora-goal-v4", null); }
function saveGoal(goal) { writeJSON("aurora-goal-v4", goal); renderGoal(); }
function renderGoal() {
  let goal = getGoal();
  if (goal && goal.date !== todayKey()) {
    goal = null;
    localStorage.removeItem("aurora-goal-v4");
  }
  $("focusForm").classList.toggle("hidden", Boolean(goal));
  $("focusSaved").classList.toggle("hidden", !goal);
  $("focusSaved").classList.toggle("completed", Boolean(goal?.done));
  $("focusText").textContent = goal?.text || "";
}

function getTasks() { return readJSON("aurora-tasks-v4", []); }
function saveTasks(tasks) { writeJSON("aurora-tasks-v4", tasks); renderTasks(); renderInsights(); }
function visibleTasks() {
  const today = todayKey();
  return getTasks().filter((task) => !task.done || task.doneAt?.startsWith(today));
}
function renderTasks() {
  const tasks = visibleTasks();
  const completed = tasks.filter((task) => task.done).length;
  $("taskCount").textContent = `${completed} / ${tasks.length}`;
  $("emptyTasks").classList.toggle("hidden", tasks.length > 0);
  $("todoList").replaceChildren(...tasks.map((task) => {
    const item = document.createElement("li");
    item.className = `todo-item${task.done ? " done" : ""}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", `Complete ${task.text}`);
    checkbox.addEventListener("change", () => {
      const next = getTasks();
      const found = next.find((entry) => entry.id === task.id);
      if (found) {
        found.done = checkbox.checked;
        found.doneAt = checkbox.checked ? new Date().toISOString() : null;
      }
      saveTasks(next);
    });
    const text = document.createElement("span");
    text.textContent = task.text;
    text.title = "Double-click to edit";
    text.addEventListener("dblclick", () => editTask(task.id));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-task";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Delete ${task.text}`);
    remove.addEventListener("click", () => saveTasks(getTasks().filter((entry) => entry.id !== task.id)));
    item.append(checkbox, text, remove);
    return item;
  }));
}

function editTask(id) {
  const tasks = getTasks();
  const task = tasks.find((entry) => entry.id === id);
  if (!task) return;
  const updated = prompt("Edit task", task.text)?.trim();
  if (updated) { task.text = updated.slice(0, 90); saveTasks(tasks); }
}

function getSessions() { return readJSON("aurora-sessions-v4", []); }
function saveSession(minutes) {
  const sessions = getSessions();
  sessions.push({ id: crypto.randomUUID(), completedAt: new Date().toISOString(), date: todayKey(), minutes });
  writeJSON("aurora-sessions-v4", sessions.slice(-500));
  renderInsights();
}

function lastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { key, label: date.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 1) };
  });
}

function currentStreak(activeDates) {
  let streak = 0;
  const date = new Date();
  if (!activeDates.has(todayKey())) date.setDate(date.getDate() - 1);
  while (true) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (!activeDates.has(key)) break;
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

function renderInsights() {
  const days = lastSevenDays();
  const keys = new Set(days.map((day) => day.key));
  const sessions = getSessions().filter((session) => keys.has(session.date));
  const tasks = getTasks().filter((task) => task.doneAt && keys.has(task.doneAt.slice(0, 10)));
  const totalMinutes = sessions.reduce((sum, session) => sum + session.minutes, 0);
  const activeDates = new Set([...sessions.map((session) => session.date), ...tasks.map((task) => task.doneAt.slice(0, 10))]);
  const streak = currentStreak(activeDates);
  $("weekMinutes").textContent = totalMinutes;
  $("weekSessions").textContent = sessions.length;
  $("weekTasks").textContent = tasks.length;
  $("streak").textContent = streak === 0 ? "No streak yet" : `${streak}-day streak`;
  const values = days.map((day) => sessions.filter((session) => session.date === day.key).reduce((sum, session) => sum + session.minutes, 0));
  const max = Math.max(...values, 25);
  $("weekChart").innerHTML = days.map((day, index) => `<div title="${values[index]} focus minutes"><span style="height:${Math.max(5, values[index] / max * 100)}%"></span><small>${day.label}</small></div>`).join("");
}

let sessionMode = "focus";
let selectedMinutes = Number(settings.defaultMinutes) || 25;
let secondsRemaining = selectedMinutes * 60;
let timerInterval = null;
let timerEnd = 0;
let audioContext = null;
let soundNodes = [];

function timerState() { return readJSON("aurora-timer-v4", null); }
function persistTimer(running = Boolean(timerInterval)) {
  writeJSON("aurora-timer-v4", { mode: sessionMode, selectedMinutes, secondsRemaining, running, endAt: running ? timerEnd : 0 });
}
function restoreTimer() {
  const saved = timerState();
  if (!saved) return;
  sessionMode = saved.mode || "focus";
  selectedMinutes = Number(saved.selectedMinutes) || 25;
  secondsRemaining = Number(saved.secondsRemaining) || selectedMinutes * 60;
  setMode(sessionMode, false);
  setPresetVisual();
  if (saved.running && saved.endAt) {
    timerEnd = saved.endAt;
    secondsRemaining = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
    if (secondsRemaining > 0) {
      timerInterval = setInterval(tickTimer, 250);
      $("startTimer").textContent = "Pause";
    } else completeTimer(false);
  }
}
function renderTimer() {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  $("timer").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const total = Math.max(1, selectedMinutes * 60);
  const progress = Math.max(0, Math.min(1, 1 - secondsRemaining / total));
  $("timerRing").style.setProperty("--progress", `${progress * 360}deg`);
  document.title = timerInterval ? `${$("timer").textContent} · Aurora ${sessionMode}` : "Aurora Focus";
}
function sendToBackground(message) {
  try { globalThis.chrome?.runtime?.sendMessage(message, () => void chrome.runtime.lastError); } catch {}
}
function stopTimer({ reset = false } = {}) {
  clearInterval(timerInterval);
  timerInterval = null;
  sendToBackground({ type: "clearTimer" });
  if (reset) secondsRemaining = selectedMinutes * 60;
  $("startTimer").textContent = "Start";
  persistTimer(false);
  renderTimer();
}
function completeTimer(playTone = true) {
  clearInterval(timerInterval);
  timerInterval = null;
  secondsRemaining = 0;
  if (sessionMode === "focus") {
    saveSession(selectedMinutes);
    $("focusGoal").textContent = "Session complete — excellent work.";
  } else $("focusGoal").textContent = "Break complete — ready to focus?";
  if (playTone) playCompletionTone();
  sendToBackground({ type: "clearTimer" });
  persistTimer(false);
  renderTimer();
  showToast(sessionMode === "focus" ? `${selectedMinutes} focus minutes saved` : "Break completed");
}
function tickTimer() {
  secondsRemaining = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
  renderTimer();
  persistTimer(true);
  if (secondsRemaining === 0) completeTimer();
}
function startOrPauseTimer() {
  if (timerInterval) {
    tickTimer();
    clearInterval(timerInterval);
    timerInterval = null;
    sendToBackground({ type: "clearTimer" });
    $("startTimer").textContent = "Resume";
    persistTimer(false);
    return;
  }
  if (secondsRemaining <= 0) secondsRemaining = selectedMinutes * 60;
  timerEnd = Date.now() + secondsRemaining * 1000;
  timerInterval = setInterval(tickTimer, 250);
  $("startTimer").textContent = "Pause";
  sendToBackground({ type: "scheduleTimer", endAt: timerEnd, mode: sessionMode, minutes: selectedMinutes });
  tickTimer();
}
function setMode(mode, reset = true) {
  if (timerInterval) return;
  sessionMode = mode;
  $("sessionLabel").textContent = mode === "focus" ? "FOCUS SESSION" : "MINDFUL BREAK";
  $("focusGoal").textContent = mode === "focus" ? (getGoal()?.text || "Stay with the task") : "Pause, breathe and reset";
  document.querySelectorAll("#modeSwitch button").forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
  if (reset) {
    selectedMinutes = mode === "break" ? 5 : Number(settings.defaultMinutes) || 25;
    secondsRemaining = selectedMinutes * 60;
    setPresetVisual();
    persistTimer(false);
    renderTimer();
  }
}
function setPresetVisual() {
  document.querySelectorAll("#timerPresets button").forEach((button) => button.classList.toggle("active", Number(button.dataset.minutes) === selectedMinutes));
}

function stopSound() {
  soundNodes.forEach((node) => { try { node.stop?.(); } catch {} try { node.disconnect?.(); } catch {} });
  soundNodes = [];
  if (audioContext) { audioContext.close(); audioContext = null; }
}
function noiseBuffer(context, brown = false) {
  const length = context.sampleRate * 3;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = brown ? (last + 0.02 * white) / 1.02 : white;
    data[i] = brown ? last * 3.5 : white;
  }
  return buffer;
}
function setSound(type) {
  stopSound();
  if (type === "off") return;
  audioContext = new AudioContext();
  const master = audioContext.createGain();
  master.gain.value = type === "music" ? 0.045 : 0.07;
  master.connect(audioContext.destination);
  soundNodes.push(master);
  if (type === "rain" || type === "brown") {
    const source = audioContext.createBufferSource();
    source.buffer = noiseBuffer(audioContext, type === "brown");
    source.loop = true;
    const filter = audioContext.createBiquadFilter();
    filter.type = type === "rain" ? "highpass" : "lowpass";
    filter.frequency.value = type === "rain" ? 900 : 420;
    source.connect(filter).connect(master);
    source.start();
    soundNodes.push(source, filter);
    return;
  }
  [130.81, 196, 261.63, 329.63].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = index % 2 ? "sine" : "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.value = index === 0 ? 0.5 : 0.18;
    oscillator.connect(gain).connect(master);
    oscillator.start();
    soundNodes.push(oscillator, gain);
  });
}
function playCompletionTone() {
  const context = new AudioContext();
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.12, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1.3);
  gain.connect(context.destination);
  [523.25, 659.25, 783.99].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start(context.currentTime + index * 0.14);
    oscillator.stop(context.currentTime + 1.3);
  });
  setTimeout(() => context.close(), 1600);
}

function showToast(text) {
  $("toast").textContent = text;
  $("toast").classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => $("toast").classList.remove("show"), 2600);
}
function openSettings() {
  $("settingsName").value = localStorage.getItem("aurora-name") || "";
  $("defaultMinutes").value = settings.defaultMinutes;
  $("fullscreenSetting").checked = settings.fullscreen;
  $("clockSetting").checked = settings.clock24;
  $("settingsDialog").showModal();
}
function exportData() {
  const data = {};
  Object.keys(localStorage).filter((key) => key.startsWith("aurora-")).forEach((key) => { data[key] = localStorage.getItem(key); });
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: `aurora-focus-${todayKey()}.json` });
  link.click();
  URL.revokeObjectURL(url);
  showToast("Aurora data exported");
}

$("changeBackground").addEventListener("click", () => { themeIndex = (themeIndex + 1) % themes; applyTheme(); });
$("shortcutButton").addEventListener("click", () => $("shortcutDialog").showModal());
$("settingsButton").addEventListener("click", openSettings);
$("nameButton").addEventListener("click", () => { $("nameInput").value = localStorage.getItem("aurora-name") || ""; $("nameDialog").showModal(); $("nameInput").focus(); });
$("cancelName").addEventListener("click", () => $("nameDialog").close());
$("nameForm").addEventListener("submit", (event) => { event.preventDefault(); const value = $("nameInput").value.trim(); value ? localStorage.setItem("aurora-name", value) : localStorage.removeItem("aurora-name"); $("nameDialog").close(); renderName(); });
$("focusForm").addEventListener("submit", (event) => { event.preventDefault(); const value = $("focusInput").value.trim(); if (!value) return; saveGoal({ text: value, done: false, date: todayKey() }); $("focusInput").value = ""; });
$("completeFocus").addEventListener("click", () => { const goal = getGoal(); if (!goal) return; goal.done = !goal.done; saveGoal(goal); renderInsights(); });
$("editFocus").addEventListener("click", () => { const goal = getGoal(); $("focusInput").value = goal?.text || ""; localStorage.removeItem("aurora-goal-v4"); renderGoal(); $("focusInput").focus(); });
$("todoForm").addEventListener("submit", (event) => { event.preventDefault(); const text = $("todoInput").value.trim(); if (!text) return; saveTasks([...getTasks(), { id: crypto.randomUUID(), text, done: false, createdAt: new Date().toISOString(), doneAt: null }]); $("todoInput").value = ""; });
$("openFocus").addEventListener("click", async () => { $("focusGoal").textContent = sessionMode === "focus" ? (getGoal()?.text || "Stay with the task") : "Pause, breathe and reset"; $("focusOverlay").classList.remove("hidden"); if (settings.fullscreen) { try { await document.documentElement.requestFullscreen(); } catch {} } });
$("exitFocus").addEventListener("click", async () => { stopSound(); $("focusOverlay").classList.add("hidden"); if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch {} } });
$("modeSwitch").addEventListener("click", (event) => { const button = event.target.closest("button[data-mode]"); if (button) setMode(button.dataset.mode); });
$("timerPresets").addEventListener("click", (event) => { const button = event.target.closest("button[data-minutes]"); if (!button || timerInterval) return; selectedMinutes = Number(button.dataset.minutes); secondsRemaining = selectedMinutes * 60; setPresetVisual(); persistTimer(false); renderTimer(); });
$("applyCustomTime").addEventListener("click", () => { const value = Number($("customMinutes").value); if (!Number.isInteger(value) || value < 1 || value > 180 || timerInterval) return showToast("Choose between 1 and 180 minutes"); selectedMinutes = value; secondsRemaining = value * 60; setPresetVisual(); persistTimer(false); renderTimer(); });
$("startTimer").addEventListener("click", startOrPauseTimer);
$("resetTimer").addEventListener("click", () => { stopTimer({ reset: true }); $("focusGoal").textContent = sessionMode === "focus" ? (getGoal()?.text || "Stay with the task") : "Pause, breathe and reset"; });
$("soundSelect").addEventListener("change", (event) => setSound(event.target.value));
$("cancelSettings").addEventListener("click", () => $("settingsDialog").close());
$("settingsForm").addEventListener("submit", (event) => { event.preventDefault(); const name = $("settingsName").value.trim(); name ? localStorage.setItem("aurora-name", name) : localStorage.removeItem("aurora-name"); settings = { defaultMinutes: Math.min(180, Math.max(1, Number($("defaultMinutes").value) || 25)), fullscreen: $("fullscreenSetting").checked, clock24: $("clockSetting").checked }; writeJSON("aurora-settings", settings); $("settingsDialog").close(); renderName(); updateClock(); showToast("Settings saved"); });
$("exportData").addEventListener("click", exportData);
$("resetData").addEventListener("click", () => { if (!confirm("Delete all Aurora goals, tasks and statistics? This cannot be undone.")) return; Object.keys(localStorage).filter((key) => key.startsWith("aurora-")).forEach((key) => localStorage.removeItem(key)); location.reload(); });
$("onboardingForm").addEventListener("submit", () => localStorage.setItem("aurora-onboarded", "true"));
document.addEventListener("keydown", (event) => {
  const typing = ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName);
  if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key.toLowerCase() === "f") $("openFocus").click();
  if (event.key.toLowerCase() === "n") $("todoInput").focus();
  if (event.code === "Space" && !$("focusOverlay").classList.contains("hidden")) { event.preventDefault(); startOrPauseTimer(); }
});

applyTheme();
updateClock();
renderName();
renderGoal();
renderQuote();
renderTasks();
renderInsights();
restoreTimer();
renderTimer();
setInterval(updateClock, 1000);
if (localStorage.getItem("aurora-onboarded") !== "true") $("onboardingDialog").showModal();
