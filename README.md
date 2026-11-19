# ResumeRAG - AI-Powered Hiring Platform

An intelligent resume management and candidate matching system powered by AI and RAG technology. Upload resumes, search candidates using natural language, and match them to jobs automatically.

## Live Demo

- **Frontend:** https://resume-rag-hackathon.vercel.app
- **Backend:** https://resumerag-hackathon.onrender.com

## Features

- **Resume Upload**: Upload PDF resumes with automatic text extraction
- **AI-Powered Search**: Ask questions about candidates in natural language
- **Job Matching**: Automatically match candidates to job requirements
- **Semantic Search**: Find candidates by skills, experience, and more
- **Bulk Upload**: Upload multiple resumes at once via ZIP files
- **Role-Based Access**: Different permissions for recruiters and candidates

## Tech Stack

**Frontend:** React, TypeScript, TailwindCSS, Axios, React Router

**Backend:** Node.js, Express.js, MongoDB, Mongoose, JWT Authentication

**AI/ML:** OpenAI GPT-4, Text Embeddings, RAG, Vector Search

**Deployment:** Vercel (Frontend), Render (Backend), MongoDB Atlas

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- OpenAI API key

### Installation

1. Clone the repository
```bash
git clone https://github.com/madhire34/ResumeRag-hackathon.git
cd ResumeRAG-Hackathon
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Install frontend dependencies
```bash
cd ../frontend
npm install
```

4. Set up environment variables

Create `backend/.env`:
```env
NODE_ENV=development
PORT=8000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
FRONTEND_URL=http://localhost:3000
```

Create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:8000/api
```

5. Seed the database with test data
```bash
cd backend
npm run seed
```

6. Start the application

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm start
```

Visit http://localhost:3000

## Test Credentials

The backend seeds these accounts on boot. In demo mode it also seeds six sample candidates and three open jobs, so the dashboard has something to show on first login (set `SEED_DEMO_CONTENT=false` to skip that).

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@resumerag.com | admin123 |
| Recruiter | recruiter@resumerag.com | test123 |
| Candidate | candidate@resumerag.com | test123 |

The login page has a one-click "Enter the demo as a recruiter" button, and the demo data is regenerated automatically if the database is empty.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Resumes
- `POST /api/resumes` - Upload resume
- `GET /api/resumes` - List all resumes
- `GET /api/resumes/:id` - Get resume details
- `DELETE /api/resumes/:id` - Delete resume

### Jobs
- `POST /api/jobs` - Create job posting
- `GET /api/jobs` - List all jobs
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs/:id/match` - Match candidates to job

### RAG Queries
- `POST /api/ask` - Ask questions about candidates
- `POST /api/ask/semantic` - Semantic search

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy

**Backend (Render):**
1. Connect GitHub repository
2. Set root directory to `backend`
3. Add environment variables
4. Deploy

**Frontend (Vercel):**
1. Connect GitHub repository
2. Set root directory to `frontend`
3. Add `REACT_APP_API_URL` environment variable
4. Deploy

## Project Structure

```
ResumeRAG-Hackathon/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── models/         # Database models
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, validation
│   │   ├── routes/         # API routes
│   │   └── utils/          # Helper functions
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # API client
│   │   └── types/          # TypeScript types
│   ├── package.json
│   └── .env
└── README.md
```

## Key Features Explained

### RAG (Retrieval-Augmented Generation)
Ask natural language questions like "Find candidates with React and Node.js experience" and get AI-generated answers with evidence from actual resumes.

### Vector Search
Resumes are converted to embeddings using OpenAI's text-embedding model, enabling semantic similarity search beyond keyword matching.

### Job Matching
Automatically scores candidates against job requirements using:
- Semantic similarity (40%)
- Skills match (40%)
- Experience level match (20%)

## Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting (60 requests/minute)
- Idempotency keys for POST requests
- PII protection for candidates
- CORS configuration

## Contributing

This is a hackathon project. Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

## Author

**Mahan**

## Acknowledgments

Built for hackathon submission using modern web technologies and AI.
