import { describe, expect, it } from 'vitest';
import { suggestedQuestions } from './planQuestions';

describe('suggested plan questions', () => {
  it('starts with the household’s first medication and must-have hospital, then general questions, up to 4', () => {
    expect(suggestedQuestions({ drugNames: ['Testolol', 'Examplex'], hospitalNames: ['Test General Hospital', 'Other Hospital'] })).toEqual([
      'Is Testolol covered, and what will it cost?',
      'Is Test General Hospital in network?',
      'What do I pay for a specialist visit?',
      'What needs prior approval?',
    ]);
  });

  it('fills with general questions when the household has no medications or hospitals', () => {
    expect(suggestedQuestions({ drugNames: [], hospitalNames: [' '] })).toEqual([
      'What do I pay for a specialist visit?',
      'What needs prior approval?',
      "What isn't covered?",
    ]);
    expect(suggestedQuestions({ drugNames: ['Testolol'], hospitalNames: [] })).toHaveLength(4);
  });
});
