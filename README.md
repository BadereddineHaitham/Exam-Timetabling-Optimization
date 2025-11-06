# 🎓 University Exam Timetabling Optimization

An intelligent exam scheduling system that uses **Simulated Annealing (SA)** algorithms to generate optimized university exam timetables while satisfying both hard and soft constraints.

##  Overview

This project tackles the complex problem of university exam scheduling by implementing two variants of the Simulated Annealing algorithm:
- **Traditional SA**: Random initialization with broad solution space exploration
- **Hybrid SA**: Greedy feasible initialization for faster convergence to optimal solutions

##  Key Features

###  Optimization Algorithms
- **Traditional Simulated Annealing**
  - Random initialization approach
  - Explores broad solution space
  - Effective for complex constraint scenarios
  
- **Hybrid Simulated Annealing**
  - Greedy feasible initialization
  - Faster convergence to optimal solutions
  - Better starting point for refinement

###  Constraint Management

#### Hard Constraints (High Priority)
- ✅ No room or instructor conflicts at the same timeslot
- ✅ No Friday or late afternoon (4-5 PM) scheduling
- ✅ Room capacity limits strictly enforced

#### Soft Constraints (Optimized)
- ✅ Maximum 2 exams per student per day
- ✅ Minimize gaps between student exams
- ✅ Balanced student workload distribution

###  Visualization Options
- **Student Schedule View**: Individual exam schedules for each student
- **Specialty Timetable View**: Group timetables organized by academic specialty
- **Convergence Comparison**: Interactive graphs showing cost reduction across iterations
- **Side-by-side Algorithm Comparison**: Visual comparison of Traditional vs Hybrid SA performance

###  Data Management
-  CSV upload support for (self creation):
  - Courses
  - Timeslots
  - Classooms
  - Instructors
  - Students
-  Export functionality for individual and group schedules
-  Real-time progress tracking during optimization process

###  User Interface
- **Three-tab Interface**:
  -  **Upload Tab**: Data input and configuration
  -  **Results Tab**: Optimized timetables and schedules
  -  **Comparison Tab**: Algorithm performance analysis
- **Adjustable Parameters**:
  - Number of iterations
  - Initial temperature
  - Cooling rate
- **Color-coded Specialty Tables**: Easy visual distinction between academic programs
- **Comprehensive Metrics**: Detailed comparison statistics and performance indicators
### check the full guide file in the repo

# 👥 Authors

- BADEREDDINE Haitham - [Your GitHub Profile](https://github.com/Badereddinehaitham)

## 🙏 Acknowledgments

- Inspired by real-world university scheduling challenges
- Built to optimize academic resource allocation

---

⭐ **Star this repository if you find it helpful!**
