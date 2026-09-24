export type AssessmentContent = {
  observations: string[];
  nextSteps: string[];
};

const cleanListItem = (value: string) => value
  .replace(/^\s*(?:[-•]|\(?\d+\)?[.)]?)\s*/, '')
  .replace(/\s+/g, ' ')
  .trim();

export const formatAssessmentContent = (value?: string | null): AssessmentContent => {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return { observations: ['No assessment available.'], nextSteps: [] };

  const nextStepMarker = text.match(/\b(?:Ang susunod na hakbang ay|Recommended next steps?|Suggested next steps?)\s*:?\s*/i);
  const observationsText = nextStepMarker ? text.slice(0, nextStepMarker.index).trim() : text;
  const stepsText = nextStepMarker
    ? text.slice((nextStepMarker.index || 0) + nextStepMarker[0].length).trim()
    : '';

  const observations = observationsText
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ])/)
    .map(cleanListItem)
    .filter(Boolean);
  const nextSteps = stepsText
    .split(/\s*;\s*(?=\(?\d+\)?[.)]?\s*)|(?=\(\d+\)\s*)/)
    .map(cleanListItem)
    .filter(Boolean);

  return {
    observations: observations.length ? observations : [text],
    nextSteps,
  };
};

export const formatDetailItems = (value?: string | null) => (value || '')
  .split(/\n|;|(?=\(\d+\)\s*)/)
  .map(cleanListItem)
  .filter(Boolean);
