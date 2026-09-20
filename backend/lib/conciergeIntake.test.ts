import assert from "node:assert/strict";
import {
  classifyConfirmReply,
  containsToken,
  detectStatedContradiction,
  extractHardConstraintTokens,
  findPreferenceHardConflicts,
  isEmailQuestion,
  isListConfirmQuestion,
  promoteHardConstraints,
  shouldBlockIntakeSubmit,
  stripConflictingPreferences,
} from "./conciergeIntake";

assert.equal(classifyConfirmReply("yes"), "yes");
assert.equal(classifyConfirmReply("Yes."), "yes");
assert.equal(classifyConfirmReply("that's right"), "yes");
assert.equal(classifyConfirmReply("no, onions are a hard no for me"), "no");
assert.equal(classifyConfirmReply("no"), "no");
assert.equal(classifyConfirmReply("yes, but add onions"), "no");
assert.equal(classifyConfirmReply("onions are a hard no for me"), "other");

assert.ok(isListConfirmQuestion("Is this list correct?"));
assert.ok(isListConfirmQuestion("Does that sound right, or want to change anything?"));
assert.ok(!isListConfirmQuestion("Any email we can reach you at? Skip if not."));
assert.ok(isEmailQuestion("Optional email for the host if a kitchen can't guarantee that?"));

assert.deepEqual(extractHardConstraintTokens("no, onions are a hard no for me"), ["onions"]);
assert.deepEqual(
  extractHardConstraintTokens("I'm allergic to peanut butter and shrimp"),
  ["peanut butter", "shrimp"]
);
assert.deepEqual(extractHardConstraintTokens("I cannot eat gluten"), ["gluten"]);
assert.deepEqual(extractHardConstraintTokens("I prefer spicy food"), []);

const promoted = promoteHardConstraints(
  {
    hard_excludes: ["meat", "gelatin", "eggs", "animal rennet"],
    complex_restrictions: [],
    soft_preferences: ["flexible", "onions"],
    severity: "medium",
  },
  ["I'm vegetarian", "no, onions are a hard no for me"]
);
assert.ok(promoted.hard_excludes.includes("onions"));
assert.ok(!promoted.soft_preferences.includes("onions"));

const ice = findPreferenceHardConflicts(
  ["peanut butter", "shrimp"],
  ["peanut butter shrimp ice cream"]
);
assert.equal(ice.length, 2);

const stripped = stripConflictingPreferences({
  hard_excludes: ["peanut butter", "shrimp"],
  soft_preferences: ["peanut butter shrimp ice cream", "spicy"],
  severity: "high",
});
assert.deepEqual(stripped.soft_preferences, ["spicy"]);

const contradiction = detectStatedContradiction(
  ["I'm allergic to peanut butter and shrimp"],
  "I prefer peanut butter shrimp ice cream"
);
assert.ok(contradiction);
assert.ok(contradiction.hards.includes("peanut butter"));
assert.ok(contradiction.hards.includes("shrimp"));

assert.equal(
  shouldBlockIntakeSubmit({
    askedListConfirm: true,
    confirmReply: "no",
    contradiction: null,
  }),
  true
);
assert.equal(
  shouldBlockIntakeSubmit({
    askedListConfirm: true,
    confirmReply: "yes",
    contradiction: null,
  }),
  true
);
assert.equal(
  shouldBlockIntakeSubmit({
    askedListConfirm: false,
    confirmReply: null,
    contradiction,
  }),
  true
);

assert.ok(containsToken("peanut butter shrimp ice cream", "shrimp"));
assert.ok(!containsToken("eggplant", "egg"));

console.log("conciergeIntake tests passed");
