// Reading practice tests — adapted from github.com/LuchoBazz/ielts-ai-dataset (CC BY 4.0),
// synthetic (AI-generated) academic reading tests, normalised into a uniform
// choice/text item shape. See scratch/normalize-reading.cjs in the ielts-helper
// repo for the transform, and data/readingPractice.json's _source field for attribution.
const data = require('./data/readingPractice.json');

function listTests() {
  return data.tests.map(t => ({
    id: t.id,
    title: t.title,
    band: t.band,
    passageCount: t.passages.length,
    itemCount: t.passages.reduce((s, p) => s + p.groups.reduce((s2, g) => s2 + g.items.length, 0), 0),
  }));
}

function stripAnswers(test) {
  return {
    id: test.id,
    title: test.title,
    band: test.band,
    passages: test.passages.map(p => ({
      title: p.title,
      content: p.content,
      groups: p.groups.map(g => ({
        instructions: g.instructions,
        items: g.items.map(({ id, kind, prompt, options }) => ({ id, kind, prompt, options })),
      })),
    })),
  };
}

function getTest(id) {
  const test = data.tests.find(t => t.id === id);
  return test ? stripAnswers(test) : null;
}

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

/** answers: [{ itemId, value }] */
function scoreTest(id, answers = []) {
  const test = data.tests.find(t => t.id === id);
  if (!test) return null;

  const byId = new Map();
  test.passages.forEach(p => p.groups.forEach(g => g.items.forEach(it => byId.set(it.id, it))));

  const givenById = new Map(answers.map(a => [a.itemId, a.value]));
  let correct = 0;
  const total = byId.size;
  const details = [];

  for (const [itemId, item] of byId) {
    const given = givenById.get(itemId);
    const accepted = item.kind === 'text' ? (item.accepted || [item.answer]).map(norm) : [norm(item.answer)];
    const isCorrect = given != null && accepted.includes(norm(given));
    if (isCorrect) correct += 1;
    details.push({ itemId, correct: isCorrect, correctAnswer: item.answer, given: given ?? null });
  }

  return { testId: id, correct, total, details };
}

module.exports = { listTests, getTest, scoreTest };
