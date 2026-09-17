export interface SocialLink {
  label: string;
  href: string;
}

export interface Resume {
  label: string;
  href: string;
}

export const socialLinks: SocialLink[] = [
  { label: 'GitHub', href: 'https://github.com/koushik-stack' },
  { label: 'Bluesky', href: 'https://bsky.app/profile/kukdev.bsky.social' },
  { label: 'Discord', href: 'https://discordapp.com/users/457081376873644034' },
];

export const portfolio = {
  name: 'Koushik',
  role: 'Senior Software Engineer',
  eyebrow: 'A little curiosity. A lot of building.',
  headline: 'Software  engineer and  researcher  in  Sydney City. I build ML models at Anthropic by day and make research at the intersection of tech by night. Occasionally both happen at the same time.',
  introduction:
    'I build software across machine learning, developer tools, and the web. I enjoy turning complex ideas into useful, thoughtful experiences.',
  focus: ['Software engineering', 'Machine learning', 'Creative exploration'],
  about: [
    'Hello! I’m Koushik, a software engineer at Anthropic. I build machine learning models and improve API streaming performance on Claude.ai.',
    'Previously I have worked in Threap connect , Holotech and Pengiun',
    'oh! Iam also currently Studying Bachelors in Mechatronics at University of Sydney',
    'My work spans from  machine learning, to cloud infrastructure, to full stack development. I like moving between the bigger picture and the small details, whether I’m building a language interpreter or making a dashboard easier to use.',
    'Away from the editor, I’m usually exploring gaming, hardware, geography, history, economics, or politics. Curiosity tends to connect it all.',
  ],
  skills: ['Python', 'TypeScript', 'JavaScript', 'C / C++', 'React', 'SQL', 'AWS', 'Transformers', 'Java','GO'],
  contact: {
    heading: 'Let’s make something useful.',
    description:
      'Have a project in mind, a role to discuss, or an interesting idea? I’d love to hear about it. Say hello on Discord and let’s start a conversation.',
    label: 'Say hello on Discord',
    href: 'https://discordapp.com/users/457081376873644034',
  },
  // Add a real file under public/ before setting this to { label, href }.
  resume: null as Resume | null,
};

export const navigationLinks = [
  { number: '01', label: 'About', href: '#about' },
  { number: '02', label: 'Experience', href: '#experience' },
  { number: '03', label: 'Work', href: '#projects' },
  { number: '04', label: 'Contact', href: '#contact' },
];
