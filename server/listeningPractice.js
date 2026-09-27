// Listening practice tests — adapted from github.com/LuchoBazz/ielts-ai-dataset (CC BY 4.0),
// synthetic (AI-generated) academic listening tests + TTS audio. Only sections with a real
// audio file in the source are included. See scratch/normalize-listening.cjs in the
// ielts-helper repo for the transform.
const data = require('./data/listeningPractice.json');

function listTests() {
  return data.tests.map(t => ({
    id: t.id,
    title: t.title,
    difficulty: t.difficulty,
    sections: t.sections.map(s => ({ sectionNumber: s.sectionNumber, title: s.title, itemCount: s.groups.reduce((n, g) => n + g.items.length, 0) })),
  }));
}

function stripAnswers(test) {
  return {
    id: test.id,
    title: test.title,
    sections: test.sections.map(s => ({
      sectionNumber: s.sectionNumber,
      title: s.title,
      audioUrl: s.audioUrl,
      groups: s.groups.map(g => ({
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
  test.sections.forEach(s => s.groups.forEach(g => g.items.forEach(it => byId.set(it.id, it))));

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
