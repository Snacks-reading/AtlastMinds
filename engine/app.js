import { VoiceController } from "./voice.js";
import { MasteryEngine } from "./mastery.js";

const appRoot = document.getElementById("app");
const mastery = new MasteryEngine();

function renderError(message, details = "") {
  appRoot.innerHTML = `
    <div class="error-state">
      <h2>Offline data load error</h2>
      <p>${message}</p>
      ${details ? `<pre>${details}</pre>` : ""}
    </div>
  `;
}

async function loadJson(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load ${path} (${response.status})`);
    }
    return response.json();
  } catch (fetchError) {
    if (window.location.protocol !== "file:") throw fetchError;
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", path, true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;
        if (xhr.status === 200 || xhr.status === 0) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (parseError) {
            reject(new Error(`Invalid JSON in ${path}: ${parseError.message}`));
          }
          return;
        }
        reject(new Error(`Failed to load ${path} in file mode (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error(`XHR error while loading ${path}`));
      xhr.send();
    });
  }
}

function getLessonFlowText(lesson) {
  const parts = lesson.flow || [];
  return parts.map((part, idx) => `${idx + 1}. ${part.type}: ${part.content}`).join("\n");
}

function renderShell(data) {
  const firstLesson = data.lessons.lessons[0];
  const firstItem = firstLesson?.practice?.[0] || { id: "boot-item", prompt: "Type: offline" };

  appRoot.innerHTML = `
    <header class="app-header">
      <strong>AtlastMinds Offline Prototype</strong>
      <span class="app-status" id="statusLine">Loaded ${data.domains.domains.length} domains, ${data.modules.modules.length} modules, ${data.lessons.lessons.length} lessons</span>
    </header>
    <main class="lesson-layout">
      <section class="panel">
        <h2>Teaching Panel</h2>
        <div class="teaching-content" id="teachingContent">${getLessonFlowText(firstLesson)}</div>
      </section>
      <section class="panel">
        <h2>Interaction Panel</h2>
        <div class="interaction-content">
          <div><strong>Prompt:</strong> <span id="promptText">${firstItem.prompt}</span></div>
          <input class="question-input" id="answerInput" placeholder="Enter answer" />
          <div class="controls">
            <button class="primary" id="submitBtn">Submit</button>
            <button id="nextBtn">Next Review Item</button>
          </div>
          <p class="small" id="masteryState">XP 0 · Streak 0 · Queue 0</p>
        </div>
      </section>
      <section class="panel">
        <h2>Coach / Avatar Panel</h2>
        <div class="coach-content" id="coachContent">Coach ready.</div>
        <div class="controls">
          <button id="voiceSpeakBtn">Speak Lesson</button>
          <button id="voicePauseBtn">Pause</button>
          <button id="voiceResumeBtn">Resume</button>
          <button id="voiceRepeatBtn">Repeat</button>
        </div>
      </section>
    </main>
  `;

  const statusLine = document.getElementById("statusLine");
  const coachContent = document.getElementById("coachContent");
  const masteryState = document.getElementById("masteryState");

  const voice = new VoiceController({
    onStatus: (s) => {
      statusLine.textContent = s;
    },
  });

  const updateMastery = (result) => {
    const snap = mastery.snapshot();
    masteryState.textContent = `XP ${snap.xp} · Streak ${snap.streak} · Queue ${snap.queueSize}`;
    if (result?.state === "incorrect") {
      coachContent.textContent = `Try support mode: ${result.support.replaceAll("_", " ")}.`;
    } else if (result?.state === "correct") {
      coachContent.textContent = "Nice work! You earned XP.";
    }
  };

  document.getElementById("submitBtn").addEventListener("click", () => {
    const answer = document.getElementById("answerInput").value.trim().toLowerCase();
    const correct = answer === "offline" || answer === "file";
    const result = mastery.submitResult(firstItem.id, correct);
    updateMastery(result);
  });

  document.getElementById("nextBtn").addEventListener("click", () => {
    const due = mastery.tickQueue();
    coachContent.textContent = due.length
      ? `Review due for: ${due.map((d) => d.itemId).join(", ")}`
      : "No review items due yet.";
    updateMastery();
  });

  document.getElementById("voiceSpeakBtn").addEventListener("click", () => voice.speak(getLessonFlowText(firstLesson)));
  document.getElementById("voicePauseBtn").addEventListener("click", () => voice.pause());
  document.getElementById("voiceResumeBtn").addEventListener("click", () => voice.resume());
  document.getElementById("voiceRepeatBtn").addEventListener("click", () => voice.repeat());
}

(async function init() {
  try {
    const [domains, modules, lessons] = await Promise.all([
      loadJson("./domains/domains.json"),
      loadJson("./modules/modules.json"),
      loadJson("./lessons/lessons.json"),
    ]);

    if (!domains?.domains || !modules?.modules || !lessons?.lessons) {
      throw new Error("Manifest schema missing required top-level arrays.");
    }

    renderShell({ domains, modules, lessons });
  } catch (error) {
    renderError("Unable to initialize app from local manifests.", error.message);
  }
})();
