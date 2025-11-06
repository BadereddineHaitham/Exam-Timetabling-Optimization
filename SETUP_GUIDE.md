# Complete Setup Guide

## Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- Git

## Step 1: Clone/Create Project

\`\`\`bash
git clone <repo-url>
cd timetable-optimizer
\`\`\`

## Step 2: Frontend Setup

\`\`\`bash
# Install dependencies
npm install

# Create .env.local
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:5000/api" > .env.local

# Start development server
npm run dev
\`\`\`

Frontend runs on: http://localhost:3000

## Step 3: Backend Setup

\`\`\`bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Run Flask server
python app.py
\`\`\`

Backend runs on: http://localhost:5000

## Step 4: Prepare Data

Create CSV files with your data:
- `courses.csv`
- `instructors.csv`
- `rooms.csv`
- `students.csv`
- `timeslots.csv`

See `PROJECT_STRUCTURE.md` for CSV format specifications.

## Step 5: Run Application

1. Open http://localhost:3000 in your browser
2. Upload your CSV files
3. Configure optimization parameters (optional)
4. Click "Run Python Backend Optimization"
5. View results and comparisons
6. Export schedules as needed

## Troubleshooting

### Backend not responding
- Ensure backend is running on port 5000
- Check that CORS is enabled (should be automatic with Flask-CORS)
- Verify `NEXT_PUBLIC_BACKEND_URL` in .env.local

### CSV upload issues
- Verify CSV headers match format requirements
- Ensure no special characters in IDs
- Check file encoding is UTF-8

### Virtual environment issues
- Delete venv folder and recreate
- Use `python3` instead of `python` if needed
- Check pip is updated: `pip install --upgrade pip`

## Production Deployment

### Frontend (Next.js)
\`\`\`bash
npm run build
npm start
\`\`\`

### Backend (Flask)
\`\`\`bash
export FLASK_ENV=production
python app.py
\`\`\`

## Performance Tips

- Reduce `maxIterations` for faster testing
- Increase `initialTemp` for better exploration
- Adjust `coolingRate` between 0.95-0.99 for balance
