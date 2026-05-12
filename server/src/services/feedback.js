const reasonPatterns = [
  {
    type: "health",
    words: ["sick", "fever", "headache", "health", "doctor", "pain"],
    response:
      "Health comes first. I will reduce the next study block and move this task into a lighter recovery slot."
  },
  {
    type: "time",
    words: ["time", "late", "college", "office", "commute", "unexpected"],
    response:
      "This looks like a time constraint. I will split the task into smaller blocks and place one in your highest-energy slot."
  },
  {
    type: "difficulty",
    words: ["hard", "difficult", "confusing", "stuck", "did not understand", "weak"],
    response:
      "The topic needs support, not pressure. I will add a concept-repair block before assigning more practice."
  },
  {
    type: "fatigue",
    words: ["tired", "sleep", "burnout", "exhausted", "fatigue"],
    response:
      "Fatigue is showing up. I will keep the next plan lighter and pair this task with revision instead of a long new topic."
  },
  {
    type: "motivation",
    words: ["bored", "motivation", "procrastinated", "mood", "distracted"],
    response:
      "I will restart this with a shorter, more concrete task and add a quick PYQ win after it."
  },
  {
    type: "external",
    words: ["family", "event", "travel", "guest", "power cut", "internet"],
    response:
      "That seems external and temporary. I will preserve the task priority without overloading tomorrow."
  }
];

export const interpretFeedback = (message = "") => {
  const normalized = message.toLowerCase();
  const match = reasonPatterns.find((reason) =>
    reason.words.some((word) => normalized.includes(word))
  );

  return (
    match || {
      type: "unknown",
      response:
        "I have marked this for follow-up and will keep the task in backlog with a moderate priority boost."
    }
  );
};
