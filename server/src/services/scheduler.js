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

export const buildAdaptiveSchedule = ({ profile, tasks = [] }) => {
  const slots = [...(profile.comfortableSlots || [])].sort((a, b) => b.energy - a.energy);
  const subjects = (profile.subjects || []).filter((subject) => subject.selected !== false);

  let backlogWeights = {};
  if (profile.backlog && Array.isArray(profile.backlog) && profile.backlog.length > 0) {
    backlogWeights = profile.backlog.reduce((acc, item) => {
      acc[item.subject] = (acc[item.subject] || 0) + (item.weight || 0);
      return acc;
    }, {});
  } else if (tasks && Array.isArray(tasks) && tasks.length > 0) {
    backlogWeights = tasks.reduce((acc, task) => {
      if (task.status === "backlog" || task.status === "missed") {
        acc[task.subject] = (acc[task.subject] || 0) + 1 + (task.backlogWeight || 0);
      }
      return acc;
    }, {});
  }

  const pool = subjects
    .map((subject) => {
      const subjectObj = subject.toObject ? subject.toObject() : subject;
      const coverage = coverageOf(subjectObj);
      const remaining = 1 - coverage / 100;
      const chosenBoost = subjectObj.coverFirst ? 2.2 : 0;
      const priority =
        remaining * 3 +
        (subjectObj.difficulty / 5) * 2 +
        ((6 - subjectObj.favorite) / 5) +
        chosenBoost +
        (backlogWeights[subjectObj.name] || 0) * 1.4;
      return { ...subjectObj, coverage, priority };
    })
    .sort((a, b) => b.priority - a.priority);

  if (!slots.length || !pool.length) {
    return [];
  }

  const schedule = slots.map((slot, index) => {
    const subject = pool[index % pool.length];
    const available = minutesBetween(slot.start, slot.end);
    const difficultyBoost = subject.difficulty * 8;
    const favoriteDrag = (6 - subject.favorite) * 5;
    const backlogBoost = (backlogWeights[subject.name] || 0) * 10;
    const duration = clamp(roundBlock(40 + difficultyBoost + favoriteDrag + backlogBoost), 30, available);
    const mode = backlogWeights[subject.name] ? "Backlog repair" : "Core study";
    const id = `${slot.label}-${subject.name}-${index}`;

    return {
      id,
      label: slot.label,
      start: slot.start,
      end: slot.end,
      energy: slot.energy,
      subject: subject.name,
      topic: pickTopic(subject),
      duration: Math.round(duration),
      score: subject.priority.toFixed(1),
      mode,
      reason: `${subject.name} gets ${Math.round(duration)} minutes because coverage is ${coverageOf(subject)}%, difficulty is ${subject.difficulty}/5, favorite score is ${subject.favorite}/5, and backlog weight is ${backlogWeights[subject.name] || 0}.`
    };
  });

  const isWeekend = [0, 6].includes(new Date().getDay());
  if (isWeekend) {
    const coveredSubject = pool.find((subject) => subject.completedTopics?.length);
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
        mode: "Covered-topic revision",
        reason: `Flexible weekend revision block for ${coveredSubject.name} since it has covered topics.`
      });
    }
  }

  return schedule;
};

const pickTopic = (subject) => {
  const nextTopic = subject.topics?.find((topic) => topicStatusOf(subject, topic) !== "Covered");
  return nextTopic || "Revision + PYQs";
};
