import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Resume from '../models/Resume.js';
import openaiService from '../services/openaiService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const seedUsers = [
  {
    name: 'Admin User',
    email: 'admin@mail.com',
    password: 'admin123',
    role: 'admin',
    isActive: true,
    emailVerified: true
  },
  {
    name: 'System Admin',
    email: 'admin@resumerag.com',
    password: 'admin123',
    role: 'admin',
    isActive: true,
    emailVerified: true
  },
  {
    name: 'Sarah Mitchell',
    email: 'recruiter@resumerag.com',
    password: 'test123',
    role: 'recruiter',
    company: 'TechCorp Inc.',
    phone: '+1-555-0123',
    isActive: true,
    emailVerified: true
  },
  {
    name: 'John Candidate',
    email: 'candidate@resumerag.com',
    password: 'test123',
    role: 'candidate',
    isActive: true,
    emailVerified: true
  },
  {
    name: 'Maria Rodriguez',
    email: 'recruiter2@resumerag.com',
    password: 'test123',
    role: 'recruiter',
    company: 'StartupHub',
    phone: '+1-555-0456',
    isActive: true,
    emailVerified: true
  },
  {
    name: 'Alex Chen',
    email: 'candidate2@resumerag.com',
    password: 'test123',
    role: 'candidate',
    isActive: true,
    emailVerified: true
  }
];

const seedJobs = [
  {
    title: 'Senior Full Stack Developer',
    company: 'TechCorp Inc.',
    department: 'Engineering',
    location: 'San Francisco, CA',
    remoteType: 'hybrid',
    employmentType: 'full-time',
    experienceLevel: 'senior',
    description: 'We are looking for a senior full stack developer to join our engineering team. You will be responsible for developing and maintaining web applications using React, Node.js, and Python. Experience with cloud platforms like AWS is required.',
    responsibilities: [
      'Develop and maintain web applications',
      'Collaborate with cross-functional teams',
      'Write clean, maintainable code',
      'Participate in code reviews',
      'Mentor junior developers'
    ],
    requirements: [
      '5+ years of software development experience',
      'Strong proficiency in JavaScript, React, and Node.js',
      'Experience with Python and Django/Flask',
      'Knowledge of AWS cloud services',
      'Experience with SQL and NoSQL databases',
      'Strong problem-solving skills'
    ],
    preferredQualifications: [
      'Bachelor\'s degree in Computer Science',
      'Experience with microservices architecture',
      'Knowledge of DevOps practices',
      'Open source contributions'
    ],
    skills: [
      { name: 'JavaScript', level: 'advanced', required: true },
      { name: 'React', level: 'advanced', required: true },
      { name: 'Node.js', level: 'intermediate', required: true },
      { name: 'Python', level: 'intermediate', required: true },
      { name: 'AWS', level: 'intermediate', required: false },
      { name: 'MongoDB', level: 'intermediate', required: false }
    ],
    salaryRange: {
      min: 120000,
      max: 160000,
      currency: 'USD',
      period: 'yearly'
    },
    benefits: ['Health insurance', '401k matching', 'Flexible PTO', 'Remote work'],
    contactEmail: 'sarah@techcorp.com',
    status: 'active'
  },
  {
    title: 'Data Scientist',
    company: 'StartupHub',
    department: 'Analytics',
    location: 'New York, NY',
    remoteType: 'remote',
    employmentType: 'full-time',
    experienceLevel: 'mid',
    description: 'Join our data science team to build machine learning models and derive insights from large datasets. You will work with Python, TensorFlow, and cloud platforms to solve complex business problems.',
    responsibilities: [
      'Build and deploy machine learning models',
      'Analyze large datasets to extract insights',
      'Collaborate with business stakeholders',
      'Present findings to leadership team'
    ],
    requirements: [
      '3+ years of data science experience',
      'Strong proficiency in Python and SQL',
      'Experience with machine learning frameworks',
      'Knowledge of statistics and mathematics',
      'Experience with data visualization tools'
    ],
    skills: [
      { name: 'Python', level: 'advanced', required: true },
      { name: 'Machine Learning', level: 'intermediate', required: true },
      { name: 'TensorFlow', level: 'intermediate', required: false },
      { name: 'SQL', level: 'advanced', required: true },
      { name: 'Statistics', level: 'advanced', required: true },
      { name: 'Pandas', level: 'advanced', required: true }
    ],
    salaryRange: {
      min: 90000,
      max: 130000,
      currency: 'USD',
      period: 'yearly'
    },
    benefits: ['Health insurance', 'Stock options', 'Learning budget'],
    contactEmail: 'maria@startuphub.com',
    status: 'active'
  },
  {
    title: 'Frontend Developer',
    company: 'TechCorp Inc.',
    department: 'Engineering',
    location: 'Austin, TX',
    remoteType: 'on-site',
    employmentType: 'full-time',
    experienceLevel: 'mid',
    description: 'We are seeking a talented frontend developer to create beautiful and intuitive user interfaces. You will work closely with designers and backend developers to deliver exceptional user experiences.',
    responsibilities: [
      'Develop responsive web applications',
      'Implement UI/UX designs',
      'Optimize applications for performance',
      'Collaborate with design team'
    ],
    requirements: [
      '3+ years of frontend development experience',
      'Strong proficiency in React and TypeScript',
      'Experience with modern CSS frameworks',
      'Knowledge of responsive design principles',
      'Experience with version control systems'
    ],
    skills: [
      { name: 'React', level: 'advanced', required: true },
      { name: 'TypeScript', level: 'intermediate', required: true },
      { name: 'CSS', level: 'advanced', required: true },
      { name: 'JavaScript', level: 'advanced', required: true },
      { name: 'HTML', level: 'expert', required: true },
      { name: 'Tailwind CSS', level: 'intermediate', required: false }
    ],
    salaryRange: {
      min: 80000,
      max: 110000,
      currency: 'USD',
      period: 'yearly'
    },
    benefits: ['Health insurance', '401k matching', 'Flexible hours'],
    contactEmail: 'sarah@techcorp.com',
    status: 'active'
  }
];

const seedResumes = [
  {
    filename: 'john_doe_resume.pdf',
    originalName: 'John Doe - Senior Developer Resume.pdf',
    fileSize: 245760,
    mimeType: 'application/pdf',
    text: `JOHN DOE
Senior Full Stack Developer

Email: john.doe@email.com
Phone: (555) 123-4567
LinkedIn: linkedin.com/in/johndoe
GitHub: github.com/johndoe
Location: San Francisco, CA

PROFESSIONAL SUMMARY
Experienced full stack developer with 7+ years of experience building scalable web applications using React, Node.js, Python, and AWS. Proven track record of leading development teams and delivering high-quality software solutions.

TECHNICAL SKILLS
• Languages: JavaScript, TypeScript, Python, Java, SQL
• Frontend: React, Vue.js, Angular, HTML5, CSS3, Sass
• Backend: Node.js, Express, Django, Flask, Spring Boot
• Databases: PostgreSQL, MongoDB, MySQL, Redis
• Cloud: AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes
• Tools: Git, Jenkins, Webpack, Jest, Cypress

PROFESSIONAL EXPERIENCE

Senior Full Stack Developer | TechCorp Solutions | 2020 - Present
• Led a team of 5 developers in building a microservices-based e-commerce platform
• Implemented React frontend with TypeScript, reducing bugs by 30%
• Designed and developed REST APIs using Node.js and Express
• Migrated legacy monolith to microservices architecture using Docker and Kubernetes
• Improved application performance by 40% through code optimization and caching strategies
• Mentored junior developers and conducted code reviews

Full Stack Developer | StartupInc | 2018 - 2020
• Developed full stack web applications using React, Node.js, and MongoDB
• Built real-time chat application using WebSockets and Socket.io
• Implemented automated testing suite using Jest and Cypress
• Collaborated with UX/UI designers to implement responsive designs
• Reduced deployment time from 2 hours to 15 minutes using CI/CD pipelines

Junior Developer | WebDev Agency | 2017 - 2018
• Built responsive websites using HTML5, CSS3, and JavaScript
• Developed WordPress themes and plugins for client projects
• Assisted senior developers in debugging and testing applications
• Participated in daily standups and sprint planning meetings

EDUCATION
Bachelor of Science in Computer Science
University of California, Berkeley | 2013 - 2017
GPA: 3.7/4.0

CERTIFICATIONS
• AWS Certified Solutions Architect - Associate (2021)
• MongoDB Certified Developer (2020)
• Scrum Master Certification (2019)

PROJECTS
E-commerce Platform | Personal Project | 2022
• Built full stack e-commerce application using MERN stack
• Implemented payment integration with Stripe API
• Deployed on AWS using EC2 and RDS
• Technologies: React, Node.js, MongoDB, AWS

Task Management App | Open Source | 2021
• Developed task management application with real-time collaboration
• Used Socket.io for real-time updates and notifications
• Implemented user authentication and authorization
• Technologies: React, Express, PostgreSQL, Socket.io`,
    
    personalInfo: {
      name: 'John Doe',
      email: 'john.doe@email.com',
      phone: '(555) 123-4567',
      address: 'San Francisco, CA',
      linkedIn: 'linkedin.com/in/johndoe',
      github: 'github.com/johndoe'
    },
    
    extractedData: {
      skills: [
        { name: 'JavaScript', category: 'technical', proficiency: 'expert' },
        { name: 'TypeScript', category: 'technical', proficiency: 'advanced' },
        { name: 'Python', category: 'technical', proficiency: 'advanced' },
        { name: 'React', category: 'technical', proficiency: 'expert' },
        { name: 'Node.js', category: 'technical', proficiency: 'expert' },
        { name: 'AWS', category: 'technical', proficiency: 'advanced' },
        { name: 'MongoDB', category: 'technical', proficiency: 'intermediate' },
        { name: 'PostgreSQL', category: 'technical', proficiency: 'intermediate' },
        { name: 'Docker', category: 'technical', proficiency: 'intermediate' },
        { name: 'Kubernetes', category: 'technical', proficiency: 'intermediate' }
      ],
      experience: [
        {
          company: 'TechCorp Solutions',
          position: 'Senior Full Stack Developer',
          location: 'San Francisco, CA',
          startDate: '2020',
          endDate: 'present',
          description: 'Led development team and built microservices architecture',
          achievements: ['Led team of 5 developers', 'Reduced bugs by 30%', 'Improved performance by 40%'],
          technologies: ['React', 'TypeScript', 'Node.js', 'Docker', 'Kubernetes']
        },
        {
          company: 'StartupInc',
          position: 'Full Stack Developer',
          location: 'San Francisco, CA',
          startDate: '2018',
          endDate: '2020',
          description: 'Developed full stack web applications',
          achievements: ['Built real-time chat application', 'Reduced deployment time by 87%'],
          technologies: ['React', 'Node.js', 'MongoDB', 'Socket.io']
        }
      ],
      education: [
        {
          institution: 'University of California, Berkeley',
          degree: 'Bachelor of Science',
          field: 'Computer Science',
          gpa: '3.7',
          startDate: '2013',
          endDate: '2017',
          achievements: []
        }
      ],
      certifications: [
        {
          name: 'AWS Certified Solutions Architect - Associate',
          issuer: 'Amazon Web Services',
          issueDate: '2021',
          expiryDate: null,
          credentialId: null
        },
        {
          name: 'MongoDB Certified Developer',
          issuer: 'MongoDB',
          issueDate: '2020',
          expiryDate: null,
          credentialId: null
        }
      ],
      projects: [
        {
          name: 'E-commerce Platform',
          description: 'Full stack e-commerce application using MERN stack',
          technologies: ['React', 'Node.js', 'MongoDB', 'AWS'],
          url: null,
          startDate: '2022',
          endDate: null
        },
        {
          name: 'Task Management App',
          description: 'Task management application with real-time collaboration',
          technologies: ['React', 'Express', 'PostgreSQL', 'Socket.io'],
          url: null,
          startDate: '2021',
          endDate: null
        }
      ],
      languages: [
        { name: 'English', proficiency: 'native' },
        { name: 'Spanish', proficiency: 'intermediate' }
      ]
    },
    
    yearsOfExperience: 7,
    currentPosition: 'Senior Full Stack Developer',
    currentCompany: 'TechCorp Solutions',
    location: 'San Francisco, CA',
    status: 'completed'
  },
  
  {
    filename: 'jane_smith_resume.pdf',
    originalName: 'Jane Smith - Data Scientist Resume.pdf',
    fileSize: 298435,
    mimeType: 'application/pdf',
    text: `JANE SMITH
Data Scientist & Machine Learning Engineer

Email: jane.smith@email.com
Phone: (555) 987-6543
LinkedIn: linkedin.com/in/janesmith
GitHub: github.com/janesmith
Location: New York, NY

PROFESSIONAL SUMMARY
Passionate data scientist with 5+ years of experience in machine learning, statistical analysis, and data visualization. Expertise in Python, TensorFlow, and cloud platforms. Proven ability to translate business requirements into data-driven solutions.

TECHNICAL SKILLS
• Languages: Python, R, SQL, Scala
• Machine Learning: TensorFlow, PyTorch, Scikit-learn, Keras
• Data Processing: Pandas, NumPy, Apache Spark
• Visualization: Matplotlib, Seaborn, Plotly, Tableau
• Databases: PostgreSQL, MongoDB, Elasticsearch
• Cloud: AWS (SageMaker, EC2, S3), Google Cloud Platform
• Tools: Jupyter, Git, Docker, Apache Airflow

PROFESSIONAL EXPERIENCE

Senior Data Scientist | DataCorp Analytics | 2021 - Present
• Built machine learning models for customer churn prediction, improving retention by 25%
• Developed recommendation system using collaborative filtering and deep learning
• Led data science team of 4 members in building predictive analytics platform
• Implemented MLOps pipeline using AWS SageMaker and Apache Airflow
• Created interactive dashboards in Tableau for business stakeholders
• Published research paper on anomaly detection in time series data

Data Scientist | FinTech Solutions | 2019 - 2021
• Developed fraud detection models using ensemble methods and neural networks
• Built credit scoring models improving loan approval accuracy by 20%
• Performed statistical analysis on financial data to identify market trends
• Collaborated with engineering team to deploy models in production
• Reduced model inference time by 50% through optimization techniques

Junior Data Analyst | Marketing Analytics Inc | 2018 - 2019
• Analyzed customer behavior data to identify segmentation opportunities
• Created automated reporting systems using Python and SQL
• Built A/B testing framework for marketing campaigns
• Assisted senior analysts in developing predictive models

EDUCATION
Master of Science in Data Science
Columbia University | 2016 - 2018
Thesis: "Deep Learning Approaches for Natural Language Processing"
GPA: 3.9/4.0

Bachelor of Science in Statistics
New York University | 2012 - 2016
Magna Cum Laude, GPA: 3.8/4.0

CERTIFICATIONS
• Google Cloud Professional Data Engineer (2022)
• TensorFlow Developer Certificate (2021)
• AWS Certified Machine Learning - Specialty (2020)

PROJECTS
Stock Price Prediction | Research Project | 2022
• Developed LSTM neural network for stock price prediction
• Achieved 85% accuracy in predicting price movements
• Used technical indicators and sentiment analysis from news data
• Technologies: Python, TensorFlow, BeautifulSoup, Pandas

Customer Segmentation Analysis | Consulting Project | 2021
• Applied K-means clustering and hierarchical clustering
• Identified 5 distinct customer segments for retail client
• Increased marketing campaign effectiveness by 30%
• Technologies: Python, Scikit-learn, Matplotlib, Seaborn

PUBLICATIONS
• "Anomaly Detection in Time Series Using Autoencoders" - Journal of Data Science (2022)
• "Ensemble Methods for Fraud Detection in Financial Services" - IEEE Conference (2021)`,
    
    personalInfo: {
      name: 'Jane Smith',
      email: 'jane.smith@email.com',
      phone: '(555) 987-6543',
      address: 'New York, NY',
      linkedIn: 'linkedin.com/in/janesmith',
      github: 'github.com/janesmith'
    },
    
    extractedData: {
      skills: [
        { name: 'Python', category: 'technical', proficiency: 'expert' },
        { name: 'Machine Learning', category: 'technical', proficiency: 'expert' },
        { name: 'TensorFlow', category: 'technical', proficiency: 'advanced' },
        { name: 'SQL', category: 'technical', proficiency: 'advanced' },
        { name: 'Statistics', category: 'technical', proficiency: 'expert' },
        { name: 'Pandas', category: 'technical', proficiency: 'expert' },
        { name: 'AWS', category: 'technical', proficiency: 'advanced' },
        { name: 'Tableau', category: 'technical', proficiency: 'intermediate' },
        { name: 'R', category: 'technical', proficiency: 'intermediate' }
      ],
      experience: [
        {
          company: 'DataCorp Analytics',
          position: 'Senior Data Scientist',
          location: 'New York, NY',
          startDate: '2021',
          endDate: 'present',
          description: 'Led data science team and built ML models',
          achievements: ['Improved retention by 25%', 'Led team of 4 members', 'Published research paper'],
          technologies: ['TensorFlow', 'AWS SageMaker', 'Tableau', 'Apache Airflow']
        },
        {
          company: 'FinTech Solutions',
          position: 'Data Scientist',
          location: 'New York, NY',
          startDate: '2019',
          endDate: '2021',
          description: 'Developed fraud detection and credit scoring models',
          achievements: ['Improved loan approval accuracy by 20%', 'Reduced inference time by 50%'],
          technologies: ['Python', 'Neural Networks', 'Ensemble Methods']
        }
      ],
      education: [
        {
          institution: 'Columbia University',
          degree: 'Master of Science',
          field: 'Data Science',
          gpa: '3.9',
          startDate: '2016',
          endDate: '2018',
          achievements: ['Thesis on Deep Learning for NLP']
        },
        {
          institution: 'New York University',
          degree: 'Bachelor of Science',
          field: 'Statistics',
          gpa: '3.8',
          startDate: '2012',
          endDate: '2016',
          achievements: ['Magna Cum Laude']
        }
      ],
      certifications: [
        {
          name: 'Google Cloud Professional Data Engineer',
          issuer: 'Google Cloud',
          issueDate: '2022',
          expiryDate: null,
          credentialId: null
        },
        {
          name: 'TensorFlow Developer Certificate',
          issuer: 'TensorFlow',
          issueDate: '2021',
          expiryDate: null,
          credentialId: null
        }
      ],
      projects: [
        {
          name: 'Stock Price Prediction',
          description: 'LSTM neural network for stock price prediction with 85% accuracy',
          technologies: ['Python', 'TensorFlow', 'BeautifulSoup', 'Pandas'],
          url: null,
          startDate: '2022',
          endDate: null
        },
        {
          name: 'Customer Segmentation Analysis',
          description: 'Applied clustering to identify customer segments',
          technologies: ['Python', 'Scikit-learn', 'Matplotlib', 'Seaborn'],
          url: null,
          startDate: '2021',
          endDate: null
        }
      ],
      languages: [
        { name: 'English', proficiency: 'native' },
        { name: 'French', proficiency: 'intermediate' }
      ]
    },
    
    yearsOfExperience: 5,
    currentPosition: 'Senior Data Scientist',
    currentCompany: 'DataCorp Analytics',
    location: 'New York, NY',
    status: 'completed'
  }
];

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB for seeding');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function clearData() {
  console.log('🗑️  Clearing existing data...');
  await User.deleteMany({});
  await Job.deleteMany({});
  await Resume.deleteMany({});
  console.log('✅ Existing data cleared');
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    await clearData();

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = {};
    
    for (const userData of seedUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = await User.create({
        ...userData,
        password: hashedPassword
      });
      createdUsers[userData.role + (userData.company || '')] = user;
      console.log(`✅ Created user: ${user.name} (${user.role})`);
    }

    // Create jobs with embeddings
    console.log('💼 Creating jobs...');
    const recruiterUser = createdUsers['recruiterTechCorp Inc.'];
    const recruiter2User = createdUsers['recruiterStartupHub'];
    
    for (let i = 0; i < seedJobs.length; i++) {
      const jobData = seedJobs[i];
      
      // Assign to appropriate recruiter
      const postedBy = jobData.company === 'TechCorp Inc.' ? recruiterUser._id : recruiter2User._id;
      
      // Generate embedding
      console.log(`🔢 Generating embedding for job: ${jobData.title}`);
      const embeddingText = `${jobData.title} ${jobData.company} ${jobData.description} ${jobData.requirements.join(' ')}`;
      const embedding = await openaiService.generateEmbedding(embeddingText);
      
      const job = await Job.create({
        ...jobData,
        postedBy,
        embedding
      });
      
      console.log(`✅ Created job: ${job.title} at ${job.company}`);
    }

    // Create resumes with embeddings
    console.log('📄 Creating resumes...');
    const candidateUser = createdUsers['candidate'];
    const candidate2User = createdUsers['candidate'];
    
    for (let i = 0; i < seedResumes.length; i++) {
      const resumeData = seedResumes[i];
      
      // Assign to candidate
      const uploadedBy = i === 0 ? candidateUser._id : candidate2User._id;
      
      // Generate PII redacted text
      let redactedText = resumeData.text;
      redactedText = redactedText.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL REDACTED]');
      redactedText = redactedText.replace(/\(\d{3}\)\s?\d{3}-\d{4}/g, '[PHONE REDACTED]');
      
      // Generate embedding
      console.log(`🔢 Generating embedding for resume: ${resumeData.originalName}`);
      const embedding = await openaiService.generateEmbedding(resumeData.text);
      
      // Generate search keywords
      const keywords = new Set();
      resumeData.extractedData.skills.forEach(skill => {
        keywords.add(skill.name.toLowerCase());
      });
      resumeData.extractedData.experience.forEach(exp => {
        keywords.add(exp.position.toLowerCase());
        keywords.add(exp.company.toLowerCase());
      });
      
      const resume = await Resume.create({
        ...resumeData,
        uploadedBy,
        redactedText,
        embedding,
        textLength: resumeData.text.length,
        searchKeywords: Array.from(keywords),
        embeddingModel: 'text-embedding-ada-002'
      });
      
      console.log(`✅ Created resume: ${resume.originalName}`);
    }

    console.log(`\n🎉 Database seeding completed successfully!`);
    console.log(`\n📊 Summary:`);
    console.log(`   Users: ${seedUsers.length}`);
    console.log(`   Jobs: ${seedJobs.length}`);
    console.log(`   Resumes: ${seedResumes.length}`);
    
    console.log(`\n🔑 Test Credentials:`);
    console.log(`   Admin: admin@resumerag.com / admin123`);
    console.log(`   Recruiter: recruiter@resumerag.com / test123`);
    console.log(`   Candidate: candidate@resumerag.com / test123`);
    console.log(`   Recruiter 2: recruiter2@resumerag.com / test123`);
    console.log(`   Candidate 2: candidate2@resumerag.com / test123`);

  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run seeding if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedDatabase();
}

export default seedDatabase;