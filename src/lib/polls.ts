import type { Poll, PollAnswer, PollQuestionInput } from '../api/types';

export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 8;

export function newPollQuestion(): PollQuestionInput {
  return {
    text: '',
    options: [{ label: '' }, { label: '' }],
  };
}

export function normalizePollQuestions(
  questions: PollQuestionInput[]
): PollQuestionInput[] {
  return questions.map((question) => ({
    text: question.text.trim(),
    options: question.options.map((option) => ({ label: option.label.trim() })),
  }));
}

export function pollQuestionsAreValid(questions: PollQuestionInput[]): boolean {
  return (
    questions.length > 0 &&
    questions.every(
      (question) =>
        question.text.trim().length > 0 &&
        question.options.length >= MIN_POLL_OPTIONS &&
        question.options.length <= MAX_POLL_OPTIONS &&
        question.options.every((option) => option.label.trim().length > 0)
    )
  );
}

export function pollAnswerMap(
  answers: PollAnswer[]
): Record<string, string> {
  return Object.fromEntries(
    answers.map((answer) => [answer.questionId, answer.optionId])
  );
}

export function pollAnswersFromMap(
  poll: Pick<Poll, 'questions'>,
  answers: Record<string, string>
): PollAnswer[] {
  return poll.questions.flatMap((question) => {
    const optionId = answers[question.id];
    return optionId ? [{ questionId: question.id, optionId }] : [];
  });
}

export function pollAnswersAreComplete(
  poll: Pick<Poll, 'questions'>,
  answers: Record<string, string>
): boolean {
  return (
    poll.questions.length > 0 &&
    poll.questions.every((question) =>
      question.options.some((option) => option.id === answers[question.id])
    )
  );
}

export function firstUnansweredPollQuestionIndex(
  poll: Pick<Poll, 'questions'>,
  answers: Record<string, string>
): number {
  const index = poll.questions.findIndex(
    (question) => !question.options.some((option) => option.id === answers[question.id])
  );
  return index === -1 ? 0 : index;
}
