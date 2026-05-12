const minutesBetween = (start, end) => {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const roundBlock = (minutes) => Math.max(30, Math.round(minutes / 10) * 10);

const coverageOf = (subject) => {
  if (subject.topics?.length) {
    return Math.round(((subject.completedTopics?.length || 0) / subject.topics.length) * 100);
  }
  return subject.coverage || 0;
};

const topicStatusOf = (subject, topic) => {
  if (subject.completedTopics?.includes(topic)) return "Covered";
  if (subject.topicProgress instanceof Map) return subject.topicProgress.get(topic) || "Not started";
  return subject.topicProgress?.[topic] || "Not started";
};

const subjectScore = (subject, backlogWeight = 0) => {
  const remaining = 1 - coverageOf(subject) / 100;
  const difficulty = subject.difficulty / 5;
  const favoriteRelief = (6 - subject.favorite) / 5;
  const chosenBoost = subject.coverFirst ? 2.2 : 0;
  return remaining * 3 + difficulty * 2 + favoriteRelief + chosenBoost + backlogWeight * 1.4;
};

export const buildAdaptiveSchedule = ({ profile, tasks = [] }) => {
  const slots = [...(profile.comfortableSlots || [])].sort((a, b) => b.energy - a.energy);
  const subjects = (profile.subjects || []).filter((subject) => subject.selected !== false);
  const backlogBySubject = tasks.reduce((acc, task) => {
    if (task.status === "backlog" || task.status === "missed") {
      acc[task.subject] = (acc[task.subject] || 0) + 1 + (task.backlogWeight || 0);
    }
    return acc;
  }, {});

  const pool = subjects
    .map((subject) => ({
      ...subject,
      priority: subjectScore(subject, backlogBySubject[subject.name] || 0)
    }))
    .sort((a, b) => b.priority - a.priority);

  if (!slots.length || !pool.length) {
    return [];
  }

  return slots.map((slot, index) => {
    const subject = pool[index % pool.length];
    const available = minutesBetween(slot.start, slot.end);
    const difficultyBoost = subject.difficulty * 8;
    const favoriteDrag = (6 - subject.favorite) * 5;
    const backlogBoost = (backlogBySubject[subject.name] || 0) * 12;
    const duration = clamp(roundBlock(40 + difficultyBoost + favoriteDrag + backlogBoost), 30, available);
    const taskType = backlogBySubject[subject.name] ? "Backlog repair" : "Core study";

    return {
      slot: slot.label,
      start: slot.start,
      end: slot.end,
      energy: slot.energy,
      subject: subject.name,
      topic: pickTopic(subject),
      duration: Math.round(duration),
      taskType,
      priority: Number(subject.priority.toFixed(2)),
      reason: `${subject.name} gets ${Math.round(duration)} minutes because coverage is ${coverageOf(subject)}%, difficulty is ${subject.difficulty}/5, favorite score is ${subject.favorite}/5, and backlog weight is ${backlogBySubject[subject.name] || 0}.`
    };
  });
};

const pickTopic = (subject) => {
  const nextTopic = subject.topics?.find((topic) => topicStatusOf(subject, topic) !== "Covered");
  if (nextTopic) return nextTopic;
  const coverage = coverageOf(subject);
  if (coverage < 35) return "Build fundamentals";
  if (coverage < 70) return "Mixed practice + weak areas";
  return "Revision and PYQs";
};
