import { generatePuzzle } from './generator.js';

self.onmessage = ({ data }) => {
  try {
    const puzzle = generatePuzzle({ ...data, onProgress: progress => self.postMessage({ progress }) });
    self.postMessage({ puzzle });
  } catch {
    self.postMessage({ error: true });
  }
};
