import { formatAssessmentContent } from '../src/shared/aiAssessmentFormatting';

describe('legal case AI assessment formatting', () => {
  it('separates legal observations from numbered next steps', () => {
    const result = formatAssessmentContent(
      'May evidence supporting the complaint. Further verification is still required. ' +
      'Ang susunod na hakbang ay (1) magpadala ng demand letter; (2) ihanda ang pleadings; (3) isaalang-alang ang police report.'
    );

    expect(result.observations).toEqual([
      'May evidence supporting the complaint.',
      'Further verification is still required.',
    ]);
    expect(result.nextSteps).toEqual([
      'magpadala ng demand letter',
      'ihanda ang pleadings',
      'isaalang-alang ang police report.',
    ]);
  });

  it('provides an understandable fallback for an empty assessment', () => {
    expect(formatAssessmentContent('')).toEqual({
      observations: ['No assessment available.'],
      nextSteps: [],
    });
  });
});
