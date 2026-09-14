import playImage from '../assets/projects/play.webp';
import dashboardImage from '../assets/projects/sales-dashboard.webp';
import verdantImage from '../assets/projects/verdant-edge.webp';
import trafficImage from '../assets/projects/traffic-management.webp';
import neuralNetworkImage from '../assets/projects/neural-network.webp';
import neuroRiftImage from '../assets/projects/neurorift.webp';

export interface ProjectImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface ProjectLink {
  label: string;
  href: string;
}

export interface Project {
  id: string;
  title: string;
  year: string;
  category: string;
  summary: string;
  contribution: string;
  technologies: string[];
  featured: boolean;
  image?: ProjectImage;
  diagram?: 'interpreter';
  links: ProjectLink[];
  note?: string;
}

// Order here controls the order on the page. Keep three or four projects featured.
export const projects: Project[] = [
  {
    id: 'neurorift',
    title: 'NeuroRiftV3',
    year: '2025',
    category: 'Machine learning / Developer tools',
    summary:
      'From Python to GPU kernels. A specialized language model that translates numerical Python code into Triton.',
    contribution:
      'I developed the code-translation model to connect familiar Python workflows with GPU programming, as an early project after joining Anthropic.',
    technologies: ['Python', 'Transformers', 'Triton', 'C', 'C++'],
    featured: true,
    image: {
      src: neuroRiftImage,
      alt: 'NeuroRiftV3 model card on Hugging Face, describing Python-to-Triton code translation.',
      width: 1274,
      height: 545,
    },
    links: [
      {
        label: 'View model',
        href: 'https://huggingface.co/NeuroRiftV3/python-to-triton-llm-trained-model',
      },
    ],
  },
  {
    id: 'sales-dashboard',
    title: 'Sales Dashboard',
    year: '2021',
    category: 'Frontend / Data visualization',
    summary:
      'A clearer view of sales performance. A responsive dashboard for revenue, customer activity, and traffic trends.',
    contribution:
      'I designed and built the interface and visualizations to make business metrics easier to explore.',
    technologies: ['TypeScript', 'JavaScript', 'Bootstrap 5', 'CSS'],
    featured: true,
    image: {
      src: dashboardImage,
      alt: 'Dark sales dashboard showing customer metrics, weekly traffic bars, and acquisition sources.',
      width: 1083,
      height: 595,
    },
    links: [],
  },
  {
    id: 'retro-father',
    title: 'Retro-Father',
    year: '2022',
    category: 'Language design / Systems',
    summary:
      'A programming language built from first principles, exploring how source code becomes something a machine can run.',
    contribution:
      'I implemented lexical analysis, a recursive-descent parser, an abstract syntax tree, and an interpreter with lambdas, closures, and first-class pure functions.',
    technologies: ['Lexing', 'Parsing', 'AST', 'Interpreter design'],
    featured: true,
    diagram: 'interpreter',
    links: [],
    note: 'Planned extensions include multithreading, stronger types, tail-call optimization, and a bytecode virtual machine.',
  },
  {
    id: 'verdant-edge',
    title: 'Verdant Edge',
    year: '2023',
    category: 'Industrial design',
    summary:
      'A gardening tool designed to help large-scale gardeners manage excessive plant growth.',
    contribution:
      'I developed the tool for a client using 3D printing and industrial design, with attention to ergonomics and durability.',
    technologies: ['3D printing', 'Industrial design', 'Adobe design', 'Branding'],
    featured: false,
    image: {
      src: verdantImage,
      alt: 'Exploded industrial design of the Black Skimmer gardening tool from the Verdant Edge project.',
      width: 1181,
      height: 669,
    },
    links: [],
  },
  {
    id: 'sparks-of-genius',
    title: 'Sparks of Genius',
    year: '2023',
    category: 'Game development',
    summary:
      'A game project combining interactive environments with gameplay and supporting server systems.',
    contribution:
      'I worked with Unreal Engine for environments and interactions, C# for player data and AI behavior, and Java for server and multiplayer systems.',
    technologies: ['Unreal Engine', 'C#', 'Java', 'Game design'],
    featured: false,
    links: [],
  },
  {
    id: 'bank-management',
    title: 'Bank Management System',
    year: '2021',
    category: 'Command-line application',
    summary:
      'A banking CLI exploring financial automation, secure access, and transaction management.',
    contribution:
      'I designed the application with a focus on performance, precision, and reducing manual financial processes.',
    technologies: ['C++', 'C', 'Java', 'SQL', 'Redis'],
    featured: false,
    links: [],
  },
  {
    id: 'traffic-management',
    title: 'Traffic Management Solution',
    year: '2021',
    category: 'Cloud / WordPress',
    summary: 'An AWS-based traffic monitoring and management system for WordPress integrations.',
    contribution:
      'I built microservices for data ingestion, analytics, and APIs using EC2, Lambda, S3, and DynamoDB.',
    technologies: ['AWS', 'C#', 'Go', 'Python'],
    featured: false,
    image: {
      src: trafficImage,
      alt: 'Architecture diagram for the AWS traffic management project.',
      width: 1006,
      height: 569,
    },
    links: [],
  },
  {
    id: 'neural-network',
    title: 'Neural Network from Scratch',
    year: '2021',
    category: 'Machine learning',
    summary: 'An image recognition experiment that classifies objects using a neural network.',
    contribution:
      'I built the network in Python, using multiple layers to extract image features such as edges, textures, and shapes.',
    technologies: ['Python', 'Neural networks', 'Image recognition'],
    featured: false,
    image: {
      src: neuralNetworkImage,
      alt: 'Original training image beside the neural network’s final output.',
      width: 800,
      height: 400,
    },
    links: [],
  },
  {
    id: 'play',
    title: 'PLAY',
    year: '2019',
    category: 'Developer tools',
    summary: 'An early experiment connecting neural networks with APIs inside code editors.',
    contribution:
      'I developed a Bootstrap-based prototype to explore editor integrations and automated developer workflows.',
    technologies: ['React', 'JavaScript', 'SQL', 'Bootstrap'],
    featured: false,
    image: {
      src: playImage,
      alt: 'PLAY prototype showing its navigation and three pricing plans.',
      width: 1353,
      height: 622,
    },
    links: [],
    note: 'Retired in 2020 because of backend infrastructure costs during the COVID-19 period.',
  },
];
