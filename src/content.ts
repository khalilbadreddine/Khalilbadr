import type { SceneId } from './scenes'

export interface Link {
  label: string
  href: string
}

export interface SectionContent {
  id: string
  /** Which dot scene forms while this section is in view. */
  scene: SceneId
  kicker: string
  title: string
  /** Second part of the title, set in the accent colour. */
  accent: string
  body?: string
  /** Extra paragraph under the body. */
  tagline?: string
  points?: string[]
  chips?: string[]
  links?: Link[]
}

const CONTACT: Link[] = [
  { label: 'Email', href: 'mailto:KhalilBadre5@gmail.com' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/khalil-badr-eddine-9b8b69182' },
  { label: 'GitHub', href: 'https://github.com/khalilbadreddine' },
]

export const SECTIONS: SectionContent[] = [
  {
    id: 'hero',
    scene: 'portrait',
    kicker: 'Full-stack developer · Rabat',
    title: 'Khalil',
    accent: 'Badr Eddine',
    body: 'React · Django · Node.js · Stripe',
    tagline: 'A full-stack developer who ships real products — from Stripe payment flows to my own nutrition platform. One commit at a time.',
    links: CONTACT,
  },
  {
    id: 'about',
    scene: 'chibi',
    kicker: 'About me',
    title: "Hi, I'm",
    accent: 'Khalil.',
    body: 'A full-stack developer with paid experience shipping Stripe payment integrations for a French company — brought back after my internship to rebuild their Django payment module, then trusted with code reviews and team coordination. I also built and launched my own nutrition platform end to end.',
    points: [
      "Bachelor's in Information Systems Engineering — Sup MTI, Rabat",
      'Specialized Technician Diploma in IT Development — ISTA NTIC',
      'Arabic (native) · French (fluent) · English (professional)',
    ],
    chips: ['React', 'Redux', 'Tailwind', 'Python', 'Django', 'Node.js', 'Express', 'PostgreSQL', 'Supabase', 'MongoDB', 'Stripe', 'Docker', 'GitHub Actions'],
  },
  {
    id: 'recipe',
    scene: 'bowl',
    kicker: 'Founder · Aug 2026 — Present',
    title: 'The Recipe',
    accent: 'Seeker',
    body: 'A nutrition-first recipe platform I built and launched with React, Node.js/Express and Supabase.',
    points: [
      'USDA FoodData Central nutrition data with nutrient badges and nutrient-based search',
      'AI-assisted publishing: keyword research and drafts with OpenRouter and NVIDIA LLMs, human review, scheduled releases via GitHub Actions',
      'Lemon Squeezy checkout for digital products',
      'Grew a Pinterest audience of 11,000 followers and 66,000 monthly views',
    ],
  },
  {
    id: 'payments',
    scene: 'card',
    kicker: 'VNB-IT · Remote, France · 2025 — 2026',
    title: 'Payments,',
    accent: 'end to end.',
    body: 'Started as an intern, built the first working Stripe integration in Python/Django, and was brought back as a freelancer to rebuild the payment module.',
    points: [
      'Stripe Connect and 3D Secure payment flows',
      'Owned the payment codebase: pull request reviews, team task coordination and code quality',
    ],
  },
  {
    id: 'projects',
    scene: 'desktop',
    kicker: 'Projects',
    title: 'Late nights,',
    accent: 'shipped.',
    points: [
      'Orange Mega Hackathon — 2nd place. Led a team of four building an ML health-prediction chatbot with React, Django, NumPy and Pandas.',
      'Elegant E-Commerce — full-stack shop with React/Redux and Node/Express: JWT auth, cart and inventory, wishlists, orders, payments and product search.',
      'CrystalIT / Amnesty — built and maintained production websites including amnesty.ma, and trained the team on web workflows.',
    ],
  },
  {
    id: 'contact',
    scene: 'envelope',
    kicker: 'Contact',
    title: "Let's build",
    accent: 'something.',
    body: 'Open to full-stack and payments work. The fastest way to reach me is email.',
    links: CONTACT,
  },
]

/** Shown on the monitor in the projects scene. */
export const SCREEN_TITLES = ['HACKATHON\n2ND PLACE', 'E-COMMERCE\nREACT · NODE', 'RECIPE SEEKER\nNUTRITION']
