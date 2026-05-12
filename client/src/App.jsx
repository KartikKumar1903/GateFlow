import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  HeartHandshake,
  LogOut,
  RotateCcw,
  Sparkles,
  Star,
  Target
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { gateSyllabus } from "./gateSyllabus.js";

const storageKeys = {
  user: "gateflow-v3-user",
  profile: "gateflow-v3-profile",
  backlog: "gateflow-v3-backlog",
  pyq: "gateflow-v3-pyq"
};

const accountKey = (base, user) => `${base}-${user?.email || "guest"}`;

const savedUser = () => JSON.parse(localStorage.getItem(storageKeys.user) || "null");

const defaultSlots = [
  { label: "Evening focus", start: "18:00", end: "20:00", energy: 4 },
  { label: "Night practice", start: "21:00", end: "22:00", energy: 3 }
];

const pyqYears = [2025, 2024, 2023, 2022, 2021, 2020];

const minutesBetween = (start, end) => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(30, eh * 60 + em - (sh * 60 + sm));
};

const roundBlock = (minutes) => Math.max(30, Math.round(minutes / 10) * 10);

const coverageOf = (subject) =>
  Math.round(((subject.completedTopics?.length || 0) / Math.max(subject.topics.length, 1)) * 100);

const topicStatusOf = (subject, topic) => {
  if (subject.completedTopics.includes(topic)) return "Covered";
  return subject.topicProgress?.[topic] || "Not started";
};

const firstUncoveredTopic = (subject) =>
  subject.topics.find((topic) => topicStatusOf(subject, topic) !== "Covered") || "Revision + PYQs";

const reasonResponse = (message) => {
  const text = message.toLowerCase();
  if (["sick", "fever", "health", "headache"].some((word) => text.includes(word))) {
    return "I will make tomorrow lighter and move this into a recovery-friendly revision block.";
  }
  if (["hard", "confusing", "stuck", "difficult"].some((word) => text.includes(word))) {
    return "I will schedule a concept repair block before assigning more PYQs from this topic.";
  }
  if (["time", "late", "college", "office"].some((word) => text.includes(word))) {
    return "I will split it into smaller blocks and place the first one in your strongest slot.";
  }
  return "I will keep this in backlog with a moderate priority boost and watch tomorrow's pattern.";
};

const buildSchedule = (profile, backlog, taskStatus) => {
  const backlogWeights = backlog.reduce((acc, item) => {
    acc[item.subject] = (acc[item.subject] || 0) + item.weight;
    return acc;
  }, {});

  const rankedSubjects = profile.subjects
    .filter((subject) => subject.selected)
    .map((subject) => {
      const coverage = coverageOf(subject);
      const remaining = 1 - coverage / 100;
      const chosenBoost = subject.coverFirst ? 2.2 : 0;
      const score =
        remaining * 3 +
        (subject.difficulty / 5) * 2 +
        ((6 - subject.favorite) / 5) +
        chosenBoost +
        (backlogWeights[subject.name] || 0) * 1.4;
      return { ...subject, coverage, score };
    })
    .sort((a, b) => b.score - a.score);

  if (!rankedSubjects.length) return [];

  const isWeekend = [0, 6].includes(new Date().getDay());
  const slots = [...profile.comfortableSlots].sort((a, b) => b.energy - a.energy);
  const schedule = slots.map((slot, index) => {
    const subject = rankedSubjects[index % rankedSubjects.length];
    const available = minutesBetween(slot.start, slot.end);
    const backlogBoost = (backlogWeights[subject.name] || 0) * 10;
    const rawDuration = 40 + subject.difficulty * 8 + (6 - subject.favorite) * 5 + backlogBoost;
    const duration = Math.min(available, roundBlock(rawDuration));
    const id = `${slot.label}-${subject.name}-${index}`;

    return {
      id,
      ...slot,
      subject: subject.name,
      topic: firstUncoveredTopic(subject),
      duration,
      score: subject.score.toFixed(1),
      completed: taskStatus[id] === "completed",
      mode: backlogWeights[subject.name] ? "Backlog repair" : "Core study"
    };
  });

  if (isWeekend) {
    const coveredSubject = rankedSubjects.find((subject) => subject.completedTopics.length);
    if (coveredSubject) {
      schedule.push({
        id: `weekend-${coveredSubject.name}`,
        label: "Weekend revision",
        start: "Flexible",
        end: "30 min",
        subject: coveredSubject.name,
        topic: coveredSubject.completedTopics[0],
        duration: 30,
        score: "Revision",
        completed: taskStatus[`weekend-${coveredSubject.name}`] === "completed",
        mode: "Covered-topic revision"
      });
    }
  }

  return schedule;
};

const makePyqQueue = (profile, pyqState) => {
  const subjects = profile.subjects.filter((subject) => subject.selected);
  const weakFirst = [...subjects].sort((a, b) => coverageOf(a) - coverageOf(b));

  return pyqYears.slice(0, 4).map((year, index) => {
    const subject = weakFirst[index % weakFirst.length] || subjects[0];
    const topic = subject ? firstUncoveredTopic(subject) : "Choose a subject";
    const key = `${year}-${subject?.name || "subject"}-${topic}`;
    return {
      key,
      year,
      subject: subject?.name || "Choose subject",
      topic,
      status: pyqState[key] || "Not started"
    };
  });
};

function App() {
  const [authMode, setAuthMode] = useState("signup");
  const [user, setUser] = useState(() => savedUser());
  const [profile, setProfile] = useState(() =>
    JSON.parse(localStorage.getItem(accountKey(storageKeys.profile, savedUser())) || "null")
  );
  const [backlog, setBacklog] = useState(() =>
    JSON.parse(localStorage.getItem(accountKey(storageKeys.backlog, savedUser())) || "[]")
  );
  const [pyqState, setPyqState] = useState(() =>
    JSON.parse(localStorage.getItem(accountKey(storageKeys.pyq, savedUser())) || "{}")
  );
  const [taskStatus, setTaskStatus] = useState({});
  const [feedback, setFeedback] = useState("");
  const [coachReply, setCoachReply] = useState("");
  const [editingSlots, setEditingSlots] = useState(false);

  const schedule = useMemo(
    () => (profile ? buildSchedule(profile, backlog, taskStatus) : []),
    [profile, backlog, taskStatus]
  );
  const pyqQueue = useMemo(() => (profile ? makePyqQueue(profile, pyqState) : []), [profile, pyqState]);

  const saveProfile = (nextProfile) => {
    setProfile(nextProfile);
    localStorage.setItem(accountKey(storageKeys.profile, user), JSON.stringify(nextProfile));
  };

  const saveBacklog = (nextBacklog) => {
    setBacklog(nextBacklog);
    localStorage.setItem(accountKey(storageKeys.backlog, user), JSON.stringify(nextBacklog));
  };

  const savePyq = (nextPyq) => {
    setPyqState(nextPyq);
    localStorage.setItem(accountKey(storageKeys.pyq, user), JSON.stringify(nextPyq));
  };

  if (!user) {
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        setBacklog={setBacklog}
        setProfile={setProfile}
        setPyqState={setPyqState}
        setTaskStatus={setTaskStatus}
        setUser={setUser}
      />
    );
  }

  if (!profile) {
    return <OnboardingScreen user={user} saveProfile={saveProfile} />;
  }

  const selectedSubjects = profile.subjects.filter((subject) => subject.selected);
  const completion = Math.round(
    selectedSubjects.reduce((sum, subject) => sum + coverageOf(subject), 0) /
      Math.max(selectedSubjects.length, 1)
  );
  const coveredTopics = selectedSubjects.reduce(
    (sum, subject) => sum + subject.completedTopics.length,
    0
  );

  const updateSubject = (name, patch) => {
    saveProfile({
      ...profile,
      subjects: profile.subjects.map((subject) =>
        subject.name === name ? { ...subject, ...patch } : subject
      )
    });
  };

  const setTopicProgress = (subjectName, topic, status) => {
    const subject = profile.subjects.find((item) => item.name === subjectName);
    updateSubject(subjectName, {
      topicProgress: { ...(subject.topicProgress || {}), [topic]: status },
      completedTopics:
        status === "Covered"
          ? Array.from(new Set([...subject.completedTopics, topic]))
          : subject.completedTopics.filter((item) => item !== topic)
    });
  };

  const updateSlot = (index, patch) => {
    saveProfile({
      ...profile,
      comfortableSlots: profile.comfortableSlots.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, ...patch } : slot
      )
    });
  };

  const addSlot = () => {
    saveProfile({
      ...profile,
      comfortableSlots: [
        ...profile.comfortableSlots,
        {
          label: `Study window ${profile.comfortableSlots.length + 1}`,
          start: "17:00",
          end: "18:00",
          energy: 3
        }
      ]
    });
  };

  const removeSlot = (index) => {
    if (profile.comfortableSlots.length === 1) return;
    saveProfile({
      ...profile,
      comfortableSlots: profile.comfortableSlots.filter((_slot, slotIndex) => slotIndex !== index)
    });
  };

  const markTask = (taskId) => {
    setTaskStatus((current) => ({
      ...current,
      [taskId]: current[taskId] === "completed" ? "planned" : "completed"
    }));
  };

  const endDay = () => {
    const missed = schedule.filter((item) => !item.completed && item.mode !== "Covered-topic revision");
    if (!missed.length) return;

    saveBacklog([
      ...missed.map((item) => ({
        id: `${Date.now()}-${item.id}`,
        subject: item.subject,
        topic: item.topic,
        reason: "Moved automatically because the day ended before completion",
        weight: 2
      })),
      ...backlog
    ]);
    setTaskStatus({});
  };

  const submitFeedback = () => {
    if (!feedback.trim()) return;
    setCoachReply(reasonResponse(feedback));
    saveBacklog([
      {
        id: Date.now(),
        subject: schedule[0]?.subject || selectedSubjects[0]?.name,
        topic: schedule[0]?.topic || "Follow-up study block",
        reason: feedback,
        weight: feedback.toLowerCase().includes("confusing") ? 5 : 3
      },
      ...backlog
    ]);
  };

  const logout = () => {
    localStorage.removeItem(storageKeys.user);
    setUser(null);
    setProfile(null);
    setBacklog([]);
    setPyqState({});
    setTaskStatus({});
  };

  return (
    <main className="shell">
      <section className="hero compact-hero">
        <div>
          <p className="eyebrow">
            <Sparkles size={16} /> GateFlow
          </p>
          <h1>{user.name}&apos;s adaptive GATE CSE plan.</h1>
          <p className="hero-copy">
            Coverage is calculated from official syllabus topics you mark as done. The planner
            turns those choices into timed blocks and PYQ practice.
          </p>
        </div>
        <div className="focus-panel">
          <span>Today&apos;s focus</span>
          <strong>{schedule[0]?.subject || "Choose subjects"}</strong>
          <p>{schedule[0]?.topic || "Complete onboarding to generate a plan"}</p>
        </div>
      </section>

      <section className="metrics">
        <Metric icon={<CalendarClock />} label="Study windows" value={`${profile.comfortableSlots.length}/day`} />
        <Metric icon={<BookOpenCheck />} label="Topic coverage" value={`${completion}%`} />
        <Metric icon={<Target />} label="Topics done" value={`${coveredTopics} topics`} />
        <Metric icon={<RotateCcw />} label="Backlog pressure" value={`${backlog.length} tasks`} />
      </section>

      <section className="layout">
        <div className="panel planner">
          <div className="section-title">
            <div>
              <p className="eyebrow">Adaptive timetable</p>
              <h2>Today&apos;s plan</h2>
            </div>
            <button onClick={endDay} type="button">
              <RotateCcw size={17} /> End day
            </button>
          </div>

          <div className="timeline">
            {schedule.map((item) => (
              <article className={item.completed ? "task completed" : "task"} key={item.id}>
                <div className="time">
                  <strong>{item.start}</strong>
                  <span>{item.end}</span>
                </div>
                <div className="task-main">
                  <div>
                    <h3>{item.subject}</h3>
                    <p>{item.topic}</p>
                    <small>{item.mode}</small>
                  </div>
                  <div className="task-actions">
                    <div className="task-meta">
                      <span>{item.duration} min</span>
                      <span>Priority {item.score}</span>
                    </div>
                    <button className="ghost-btn" onClick={() => markTask(item.id)} type="button">
                      <CheckCircle2 size={17} /> {item.completed ? "Studied today" : "Mark studied"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="panel setup">
          <div className="section-title">
            <div>
              <p className="eyebrow">Subject control</p>
              <h2>Topics and priority</h2>
            </div>
            <button className="icon-btn" onClick={logout} title="Log out" type="button">
              <LogOut size={18} />
            </button>
          </div>
          <div className="topic-accordion">
            {selectedSubjects.map((subject) => (
              <details key={subject.name}>
                <summary>
                  <div className="subject-summary">
                    <strong>{subject.name}</strong>
                    <small>Next: {firstUncoveredTopic(subject)}</small>
                  </div>
                  <div className="subject-pills">
                    <span>{coverageOf(subject)}%</span>
                    <span>
                      {subject.completedTopics.length}/{subject.topics.length}
                    </span>
                  </div>
                </summary>
                <button
                  className={subject.coverFirst ? "choice selected" : "choice"}
                  onClick={() => updateSubject(subject.name, { coverFirst: !subject.coverFirst })}
                  type="button"
                >
                  <span>Cover this subject first</span>
                  <small>{subject.coverFirst ? "Prioritized" : "Normal priority"}</small>
                </button>
                <div className="topic-list">
                  {subject.topics.map((topic) => (
                    <div className="topic-progress-row" key={topic}>
                      <span>{topic}</span>
                      <select
                        value={topicStatusOf(subject, topic)}
                        onChange={(event) => setTopicProgress(subject.name, topic, event.target.value)}
                      >
                        <option>Not started</option>
                        <option>In progress</option>
                        <option>Needs revision</option>
                        <option>Covered</option>
                      </select>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </aside>
      </section>

      <section className="panel schedule-settings">
        <div className="section-title">
          <div>
            <p className="eyebrow">Study windows</p>
            <h2>Edit slots anytime</h2>
          </div>
          <button className="ghost-btn" onClick={() => setEditingSlots(!editingSlots)} type="button">
            {editingSlots ? "Done editing" : "Edit slots"}
          </button>
        </div>
        {editingSlots ? (
          <div className="slot-list">
            {profile.comfortableSlots.map((slot, index) => (
              <article className="slot-row" key={`${slot.label}-${index}`}>
                <label>
                  Label
                  <input value={slot.label} onChange={(event) => updateSlot(index, { label: event.target.value })} />
                </label>
                <label>
                  Start
                  <input
                    type="time"
                    value={slot.start}
                    onChange={(event) => updateSlot(index, { start: event.target.value })}
                  />
                </label>
                <label>
                  End
                  <input
                    type="time"
                    value={slot.end}
                    onChange={(event) => updateSlot(index, { end: event.target.value })}
                  />
                </label>
                <label>
                  Energy {slot.energy}/5
                  <input
                    max="5"
                    min="1"
                    type="range"
                    value={slot.energy}
                    onChange={(event) => updateSlot(index, { energy: Number(event.target.value) })}
                  />
                </label>
                <button
                  className="ghost-btn remove-slot"
                  disabled={profile.comfortableSlots.length === 1}
                  onClick={() => removeSlot(index)}
                  type="button"
                >
                  Remove slot
                </button>
              </article>
            ))}
            <button className="ghost-btn add-slot-inline" onClick={addSlot} type="button">
              Add another study window
            </button>
          </div>
        ) : (
          <div className="slot-chips">
            {profile.comfortableSlots.map((slot) => (
              <span key={`${slot.label}-${slot.start}`}>
                {slot.label}: {slot.start} - {slot.end}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="layout lower">
        <div className="panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Backlog</p>
              <h2>Priority repair queue</h2>
            </div>
            <Target size={24} />
          </div>
          <div className="backlog-list">
            {backlog.length ? (
              backlog.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{item.subject}</strong>
                    <p>{item.topic}</p>
                    <small>{item.reason}</small>
                  </div>
                  <span>{item.weight}x</span>
                </article>
              ))
            ) : (
              <p className="empty-state">No backlog yet. Missed tasks will appear here after you end the day.</p>
            )}
          </div>
        </div>

        <div className="panel feedback">
          <div className="section-title">
            <div>
              <p className="eyebrow">Study note</p>
              <h2>Remember today&apos;s difficulty</h2>
            </div>
            <HeartHandshake size={24} />
          </div>
          <textarea
            placeholder="Example: I studied synchronization today, but I still need two more days before marking it covered."
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
          />
          <button onClick={submitFeedback} type="button">
            <CheckCircle2 size={18} /> Update next plan
          </button>
          {coachReply && <div className="coach-reply">{coachReply}</div>}
        </div>
      </section>

      <section className="panel pyq">
        <div className="section-title">
          <div>
            <p className="eyebrow">PYQ manager</p>
            <h2>Weak-topic practice queue</h2>
          </div>
        </div>
        <div className="pyq-grid">
          {pyqQueue.map((item) => (
            <article key={item.key}>
              <strong>{item.year}</strong>
              <h3>{item.subject}</h3>
              <p>{item.topic}</p>
              <div className="segmented">
                {["Not started", "Attempted", "Revisit", "Solved"].map((status) => (
                  <button
                    className={item.status === status ? "selected" : ""}
                    key={status}
                    onClick={() => savePyq({ ...pyqState, [item.key]: status })}
                    type="button"
                  >
                    {status}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function AuthScreen({
  authMode,
  setAuthMode,
  setBacklog,
  setProfile,
  setPyqState,
  setTaskStatus,
  setUser
}) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const submit = (event) => {
    event.preventDefault();
    const nextUser = {
      id: Date.now(),
      name: form.name,
      email: form.email
    };
    localStorage.setItem(storageKeys.user, JSON.stringify(nextUser));
    setProfile(JSON.parse(localStorage.getItem(accountKey(storageKeys.profile, nextUser)) || "null"));
    setBacklog(JSON.parse(localStorage.getItem(accountKey(storageKeys.backlog, nextUser)) || "[]"));
    setPyqState(JSON.parse(localStorage.getItem(accountKey(storageKeys.pyq, nextUser)) || "{}"));
    setTaskStatus({});
    setUser(nextUser);
  };

  return (
    <main className="shell auth-shell">
      <section className="auth-card">
        <p className="eyebrow">
          <Sparkles size={16} /> GateFlow
        </p>
        <h1>{authMode === "signup" ? "Create your study workspace." : "Welcome back."}</h1>
        <p className="hero-copy">
          Your planner starts empty and becomes useful after your topic checklist and study windows.
        </p>
        <form className="form-stack" onSubmit={submit}>
          <label>
            Username
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
          <label>
            Email
            <input
              inputMode="email"
              required
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label>
            Password
            <input
              required
              minLength="6"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          <button type="submit">
            {authMode === "signup" ? "Sign up" : "Login"} <ArrowRight size={18} />
          </button>
        </form>
        <button className="link-btn" onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}>
          {authMode === "signup" ? "Already have an account? Login" : "New here? Sign up"}
        </button>
      </section>
    </main>
  );
}

function OnboardingScreen({ user, saveProfile }) {
  const [comfortableSlots, setComfortableSlots] = useState(defaultSlots);
  const [subjects, setSubjects] = useState(
    gateSyllabus.map((section) => ({
      name: section.name,
      topics: section.topics,
      completedTopics: [],
      topicProgress: {},
      selected: true,
      difficulty: section.name === "Theory of Computation" || section.name === "Algorithms" ? 5 : 3,
      favorite: 3,
      coverFirst: false
    }))
  );

  const updateSubject = (name, patch) => {
    setSubjects((current) =>
      current.map((subject) => (subject.name === name ? { ...subject, ...patch } : subject))
    );
  };

  const setTopicProgress = (subjectName, topic, status) => {
    const subject = subjects.find((item) => item.name === subjectName);
    updateSubject(subjectName, {
      topicProgress: { ...(subject.topicProgress || {}), [topic]: status },
      completedTopics:
        status === "Covered"
          ? Array.from(new Set([...subject.completedTopics, topic]))
          : subject.completedTopics.filter((item) => item !== topic)
    });
  };

  const updateSlot = (index, patch) => {
    setComfortableSlots((current) =>
      current.map((slot, slotIndex) => (slotIndex === index ? { ...slot, ...patch } : slot))
    );
  };

  const addSlot = () => {
    setComfortableSlots((current) => [
      ...current,
      { label: `Study window ${current.length + 1}`, start: "17:00", end: "18:00", energy: 3 }
    ]);
  };

  const removeSlot = (index) => {
    setComfortableSlots((current) =>
      current.length === 1 ? current : current.filter((_slot, slotIndex) => slotIndex !== index)
    );
  };

  const submit = (event) => {
    event.preventDefault();
    saveProfile({
      name: user.name,
      comfortableSlots,
      subjects: subjects.filter((subject) => subject.selected)
    });
  };

  return (
    <main className="shell">
      <form className="onboarding" onSubmit={submit}>
        <div className="onboarding-head">
          <p className="eyebrow">
            <Star size={16} /> New user setup
          </p>
          <h1>Tell GateFlow how you study.</h1>
          <p className="hero-copy">
            Mark covered topics instead of guessing percentages. Coverage is calculated from your
            checklist.
          </p>
        </div>

        <section className="panel form-section">
          <div className="section-title">
            <div>
              <p className="eyebrow">Study windows</p>
              <h2>When can you study?</h2>
            </div>
            <button className="ghost-btn" onClick={addSlot} type="button">
              Add slot
            </button>
          </div>
          <div className="slot-list">
            {comfortableSlots.map((slot, index) => (
              <article className="slot-row" key={`${slot.label}-${index}`}>
                <label>
                  Label
                  <input value={slot.label} onChange={(event) => updateSlot(index, { label: event.target.value })} />
                </label>
                <label>
                  Start
                  <input
                    type="time"
                    value={slot.start}
                    onChange={(event) => updateSlot(index, { start: event.target.value })}
                  />
                </label>
                <label>
                  End
                  <input
                    type="time"
                    value={slot.end}
                    onChange={(event) => updateSlot(index, { end: event.target.value })}
                  />
                </label>
                <label>
                  Energy {slot.energy}/5
                  <input
                    max="5"
                    min="1"
                    type="range"
                    value={slot.energy}
                    onChange={(event) => updateSlot(index, { energy: Number(event.target.value) })}
                  />
                </label>
                <button
                  className="ghost-btn remove-slot"
                  disabled={comfortableSlots.length === 1}
                  onClick={() => removeSlot(index)}
                  type="button"
                >
                  Remove slot
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="panel form-section">
          <h2>Choose subjects and mark covered topics</h2>
          <div className="topic-accordion onboarding-topics">
            {subjects.map((subject) => (
              <details key={subject.name}>
                <summary>
                  <span>{subject.name}</span>
                  <small>{coverageOf(subject)}% covered</small>
                </summary>
                <div className="subject-tuning">
                  <label className="check-row">
                    <input
                      checked={subject.selected}
                      type="checkbox"
                      onChange={(event) => updateSubject(subject.name, { selected: event.target.checked })}
                    />
                    <span>Include in my plan</span>
                  </label>
                  <label>
                    Favourite score: {subject.favorite}/5
                    <input
                      max="5"
                      min="1"
                      type="range"
                      value={subject.favorite}
                      onChange={(event) => updateSubject(subject.name, { favorite: Number(event.target.value) })}
                    />
                  </label>
                  <label>
                    Difficulty score: {subject.difficulty}/5
                    <input
                      max="5"
                      min="1"
                      type="range"
                      value={subject.difficulty}
                      onChange={(event) => updateSubject(subject.name, { difficulty: Number(event.target.value) })}
                    />
                  </label>
                  <label className="check-row">
                    <input
                      checked={subject.coverFirst}
                      type="checkbox"
                      onChange={(event) => updateSubject(subject.name, { coverFirst: event.target.checked })}
                    />
                    <span>Cover this first</span>
                  </label>
                </div>
                <div className="topic-list">
                  {subject.topics.map((topic) => (
                    <div className="topic-progress-row" key={topic}>
                      <span>{topic}</span>
                      <select
                        value={topicStatusOf(subject, topic)}
                        onChange={(event) => setTopicProgress(subject.name, topic, event.target.value)}
                      >
                        <option>Not started</option>
                        <option>In progress</option>
                        <option>Needs revision</option>
                        <option>Covered</option>
                      </select>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>

        <button className="wide-action" type="submit">
          Generate my planner <ArrowRight size={18} />
        </button>
      </form>
    </main>
  );
}

function Metric({ icon, label, value }) {
  return (
    <article className="metric">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default App;
