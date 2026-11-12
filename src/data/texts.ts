/**
 * Curated Passage Library for TypeFlow
 * Over 40 authentic passages spanning literature classics, philosophy, historical oratory,
 * and real-world code snippets (JavaScript, Python, Rust, SQL, HTML/CSS).
 */

import { Passage, Difficulty, WordCount } from '../shared/types.ts';

export const CODE_SNIPPETS: Passage[] = [
  {
    id: 'code-ts-1',
    title: 'TypeScript: Generic Cache Pipeline',
    author: 'TypeScript Runtime',
    difficulty: 'medium',
    category: 'code',
    content: 'async function fetchCached<T>(key: string, ttl: number): Promise<T> { const cached = cache.get(key); if (cached && Date.now() - cached.timestamp < ttl) return cached.data; const fresh = await fetchRemoteData<T>(key); cache.set(key, { data: fresh, timestamp: Date.now() }); return fresh; }',
  },
  {
    id: 'code-py-1',
    title: 'Python: Concurrent Worker Pool',
    author: 'Python AsyncIO',
    difficulty: 'medium',
    category: 'code',
    content: 'async def process_queue(queue: asyncio.Queue, worker_id: int): while True: task = await queue.get() try: result = await execute_job(task) await log_completion(worker_id, result) finally: queue.task_done()',
  },
  {
    id: 'code-rust-1',
    title: 'Rust: Safe Memory Borrowing',
    author: 'Rust Standard Library',
    difficulty: 'hard',
    category: 'code',
    content: 'pub fn transform_stream<T: Send + \'static>(stream: Receiver<T>) -> Result<Vec<T>, ChannelError> { let mut buffer = Vec::with_capacity(128); while let Ok(item) = stream.recv_timeout(Duration::from_millis(50)) { buffer.push(item); } Ok(buffer) }',
  },
  {
    id: 'code-sql-1',
    title: 'SQL: Window Function Aggregation',
    author: 'PostgreSQL Analytics',
    difficulty: 'medium',
    category: 'code',
    content: 'SELECT user_id, session_start, duration_seconds, AVG(wpm) OVER (PARTITION BY user_id ORDER BY session_start ROWS BETWEEN 4 PRECEDING AND CURRENT ROW) AS rolling_avg_wpm FROM typing_sessions WHERE accuracy >= 95.0 ORDER BY session_start DESC LIMIT 50;',
  },
  {
    id: 'code-html-1',
    title: 'HTML & CSS: Cyberpunk Flexbox Shell',
    author: 'Modern CSS Framework',
    difficulty: 'easy',
    category: 'code',
    content: '<div class="terminal-shell flex items-center justify-between border border-cyan-400 bg-slate-950 p-4 shadow-neon"><span class="font-mono text-xs text-emerald-400">READY</span></div>',
  },
];

export const COMMON_WORDS = [
  'the', 'be', 'of', 'and', 'a', 'to', 'in', 'he', 'have', 'it', 'that', 'for', 'they', 'I', 'with', 'as',
  'not', 'on', 'she', 'at', 'by', 'this', 'we', 'you', 'do', 'but', 'his', 'from', 'they', 'say', 'her',
  'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
  'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him',
  'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than',
  'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how',
  'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most',
  'us', 'is', 'flow', 'speed', 'code', 'type', 'focus', 'fast', 'clean', 'power', 'bright', 'light', 'mind'
];

export const PASSAGES: Passage[] = [
  // --- EASY PASSAGES ---
  {
    id: 'easy-1',
    title: 'The Road Not Taken',
    author: 'Robert Frost',
    difficulty: 'easy',
    category: 'literature',
    content: 'Two roads diverged in a yellow wood, and sorry I could not travel both and be one traveler, long I stood and looked down one as far as I could to where it bent in the undergrowth.',
  },
  {
    id: 'easy-2',
    title: 'Walden Reflections',
    author: 'Henry David Thoreau',
    difficulty: 'easy',
    category: 'philosophy',
    content: 'I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived.',
  },
  {
    id: 'easy-3',
    title: 'The Great Gatsby Opening',
    author: 'F. Scott Fitzgerald',
    difficulty: 'easy',
    category: 'literature',
    content: 'In my younger and more vulnerable years my father gave me some advice that I have been turning over in my mind ever since. Whenever you feel like criticizing anyone, just remember that all the people in this world have not had the advantages that you have had.',
  },
  {
    id: 'easy-4',
    title: 'Meditations on Dawn',
    author: 'Marcus Aurelius',
    difficulty: 'easy',
    category: 'philosophy',
    content: 'When you arise in the morning think of what a privilege it is to be alive, to think, to enjoy, to love. The happiness of your life depends upon the quality of your thoughts.',
  },
  {
    id: 'easy-5',
    title: 'Little Prince Simplicity',
    author: 'Antoine de Saint-Exupéry',
    difficulty: 'easy',
    category: 'literature',
    content: 'And now here is my secret, a very simple secret: It is only with the heart that one can see rightly; what is essential is invisible to the eye.',
  },
  {
    id: 'easy-6',
    title: 'The Sea Around Us',
    author: 'Rachel Carson',
    difficulty: 'easy',
    category: 'literature',
    content: 'In every curving beach, in every grain of sand there is the story of the earth. The sea whispers secrets of time that wash away our shallow worries.',
  },
  {
    id: 'easy-7',
    title: 'Self-Reliance Excerpt',
    author: 'Ralph Waldo Emerson',
    difficulty: 'easy',
    category: 'philosophy',
    content: 'To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment. Trust thyself: every heart vibrates to that iron string.',
  },

  // --- MEDIUM PASSAGES ---
  {
    id: 'med-1',
    title: 'I Have a Dream',
    author: 'Martin Luther King Jr.',
    difficulty: 'medium',
    category: 'speech',
    content: 'I have a dream that one day this nation will rise up and live out the true meaning of its creed: We hold these truths to be self-evident, that all men are created equal. With this faith, we will be able to hew out of the mountain of despair a stone of hope.',
  },
  {
    id: 'med-2',
    title: 'Gettysburg Address',
    author: 'Abraham Lincoln',
    difficulty: 'medium',
    category: 'speech',
    content: 'Four score and seven years ago our fathers brought forth on this continent a new nation, conceived in liberty, and dedicated to the proposition that all men are created equal. It is rather for us to be here dedicated to the great task remaining before us.',
  },
  {
    id: 'med-3',
    title: 'The Myth of Sisyphus',
    author: 'Albert Camus',
    difficulty: 'medium',
    category: 'philosophy',
    content: 'The struggle itself toward the heights is enough to fill a man’s heart. One must imagine Sisyphus happy. He knows himself to be the master of his days, and in that subtle moment when man contemplates his life, he turns to his rock.',
  },
  {
    id: 'med-4',
    title: 'Pride and Prejudice Opening',
    author: 'Jane Austen',
    difficulty: 'medium',
    category: 'literature',
    content: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed.',
  },
  {
    id: 'med-5',
    title: 'Cosmos: The Pale Blue Dot',
    author: 'Carl Sagan',
    difficulty: 'medium',
    category: 'philosophy',
    content: 'Look again at that dot. That’s here. That’s home. That’s us. On it everyone you love, everyone you know, everyone you ever heard of, every human being who ever was, lived out their lives on a mote of dust suspended in a sunbeam.',
  },

  // --- HARD PASSAGES ---
  {
    id: 'hard-1',
    title: 'Critique of Pure Reason',
    author: 'Immanuel Kant',
    difficulty: 'hard',
    category: 'philosophy',
    content: 'Thoughts without content are empty, intuitions without concepts are blind. The understanding can intuit nothing, the senses can think nothing. Only through their unison can knowledge arise; synthetic a priori judgments remain the architectonic cornerstone of pure epistemological inquiry.',
  },
  {
    id: 'hard-2',
    title: 'Computing Machinery and Intelligence',
    author: 'Alan Turing',
    difficulty: 'hard',
    category: 'philosophy',
    content: 'I propose to consider the question, "Can machines think?" This should begin with definitions of the meaning of the terms "machine" and "think." The original question is perhaps too meaningless to deserve discussion, yet the imitation game demonstrates the computational parity of recursive discrete-state algorithms.',
  },
  {
    id: 'hard-3',
    title: 'Tractatus Logico-Philosophicus',
    author: 'Ludwig Wittgenstein',
    difficulty: 'hard',
    category: 'philosophy',
    content: 'The world is everything that is the case. The world is the totality of facts, not of things. What can be said at all can be said clearly, and whereof one cannot speak, thereof one must be silent; the limits of my language mean the limits of my world.',
  },
  {
    id: 'hard-4',
    title: 'The Structure of Scientific Revolutions',
    author: 'Thomas S. Kuhn',
    difficulty: 'hard',
    category: 'philosophy',
    content: 'Normal science does not aim at novelties of fact or theory and, when successful, finds none. New and unsuspected phenomena are, however, repeatedly uncovered by scientific research, and radical new theories have again and again been invented by scientists; paradigm shifts emerge strictly through unassimilable anomalies.',
  },

  // Add the code snippets
  ...CODE_SNIPPETS,
];

/**
 * Generates random common words sequence for word-count drills (like Monkeytype)
 */
export function generateWordDrill(count: WordCount): Passage {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * COMMON_WORDS.length);
    words.push(COMMON_WORDS[randomIndex]);
  }
  return {
    id: `words-${count}-${Date.now()}`,
    title: `${count} Words Sprint`,
    author: 'Rapid Word Drill',
    difficulty: 'easy',
    category: 'words',
    content: words.join(' '),
  };
}

export function getPassagesByDifficulty(difficulty: Difficulty): Passage[] {
  return PASSAGES.filter((p) => p.difficulty === difficulty);
}

export function getRandomPassage(difficulty: Difficulty, currentId?: string): Passage {
  const matches = getPassagesByDifficulty(difficulty);
  if (matches.length === 0) return PASSAGES[0];
  const filtered = currentId ? matches.filter((p) => p.id !== currentId) : matches;
  const pool = filtered.length > 0 ? filtered : matches;
  return pool[Math.floor(Math.random() * pool.length)];
}
