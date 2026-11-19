import Resume from '../models/Resume.js';
import Job from '../models/Job.js';
import User from '../models/User.js';

// 1536-dimension pseudo-embedding so semantic-search endpoints have something
// to rank. Deterministic per seed string, so demo results are stable.
function fakeEmbedding(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out = new Array(1536);
  let x = h >>> 0 || 1;
  let norm = 0;
  for (let i = 0; i < out.length; i++) {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5; x >>>= 0;
    const v = ((x % 2000) - 1000) / 1000;
    out[i] = v;
    norm += v * v;
  }
  norm = Math.sqrt(norm) || 1;
  return out.map((v) => v / norm);
}

const candidates = [
  {
    name: 'Priya Raman',
    email: 'priya.raman@example.com',
    phone: '+91 98765 43210',
    location: 'Bengaluru, India',
    position: 'Senior Frontend Engineer',
    company: 'Zeta Labs',
    years: 6,
    skills: ['React', 'TypeScript', 'Next.js', 'GraphQL', 'Testing Library', 'Accessibility'],
    summary:
      'Senior frontend engineer with six years building design-system-driven web apps. Led the migration of a 240-screen React SPA to Next.js App Router and cut initial JS payload by 41%.',
    experience: [
      {
        company: 'Zeta Labs',
        position: 'Senior Frontend Engineer',
        location: 'Bengaluru',
        startDate: '2021-04',
        endDate: 'Present',
        description: 'Owns the design system and the customer-facing web app.',
        achievements: [
          'Cut initial JS payload 41% by moving to Next.js App Router and route-level code splitting',
          'Introduced visual regression tests that reduced UI bugs reaching production by a third'
        ],
        technologies: ['React', 'TypeScript', 'Next.js', 'Playwright']
      }
    ],
    education: [
      {
        institution: 'BITS Pilani',
        degree: 'B.E.',
        field: 'Computer Science',
        gpa: '8.6',
        startDate: '2013',
        endDate: '2017'
      }
    ]
  },
  {
    name: 'Arjun Desai',
    email: 'arjun.desai@example.com',
    phone: '+91 90000 11111',
    location: 'Pune, India',
    position: 'Backend Engineer',
    company: 'Finlytic',
    years: 4,
    skills: ['Node.js', 'Express', 'PostgreSQL', 'Redis', 'Docker', 'AWS'],
    summary:
      'Backend engineer focused on payments infrastructure. Built idempotent ledger APIs handling 1.2M daily transactions and cut p99 latency from 480ms to 190ms.',
    experience: [
      {
        company: 'Finlytic',
        position: 'Backend Engineer',
        location: 'Pune',
        startDate: '2022-01',
        endDate: 'Present',
        description: 'Payments and reconciliation services.',
        achievements: [
          'Designed an idempotent ledger API now processing 1.2M transactions a day',
          'Reduced p99 write latency from 480ms to 190ms with connection pooling and index rewrites'
        ],
        technologies: ['Node.js', 'PostgreSQL', 'Redis', 'Docker']
      }
    ],
    education: [
      {
        institution: 'COEP Pune',
        degree: 'B.Tech',
        field: 'Information Technology',
        gpa: '8.2',
        startDate: '2014',
        endDate: '2018'
      }
    ]
  },
  {
    name: 'Sneha Kulkarni',
    email: 'sneha.kulkarni@example.com',
    phone: '+91 95555 22222',
    location: 'Hyderabad, India',
    position: 'Full-Stack Developer',
    company: 'OpenLedger',
    years: 3,
    skills: ['React', 'Node.js', 'MongoDB', 'Express', 'JWT', 'Docker'],
    summary:
      'Full-stack developer who shipped a multi-tenant SaaS dashboard from schema to deployment. Comfortable owning auth, API design and the React front end.',
    experience: [
      {
        company: 'OpenLedger',
        position: 'Full-Stack Developer',
        location: 'Hyderabad',
        startDate: '2023-03',
        endDate: 'Present',
        description: 'Multi-tenant accounting dashboard.',
        achievements: [
          'Built role-based access with JWT refresh rotation and per-tenant query scoping',
          'Shipped a reporting module generating 30k PDF statements a month'
        ],
        technologies: ['React', 'Node.js', 'MongoDB', 'Docker']
      }
    ],
    education: [
      {
        institution: 'IIIT Hyderabad',
        degree: 'B.Tech',
        field: 'Computer Science',
        gpa: '8.9',
        startDate: '2016',
        endDate: '2020'
      }
    ]
  },
  {
    name: 'Rahul Verma',
    email: 'rahul.verma@example.com',
    phone: '+91 99999 33333',
    location: 'Gurugram, India',
    position: 'Data Engineer',
    company: 'MetricWave',
    years: 5,
    skills: ['Python', 'SQL', 'Airflow', 'Spark', 'dbt', 'Snowflake'],
    summary:
      'Data engineer building batch pipelines for analytics. Migrated 140 dbt models to a new warehouse with zero reporting downtime.',
    experience: [
      {
        company: 'MetricWave',
        position: 'Data Engineer',
        location: 'Gurugram',
        startDate: '2021-06',
        endDate: 'Present',
        description: 'Analytics pipeline ownership.',
        achievements: [
          'Migrated 140 dbt models to Snowflake with zero reporting downtime',
          'Cut nightly pipeline runtime 55% by repartitioning Spark jobs'
        ],
        technologies: ['Python', 'Airflow', 'Spark', 'dbt']
      }
    ],
    education: [
      {
        institution: 'IIT Delhi',
        degree: 'B.Tech',
        field: 'Engineering Physics',
        gpa: '8.1',
        startDate: '2012',
        endDate: '2016'
      }
    ]
  },
  {
    name: 'Meera Iyer',
    email: 'meera.iyer@example.com',
    phone: '+91 98888 44444',
    location: 'Chennai, India',
    position: 'QA Automation Engineer',
    company: 'Bluefin Systems',
    years: 4,
    skills: ['Playwright', 'JavaScript', 'Jest', 'CI/CD', 'API Testing'],
    summary:
      'QA automation engineer who replaced 600 manual regression cases with Playwright suites running on every pull request.',
    experience: [
      {
        company: 'Bluefin Systems',
        position: 'QA Automation Engineer',
        location: 'Chennai',
        startDate: '2022-07',
        endDate: 'Present',
        description: 'Test automation for a fintech web platform.',
        achievements: [
          'Replaced 600 manual regression cases with Playwright suites on every PR',
          'Cut flaky-test rate from 14% to under 2% with deterministic fixtures'
        ],
        technologies: ['Playwright', 'JavaScript', 'GitHub Actions']
      }
    ],
    education: [
      {
        institution: 'Anna University',
        degree: 'B.E.',
        field: 'Electronics',
        gpa: '7.9',
        startDate: '2014',
        endDate: '2018'
      }
    ]
  },
  {
    name: 'David Fernandes',
    email: 'david.fernandes@example.com',
    phone: '+91 97777 55555',
    location: 'Remote (Goa, India)',
    position: 'DevOps Engineer',
    company: 'Northwind Cloud',
    years: 7,
    skills: ['Kubernetes', 'Terraform', 'AWS', 'Docker', 'Go', 'Prometheus'],
    summary:
      'DevOps engineer running multi-region Kubernetes platforms. Cut cloud spend 28% while raising deploy frequency from weekly to daily.',
    experience: [
      {
        company: 'Northwind Cloud',
        position: 'DevOps Engineer',
        location: 'Remote',
        startDate: '2020-02',
        endDate: 'Present',
        description: 'Platform and reliability for 40+ services.',
        achievements: [
          'Cut cloud spend 28% with spot node pools and right-sized requests',
          'Moved the team from weekly releases to daily deploys behind feature flags'
        ],
        technologies: ['Kubernetes', 'Terraform', 'AWS', 'Go']
      }
    ],
    education: [
      {
        institution: 'NIT Goa',
        degree: 'B.Tech',
        field: 'Computer Science',
        gpa: '8.0',
        startDate: '2010',
        endDate: '2014'
      }
    ]
  }
];

const jobs = [
  {
    title: 'Senior Frontend Engineer',
    company: 'TechCorp Inc.',
    department: 'Product Engineering',
    location: 'Bengaluru, India',
    remoteType: 'hybrid',
    experienceLevel: 'senior',
    description:
      'Own the customer-facing web app and the design system behind it. You will work with product and design to ship interfaces that hold up under real data and slow networks.',
    requirements: [
      '5+ years building production React applications',
      'Strong TypeScript and a working knowledge of Next.js rendering models',
      'Experience with testing libraries and CI pipelines'
    ],
    skills: [
      { name: 'React', level: 'expert', required: true },
      { name: 'TypeScript', level: 'advanced', required: true },
      { name: 'Next.js', level: 'intermediate', required: false }
    ],
    salaryRange: { min: 2800000, max: 4200000, currency: 'INR', period: 'monthly' }
  },
  {
    title: 'Backend Engineer (Node.js)',
    company: 'TechCorp Inc.',
    department: 'Platform',
    location: 'Pune, India',
    remoteType: 'remote',
    experienceLevel: 'mid',
    description:
      'Design and operate the APIs behind our payments platform. The work is equal parts schema design, performance tuning and keeping data correct under retries.',
    requirements: [
      '3+ years with Node.js and a relational database',
      'Comfortable with idempotency, transactions and queues',
      'Experience operating what you build'
    ],
    skills: [
      { name: 'Node.js', level: 'advanced', required: true },
      { name: 'PostgreSQL', level: 'advanced', required: true },
      { name: 'Redis', level: 'intermediate', required: false }
    ],
    salaryRange: { min: 2000000, max: 3200000, currency: 'INR', period: 'monthly' }
  },
  {
    title: 'Full-Stack Developer',
    company: 'TechCorp Inc.',
    department: 'Growth',
    location: 'Remote',
    remoteType: 'remote',
    experienceLevel: 'entry',
    description:
      'Build and ship small full-stack features end to end: schema, API, UI and the deploy. You will own a slice of the product, not a ticket queue.',
    requirements: [
      'Comfortable with React and a server-side framework',
      'Can design a schema and write the queries against it',
      'Has deployed something that other people use'
    ],
    skills: [
      { name: 'React', level: 'intermediate', required: true },
      { name: 'Node.js', level: 'intermediate', required: true },
      { name: 'MongoDB', level: 'beginner', required: false }
    ],
    salaryRange: { min: 900000, max: 1500000, currency: 'INR', period: 'monthly' }
  }
];

export async function seedDemoContent() {
  const recruiter = await User.findOne({ email: 'recruiter@resumerag.com' });
  if (!recruiter) return;

  const existingResumes = await Resume.countDocuments();
  if (existingResumes === 0) {
    const docs = candidates.map((c) => {
      const text = `${c.name}\n${c.position} at ${c.company}\n${c.location}\n\nSummary\n${c.summary}\n\nSkills\n${c.skills.join(', ')}\n\nExperience\n${c.experience
        .map((e) => `${e.position}, ${e.company} (${e.startDate} - ${e.endDate})\n${e.description}\n${e.achievements.join('\n')}`)
        .join('\n\n')}\n\nEducation\n${c.education
        .map((e) => `${e.degree} ${e.field}, ${e.institution} (${e.startDate} - ${e.endDate})`)
        .join('\n')}`;
      return {
        filename: `${c.name.toLowerCase().replace(/\s+/g, '-')}-resume.pdf`,
        originalName: `${c.name} - Resume.pdf`,
        fileSize: 48000 + Math.floor(Math.random() * 40000),
        mimeType: 'application/pdf',
        uploadedBy: recruiter._id,
        text,
        textLength: text.length,
        personalInfo: { name: c.name, email: c.email, phone: c.phone, address: c.location },
        redactedText: text.replace(c.email, '[email]').replace(c.phone, '[phone]'),
        extractedData: {
          skills: c.skills.map((s) => ({ name: s, category: 'technical', proficiency: 'advanced' })),
          experience: c.experience,
          education: c.education,
          certifications: [],
          projects: [],
          languages: [{ name: 'English', proficiency: 'fluent' }]
        },
        embedding: fakeEmbedding(c.name),
        embeddingModel: 'demo-seed',
        status: 'completed',
        searchKeywords: [...new Set([...c.skills, c.position, c.company].map((s) => s.toLowerCase()))],
        yearsOfExperience: c.years,
        currentPosition: c.position,
        currentCompany: c.company,
        location: c.location,
        availabilityStatus: 'open_to_offers'
      };
    });
    await Resume.insertMany(docs);
    console.log(`🌱 Seeded ${docs.length} demo resumes`);
  }

  const existingJobs = await Job.countDocuments();
  if (existingJobs === 0) {
    const docs = jobs.map((j) => ({
      ...j,
      postedBy: recruiter._id,
      status: 'active',
      embedding: fakeEmbedding(j.title + j.company),
      embeddingModel: 'demo-seed',
      searchKeywords: [...new Set([...j.skills.map((s) => s.name), j.title, j.company].map((s) => s.toLowerCase()))]
    }));
    await Job.insertMany(docs);
    console.log(`🌱 Seeded ${docs.length} demo jobs`);
  }
}
