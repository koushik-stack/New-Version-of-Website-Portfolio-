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
    role: ' Software Engineer II ',
    period: 'September 2025-Current',
    description: [
    'Led optimization of core tokenization and API infrastructure, driving a 25% performance improvement and significantly decreasing streaming latency for production systems', 
    'Engineered large-scale training efficiencies, increasing context window capacity by 9% and reducing compute costs through advanced ML systems optimization.', 
    'Integrated Claude encoders into production bidding models, significantly enhancing feature representation and driving measurable improvements in prediction performance.'],
    focus: ['Machine learning', 'ML systems', 'Tokenization'],
  },
  {
    company: ' Holotech',
    role: 'Engineering Manager ',
    period: 'June 2025 - December 2025',
    description: ['Accelerated project delivery speed by 9% and reduced system downtime by 7% by implementing streamlined workflows and rigorous engineering oversight ', 
    'Spearheaded the deployment of two new architectural models into production, significantly accelerating innovation and system reliability for a millions of active users ','Boosted team efficiency by 15% through targeted mentorship and process improvements, while simultaneously improving quality performance by 5%'],
    focus: ['Engineering Leadership', 'System Architecture', 'Process Optimization']
  },
  {
    company: 'Pengiun Solutions (Remote) ',
    role: 'Software Development Engineer',
    period: 'January 2021 - August 2023',
    description: ['Engineered and maintained responsive web and mobile applications using React and React Native, improving cross-platform user engagement (Consist of 1.3 billons of request per daily) ', 
    'Optimized NLP models for an AI-driven support chatbot, boosting model efficiency and decreasing inference latency by 6% to ensure seamless, real-time customer interactions ',],
    focus: ['Software Engineering', 'Machine learning', 'NLP'],
  },
  {
    company: 'Orange Communications',
    role: 'Internship',
    period: 'June 2020- November 2020',
    description: ['Developed responsive and reactive web interfaces using React, translating product requirements into functional code ', 
    'Collaborated closely with Product Managers to understand user needs, while partnering with Senior Engineers to implement best practices and ensure high-quality code delivery.'],
    focus: ['Software engineering', 'React Native'],

  },
];
