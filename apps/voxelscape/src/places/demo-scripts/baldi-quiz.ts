// The problems a notebook's quiz asks, kept apart from the demo's own state so
// the arithmetic and the choice of which quiz a notebook gets can be read on
// their own. The original asks three plus-or-minus problems the first time and
// two of plus, minus, times, or divide after that, then one impossible
// "glitch" problem no answer satisfies.
import { choice, randint } from "voxelscape";

/** One problem the quiz asks. */
export interface Question {
  readonly prompt: string;
  readonly answer: number;
  readonly choices: readonly number[];
  /** A problem no answer satisfies: every button reads wrong. */
  readonly glitch: boolean;
}

/** One step of a quiz: a problem, or a taunt shown after a wrong answer. */
export type QuizStep =
  { kind: "question"; question: Question } | { kind: "taunt"; line: string };

const GLITCH_LINES: readonly string[] = [
  "GERE 5TA 4HAM A 1USBEKEN",
  "EEREREEREKEEKERE",
  "ANSWER THE QUESTION. ANSWER THE QUESTION.",
];

/** The lines Baldi snaps back with after a wrong answer. */
export const TAUNTS: readonly string[] = [
  "I'M GOING TO BEAT YOU!",
  "TOO FAST, TOO SOON.",
  "DID YOU EAT MY DAD'S 175$ DART BOARD?!",
  "I CAN'T BELIEVE YOU HAVE DONE THIS!",
  "EVERY WRONG ANSWER MAKES ME FASTER.",
];

/** Four distinct answers around `answer`, shuffled from the seeded stream. */
export const makeChoices = (answer: number): number[] => {
  const picked = [answer];
  for (const candidate of [
    answer + 1,
    answer - 1,
    answer + 2,
    answer - 2,
    answer + 3,
  ]) {
    if (picked.length === 4) {
      break;
    }
    if (candidate >= 0 && !picked.includes(candidate)) {
      picked.push(candidate);
    }
  }
  for (let i = picked.length - 1; i > 0; i--) {
    const j = randint(0, i);
    const swap = picked[i];
    picked[i] = picked[j];
    picked[j] = swap;
  }
  return picked;
};

/** One problem: the first notebook asks only +/-, later ones add ×, ÷, and the glitch. */
export const makeQuestion = (first: boolean, glitch: boolean): Question => {
  if (glitch) {
    const answer = randint(1, 9);
    return {
      prompt: choice(GLITCH_LINES) ?? "WRONG?WRONG?",
      answer,
      choices: makeChoices(answer),
      glitch: true,
    };
  }
  const kind = first ? randint(0, 1) : randint(0, 3);
  let prompt: string;
  let answer: number;
  if (kind === 0) {
    const a = randint(1, 9);
    const b = randint(1, 9);
    prompt = `${a} + ${b} = ?`;
    answer = a + b;
  } else if (kind === 1) {
    const a = randint(0, 9);
    const b = randint(0, a);
    prompt = `${a} - ${b} = ?`;
    answer = a - b;
  } else if (kind === 2) {
    const a = 2 * randint(1, 4);
    const b = 2 * randint(1, 4);
    prompt = `${a} * ${b} = ?`;
    answer = a * b;
  } else {
    const a = 2 * randint(1, 4);
    const b = 2 * randint(1, 4);
    prompt = `${a * b} / ${a} = ?`;
    answer = b;
  }
  return { prompt, answer, choices: makeChoices(answer), glitch: false };
};

/** The steps of a notebook's quiz. */
export const buildQuiz = (first: boolean): QuizStep[] => {
  const steps: QuizStep[] = [];
  const plainCount = first ? 3 : 2;
  for (let i = 0; i < plainCount; i++) {
    steps.push({ kind: "question", question: makeQuestion(first, false) });
  }
  if (!first) {
    steps.push({ kind: "question", question: makeQuestion(first, true) });
  }
  return steps;
};
