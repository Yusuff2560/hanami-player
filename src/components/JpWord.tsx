import { useEffect, useRef, useState } from 'react';
import { hanamiJapaneseWords } from '../engine/themes';
import { setVizTarget } from '../engine/audio';

let lastWord = '花見';

function pickWord() {
  let next = lastWord;
  for (let i = 0; i < 12 && next === lastWord; i++) {
    next = hanamiJapaneseWords[Math.floor(Math.random() * hanamiJapaneseWords.length)];
  }
  lastWord = next;
  return next;
}

export default function JpWord({ theme }: { theme: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [word, setWord] = useState('花見');

  useEffect(() => {
    setVizTarget(ref.current);
    return () => setVizTarget(null);
  }, []);

  useEffect(() => {
    setWord(pickWord());
  }, [theme]);

  return (
    <div className="jp-word" id="jpWordVisualizer" ref={ref} lang="ja" aria-hidden="true" title={'Japanese word: ' + word}>
      {word}
    </div>
  );
}
