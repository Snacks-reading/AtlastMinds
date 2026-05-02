export class MasteryEngine {
  constructor() {
    this.xp = 0;
    this.streak = 0;
    this.missCounts = new Map();
    this.spacedQueue = [];
  }

  submitResult(itemId, correct) {
    const misses = this.missCounts.get(itemId) || 0;
    if (correct) {
      this.xp += 10;
      this.streak += 1;
      this.missCounts.set(itemId, 0);
      this.enqueueReview(itemId, this.streak);
      return { state: "correct", xp: this.xp, streak: this.streak };
    }

    this.streak = 0;
    const updatedMisses = misses + 1;
    this.missCounts.set(itemId, updatedMisses);
    let support = "hint";
    if (updatedMisses === 2) support = "explanation";
    if (updatedMisses >= 3) support = "teach_show_answer";
    return { state: "incorrect", support, misses: updatedMisses, xp: this.xp, streak: this.streak };
  }

  enqueueReview(itemId, streakValue) {
    const dueIn = Math.min(5, 1 + Math.floor(streakValue / 2));
    this.spacedQueue.push({ itemId, dueIn, insertedAt: Date.now() });
  }

  tickQueue() {
    this.spacedQueue = this.spacedQueue.map((entry) => ({ ...entry, dueIn: entry.dueIn - 1 }));
    const due = this.spacedQueue.filter((entry) => entry.dueIn <= 0);
    this.spacedQueue = this.spacedQueue.filter((entry) => entry.dueIn > 0);
    return due;
  }

  snapshot() {
    return {
      xp: this.xp,
      streak: this.streak,
      queueSize: this.spacedQueue.length,
    };
  }
}
