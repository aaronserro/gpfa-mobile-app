import assert from 'node:assert/strict';
import test from 'node:test';

import type { Poll } from '../src/api/types';
import {
  firstUnansweredPollQuestionIndex,
  newPollQuestion,
  normalizePollQuestions,
  pollAnswerMap,
  pollAnswersAreComplete,
  pollAnswersFromMap,
  pollQuestionsAreValid,
} from '../src/lib/polls';

const poll: Poll = {
  id: 'poll-1',
  closes: 'Sep 30',
  questions: [
    {
      id: 'question-1',
      text: 'Preferred settlement window?',
      options: [
        { id: 'option-1a', label: 'Morning', votes: 2, percentage: 40 },
        { id: 'option-1b', label: 'Afternoon', votes: 3, percentage: 60 },
      ],
    },
    {
      id: 'question-2',
      text: 'Preferred review cadence?',
      options: [
        { id: 'option-2a', label: 'Monthly', votes: 4, percentage: 80 },
        { id: 'option-2b', label: 'Quarterly', votes: 1, percentage: 20 },
      ],
    },
    {
      id: 'question-3',
      text: 'Should results be shared?',
      options: [
        { id: 'option-3a', label: 'Yes', votes: 5, percentage: 100 },
        { id: 'option-3b', label: 'No', votes: 0, percentage: 0 },
      ],
    },
  ],
  answers: [],
  hasSubmitted: false,
  responseCount: 5,
};

test('poll answer helpers preserve canonical question order', () => {
  const map = {
    'question-3': 'option-3a',
    'question-1': 'option-1b',
    'question-2': 'option-2a',
  };

  assert.deepEqual(pollAnswersFromMap(poll, map), [
    { questionId: 'question-1', optionId: 'option-1b' },
    { questionId: 'question-2', optionId: 'option-2a' },
    { questionId: 'question-3', optionId: 'option-3a' },
  ]);
  assert.deepEqual(pollAnswerMap(pollAnswersFromMap(poll, map)), map);
});

test('poll completeness requires one valid option for every question', () => {
  assert.equal(
    pollAnswersAreComplete(poll, {
      'question-1': 'option-1a',
      'question-2': 'option-2b',
    }),
    false
  );
  assert.equal(
    pollAnswersAreComplete(poll, {
      'question-1': 'option-1a',
      'question-2': 'option-2b',
      'question-3': 'unknown-option',
    }),
    false
  );
  assert.equal(
    pollAnswersAreComplete(poll, {
      'question-1': 'option-1a',
      'question-2': 'option-2b',
      'question-3': 'option-3a',
    }),
    true
  );
});

test('questionnaire resumes at the first unanswered question', () => {
  assert.equal(firstUnansweredPollQuestionIndex(poll, {}), 0);
  assert.equal(
    firstUnansweredPollQuestionIndex(poll, { 'question-1': 'option-1a' }),
    1
  );
  assert.equal(
    firstUnansweredPollQuestionIndex(poll, {
      'question-1': 'option-1a',
      'question-2': 'option-2a',
      'question-3': 'option-3a',
    }),
    0
  );
});

test('question drafts trim values and enforce server option bounds', () => {
  const normalized = normalizePollQuestions([
    {
      text: '  First question? ',
      options: [{ label: ' Yes ' }, { label: ' No ' }],
    },
  ]);

  assert.deepEqual(normalized, [
    {
      text: 'First question?',
      options: [{ label: 'Yes' }, { label: 'No' }],
    },
  ]);
  assert.equal(pollQuestionsAreValid(normalized), true);
  assert.equal(pollQuestionsAreValid([{ text: 'Missing option', options: [{ label: 'Only' }] }]), false);
  assert.deepEqual(newPollQuestion(), {
    text: '',
    options: [{ label: '' }, { label: '' }],
  });
});
