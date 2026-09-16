export interface Experience {
  company: string;
  role: string;
  period: string;
  description: string[];
  focus: string[];
}


export const experience: Experience[] = [
  {
    company: 'Anthropic',
    role: 'Senior Software Engineer',
    period: 'Current',
    description: [
    '', 'Worked on tokenization and encoding.'],
    focus: ['Machine learning', 'ML systems', 'Tokenization'],
  },
  {
    company: 'Penguin & Threap Connect',
    role: 'Previous experience',
    period: 'Previously',
    description: ['Developed web software.', 'Contributed to AI research.'],
    focus: ['Software engineering', 'Web development'],
  },
  {
    company: 'Amazon & Meta',
    role: 'Internships',
    period: 'Previously',
    description: ['Contributed to software engineering and machine learning.'],
    focus: ['Software engineering', 'Machine learning'],
  },
  {
    company: 'Amazon & Meta',
    role: 'Internships',
    period: 'Previously',
    description: ['Contributed to software engineering and machine learning.'],
    focus: ['Software engineering', 'Machine learning'],

  },
];
