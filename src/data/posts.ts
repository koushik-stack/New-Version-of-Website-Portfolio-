export interface Post {
  id: string;
  title: string;
  category: string;
  date: string;
  displayDate: string;
  excerpt: string;
  paragraphs: string[];
}

export const posts: Post[] = [
  {
    id: 'anthropic-interview',
    title: 'My interview experience at Anthropic',
    category: 'Career notes',
    date: '2025-12-26',
    displayDate: 'December 26, 2025',
    excerpt: 'Reflections on coding, system design, and the conversations behind the process.',
    paragraphs: [
      'My interview experience at Anthropic was technical and grounded in practical AI engineering. It began with a 30-minute recruiter call about my background, motivation, and understanding of the company’s mission. We also discussed expectations for system design, particularly infrastructure for serving AI models.',
      'The coding phase tested practical algorithmic thinking, correctness, efficiency, and edge cases. Preparing with NeetCode 75 helped me. The questions reminded me of LeetCode problems such as Ant on the Boundary (3028), Make String Anti-palindrome (3088), Count Ways to Build Rooms in an Ant Colony (1916), and Last Moment Before All Ants Fall Out of a Plank (1503).',
      'The hiring manager discussion included a close look at a completed project and cross-language code review. I was asked to identify bugs, explain intent, and discuss trade-offs.',
      'The onsite stage included a one-hour Python coding round, a system design session using a visual drawing tool, and a discussion about designing an agentic AI system. Topics included modular agents, memory, feedback loops, safety constraints, scalability, and APIs for developers and partners.',
      'The behavioral conversations covered AI ethics, data protection, knowledge sharing, and the effect of AI on work. What stayed with me was the combination of technical depth and thoughtful discussion about responsibility. These are personal reflections on my experience, rather than a guide to the current interview process.',
    ],
  },
];
