# Timetable Optimizer - Full Stack Project

## 📁 Project Structure

\`\`\`
timetable-optimizer/
├── app/                          # Next.js app directory
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main page
│   └── globals.css              # Global styles
│
├── components/
│   └── timetable-optimizer.tsx  # Main React component
│
├── backend/                      # Python Flask backend
│   ├── app.py                   # Flask application
│   ├── requirements.txt         # Python dependencies
│   └── .env                     # Backend environment variables
│
├── .env.local                    # Frontend environment variables
├── package.json                  # Frontend dependencies
├── tsconfig.json                # TypeScript config
└── next.config.mjs              # Next.js config
\`\`\`

## 🚀 Getting Started

### Frontend Setup (Next.js + React)

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Set up environment variables in `.env.local`:
\`\`\`
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000/api
\`\`\`

3. Run the frontend:
\`\`\`bash
npm run dev
\`\`\`

Frontend will be available at: http://localhost:3000

### Backend Setup (Python Flask)

1. Navigate to backend directory:
\`\`\`bash
cd backend
\`\`\`

2. Create a virtual environment:
\`\`\`bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
\`\`\`

3. Install dependencies:
\`\`\`bash
pip install -r requirements.txt
\`\`\`

4. Run the backend:
\`\`\`bash
python app.py
\`\`\`

Backend will be available at: http://localhost:5000

## 📊 API Endpoints

### Traditional Simulated Annealing
- **POST** `/api/traditional_sa`
- Body: `{ courses, timeslots, rooms, instructors, students, params }`
- Returns: `{ solution, cost, history }`

### Hybrid Simulated Annealing
- **POST** `/api/hybrid_sa`
- Body: `{ courses, timeslots, rooms, instructors, students, params }`
- Returns: `{ solution, cost, history }`

### Health Check
- **GET** `/api/health`
- Returns: `{ status, message }`

## 📋 CSV Format Requirements

### courses.csv
\`\`\`
id,name,instructor_id
C001,Algorithms,I001
C002,Databases,I002
\`\`\`

### instructors.csv
\`\`\`
id,name
I001,Dr. Smith
I002,Dr. Johnson
\`\`\`

### rooms.csv
\`\`\`
id,name,capacity
R001,Lab 101,30
R002,Hall A,100
\`\`\`

### students.csv
\`\`\`
id,name,course_id,specialty
S001,John Doe,C001,CS
S002,Jane Smith,C002,CS
\`\`\`

### timeslots.csv
\`\`\`
id,day,time
T001,Sunday,09:00
T002,Sunday,11:00
T003,Monday,09:00
\`\`\`

## 🔗 Frontend-Backend Communication

The React frontend calls the Python backend using the `callPythonBackend` function:

\`\`\`typescript
const callPythonBackend = async (endpoint: string, data: any) => {
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await response.json();
};
\`\`\`

## 🎯 Features

- Upload CSV data for courses, instructors, rooms, students, and timeslots
- Run Traditional Simulated Annealing optimization
- Run Hybrid Simulated Annealing optimization
- View and compare results
- Export schedules as CSV
- Visualize cost convergence charts
- Configurable optimization parameters

## 🔧 Configuration

### Frontend Environment Variables
- `NEXT_PUBLIC_BACKEND_URL`: Backend API URL (default: http://localhost:5000/api)

### Backend Environment Variables
- `FLASK_ENV`: development or production
- `FLASK_APP`: app.py

## 📝 Notes

- CORS is enabled on the backend for frontend communication
- The backend uses Flask for API routing
- The frontend uses Next.js with React for the UI
- Both applications run independently but communicate via HTTP
- Make sure both frontend (port 3000) and backend (port 5000) are running

## 🐍 Python Backend Algorithms

### Traditional SA
- Random initialization of schedule
- Pure exploration of solution space
- Takes longer to reach good solutions

### Hybrid SA
- Greedy feasible initialization
- Starts with valid solution
- Faster convergence to optimal solution
- More practical for real-world scenarios
