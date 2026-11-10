import { generatePuzzle } from './generator.js';

self.onmessage = ({ data }) => {
  try {
    const puzzle = generatePuzzle({ ...data, onProgress: progress => self.postMessage({ progress }) });
    self.postMessage({ puzzle });
  } catch (error) {
    self.postMessage({ error: error.code === 'DIFFICULTY_UNAVAILABLE' ? 'difficulty' : 'generation' });
  }
};
