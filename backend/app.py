"""
University Exam Timetabling - Python Backend
Flask API with Traditional and Hybrid Simulated Annealing
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import random
import math
from typing import List, Dict, Any

app = Flask(__name__)
CORS(app)

# ==================== ALGORITHM IMPLEMENTATIONS ====================

def calculate_cost(schedule: List[Dict], students: List[Dict], courses: List[Dict], 
                   rooms: List[Dict], timeslots: List[Dict]) -> float:
    """Calculate the cost function for a given schedule"""
    hard_cost = 0
    soft_cost = 0
    
    room_time_map = {}
    # track instructor usage per timeslot, but allow duplicates if for the same course name
    instructor_time_map = {}
    # global uniqueness: only one module name per timeslot
    timeslot_course_names: Dict[Any, set] = {}
    student_schedules = {}
    
    # helper lookups
    course_by_id = {c['id']: c for c in courses}
    timeslot_by_id = {t['id']: t for t in timeslots}
    
    # collect entries per course name to enforce co-scheduling and same instructor
    by_course_name: Dict[str, List[Dict[str, Any]]] = {}
    
    for entry in schedule:
        key = f"{entry['timeslot']}-{entry['room']}"
        inst_key = f"{entry['timeslot']}-{entry['instructor_id']}"
        course_name = course_by_id.get(entry['course'], {}).get('name', '')
        
        if key in room_time_map:
            hard_cost += 900
        room_time_map[key] = True
        
        # Instructor conflict: allow same instructor in same timeslot only if it's the same course name
        if inst_key in instructor_time_map:
            prev_names = instructor_time_map[inst_key]
            # penalize only if any different course name shares this instructor and timeslot
            if course_name not in prev_names:
                hard_cost += 900
                prev_names.add(course_name)
        else:
            instructor_time_map[inst_key] = {course_name} if course_name else {"__unknown__"}
        
        ts = timeslot_by_id.get(entry['timeslot'])
        if ts:
            if ts['day'] == 'Friday' or '16:' in ts['time'] or '17:' in ts['time']:
                soft_cost += 200
            # global constraint: only one distinct course name per timeslot
            if course_name:
                names = timeslot_course_names.get(entry['timeslot'])
                if names is None:
                    timeslot_course_names[entry['timeslot']] = {course_name}
                else:
                    if course_name not in names:
                        hard_cost += 900
                        names.add(course_name)
        
        course_students = [s for s in students if s['course_id'] == entry['course']]
        for student in course_students:
            student_id = student['id']
            if student_id not in student_schedules:
                student_schedules[student_id] = []
            student_schedules[student_id].append({
                'timeslot': entry['timeslot'],
                'day': ts['day'] if ts else '',
                'time': ts['time'] if ts else ''
            })
        
        # group this assignment under its course name for later cross-checks
        if course_name:
            by_course_name.setdefault(course_name, []).append({
                'timeslot': entry['timeslot'],
                'instructor_id': entry['instructor_id']
            })
        
        room = next((r for r in rooms if r['id'] == entry['room']), None)
        if room:
            num_students = len(course_students)
            if num_students > int(room['capacity']):
                hard_cost += 800
    
    # Enforce co-scheduling and same instructor across courses sharing the same name
    for cname, assigns in by_course_name.items():
        if len(assigns) > 1:
            # same timeslot (same day+time) for all instances
            ts_ids = {a['timeslot'] for a in assigns}
            if len(ts_ids) > 1:
                # strong penalty to force co-scheduling (reduced)
                hard_cost += 900 * (len(ts_ids) - 1)
            # same instructor for all instances
            inst_ids = {a['instructor_id'] for a in assigns}
            if len(inst_ids) > 1:
                hard_cost += 900 * (len(inst_ids) - 1)

    for student_sched in student_schedules.values():
        day_count = {}
        for s in student_sched:
            day = s['day']
            day_count[day] = day_count.get(day, 0) + 1
            if day_count[day] > 2:
                soft_cost += 300
        
        if len(student_sched) > 1:
            sorted_sched = sorted(student_sched, key=lambda x: (x['day'], x['time']))
            for i in range(1, len(sorted_sched)):
                if sorted_sched[i]['day'] == sorted_sched[i-1]['day']:
                    try:
                        time_curr = int(sorted_sched[i]['time'].split(':')[0])
                        time_prev = int(sorted_sched[i-1]['time'].split(':')[0])
                        gap = abs(time_curr - time_prev)
                        if 0 < gap < 1:
                            soft_cost += 50
                    except:
                        pass
    
    return hard_cost + soft_cost


def generate_feasible_solution(courses: List[Dict], timeslots: List[Dict], 
                                rooms: List[Dict]) -> List[Dict]:
    """Generate a feasible initial solution using greedy approach"""
    solution = []
    used_slots = set()
    
    valid_timeslots = [ts for ts in timeslots 
                       if ts['day'] != 'Friday' and '16:' not in ts['time'] and '17:' not in ts['time']]
    
    for course in courses:
        assigned = False
        
        for ts in valid_timeslots:
            for room in rooms:
                key = f"{ts['id']}-{room['id']}-{course['instructor_id']}"
                
                if key not in used_slots:
                    solution.append({
                        'course': course['id'],
                        'timeslot': ts['id'],
                        'room': room['id'],
                        'instructor_id': course['instructor_id']
                    })
                    used_slots.add(key)
                    assigned = True
                    break
            if assigned:
                break
        
        if not assigned and valid_timeslots:
            solution.append({
                'course': course['id'],
                'timeslot': valid_timeslots[0]['id'],
                'room': rooms[0]['id'],
                'instructor_id': course['instructor_id']
            })
    
    return solution


def traditional_simulated_annealing(courses: List[Dict], timeslots: List[Dict], 
                                     rooms: List[Dict], instructors: List[Dict],
                                     students: List[Dict], params: Dict) -> Dict:
    """Traditional Simulated Annealing with random initialization"""
    max_iterations = params['maxIterations']
    initial_temp = params['initialTemp']
    cooling_rate = params['coolingRate']
    course_by_id = {c['id']: c for c in courses}
    
    current_solution = [
        {
            'course': course['id'],
            'timeslot': random.choice(timeslots)['id'],
            'room': random.choice(rooms)['id'],
            'instructor_id': course['instructor_id']
        }
        for course in courses
    ]
    
    current_cost = calculate_cost(current_solution, students, courses, rooms, timeslots)
    best_solution = [entry.copy() for entry in current_solution]
    best_cost = current_cost
    temperature = initial_temp
    
    history = [{'iteration': 0, 'cost': current_cost, 'temp': temperature, 'best': best_cost}]
    
    for i in range(max_iterations):
        neighbor = [entry.copy() for entry in current_solution]
        idx1 = random.randint(0, len(neighbor) - 1)
        idx2 = random.randint(0, len(neighbor) - 1)
        
        if random.random() > 0.5:
            ts1 = neighbor[idx1]['timeslot']
            ts2 = neighbor[idx2]['timeslot']
            neighbor[idx1]['timeslot'], neighbor[idx2]['timeslot'] = ts2, ts1
            name1 = course_by_id.get(neighbor[idx1]['course'], {}).get('name', '')
            name2 = course_by_id.get(neighbor[idx2]['course'], {}).get('name', '')
            if name1:
                for k in range(len(neighbor)):
                    if course_by_id.get(neighbor[k]['course'], {}).get('name', '') == name1:
                        neighbor[k]['timeslot'] = ts2
            if name2:
                for k in range(len(neighbor)):
                    if course_by_id.get(neighbor[k]['course'], {}).get('name', '') == name2:
                        neighbor[k]['timeslot'] = ts1
        else:
            new_ts = random.choice(timeslots)['id']
            neighbor[idx1]['timeslot'] = new_ts
            neighbor[idx1]['room'] = random.choice(rooms)['id']
            name1 = course_by_id.get(neighbor[idx1]['course'], {}).get('name', '')
            if name1:
                for k in range(len(neighbor)):
                    if course_by_id.get(neighbor[k]['course'], {}).get('name', '') == name1:
                        neighbor[k]['timeslot'] = new_ts
        
        neighbor_cost = calculate_cost(neighbor, students, courses, rooms, timeslots)
        delta = neighbor_cost - current_cost
        
        if delta < 0 or random.random() < math.exp(-delta / temperature):
            current_solution = neighbor
            current_cost = neighbor_cost
            
            if current_cost < best_cost:
                best_solution = [entry.copy() for entry in current_solution]
                best_cost = current_cost
        
        temperature *= cooling_rate
        
        if i % 10 == 0:
            history.append({
                'iteration': i,
                'cost': current_cost,
                'temp': temperature,
                'best': best_cost
            })
    
    return {
        'solution': best_solution,
        'cost': best_cost,
        'history': history
    }


def hybrid_simulated_annealing(courses: List[Dict], timeslots: List[Dict], 
                                rooms: List[Dict], instructors: List[Dict],
                                students: List[Dict], params: Dict) -> Dict:
    """Hybrid Simulated Annealing with feasible initialization"""
    max_iterations = params['maxIterations']
    initial_temp = params['initialTemp']
    cooling_rate = params['coolingRate']
    course_by_id = {c['id']: c for c in courses}
    
    current_solution = generate_feasible_solution(courses, timeslots, rooms)
    current_cost = calculate_cost(current_solution, students, courses, rooms, timeslots)
    best_solution = [entry.copy() for entry in current_solution]
    best_cost = current_cost
    temperature = initial_temp
    
    history = [{'iteration': 0, 'cost': current_cost, 'temp': temperature, 'best': best_cost}]
    
    valid_timeslots = [ts for ts in timeslots 
                       if ts['day'] != 'Friday' and '16:' not in ts['time'] and '17:' not in ts['time']]
    
    for i in range(max_iterations):
        neighbor = [entry.copy() for entry in current_solution]
        idx = random.randint(0, len(neighbor) - 1)
        
        if random.random() > 0.3:
            idx2 = random.randint(0, len(neighbor) - 1)
            ts1 = neighbor[idx]['timeslot']
            ts2 = neighbor[idx2]['timeslot']
            neighbor[idx]['timeslot'], neighbor[idx2]['timeslot'] = ts2, ts1
            neighbor[idx]['room'], neighbor[idx2]['room'] = \
                neighbor[idx2]['room'], neighbor[idx]['room']
            name1 = course_by_id.get(neighbor[idx]['course'], {}).get('name', '')
            name2 = course_by_id.get(neighbor[idx2]['course'], {}).get('name', '')
            if name1:
                for k in range(len(neighbor)):
                    if course_by_id.get(neighbor[k]['course'], {}).get('name', '') == name1:
                        neighbor[k]['timeslot'] = ts2
            if name2:
                for k in range(len(neighbor)):
                    if course_by_id.get(neighbor[k]['course'], {}).get('name', '') == name2:
                        neighbor[k]['timeslot'] = ts1
        else:
            if valid_timeslots:
                new_ts = random.choice(valid_timeslots)['id']
                neighbor[idx]['timeslot'] = new_ts
            neighbor[idx]['room'] = random.choice(rooms)['id']
            name1 = course_by_id.get(neighbor[idx]['course'], {}).get('name', '')
            if name1:
                for k in range(len(neighbor)):
                    if course_by_id.get(neighbor[k]['course'], {}).get('name', '') == name1:
                        neighbor[k]['timeslot'] = new_ts
        
        neighbor_cost = calculate_cost(neighbor, students, courses, rooms, timeslots)
        delta = neighbor_cost - current_cost
        
        if delta < 0 or random.random() < math.exp(-delta / temperature):
            current_solution = neighbor
            current_cost = neighbor_cost
            
            if current_cost < best_cost:
                best_solution = [entry.copy() for entry in current_solution]
                best_cost = current_cost
        
        temperature *= cooling_rate
        
        if i % 10 == 0:
            history.append({
                'iteration': i,
                'cost': current_cost,
                'temp': temperature,
                'best': best_cost
            })
    
    return {
        'solution': best_solution,
        'cost': best_cost,
        'history': history
    }


# ==================== FLASK API ROUTES ====================

@app.route('/api/traditional_sa', methods=['POST'])
def run_traditional_sa():
    """Run Traditional Simulated Annealing"""
    try:
        data = request.json
        print("📩 Received data keys:", list(data.keys()) if data else "No data")
        
        result = traditional_simulated_annealing(
            data['courses'],
            data['timeslots'],
            data['rooms'],
            data['instructors'],
            data['students'],
            data['params']
        )
        return jsonify(result)
    except Exception as e:
        import traceback
        print("❌ Backend error:", e)
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/hybrid_sa', methods=['POST'])
def run_hybrid_sa():
    """Run Hybrid Simulated Annealing"""
    try:
        data = request.json
        result = hybrid_simulated_annealing(
            data['courses'],
            data['timeslots'],
            data['rooms'],
            data['instructors'],
            data['students'],
            data['params']
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Python backend is running'})





if __name__ == '__main__':
    print("🐍 Starting Python Flask Backend...")
    print("📡 API will be available at: http://localhost:5000")
    print("🔗 CORS enabled for React frontend")
    print("🔗 Endpoints:")
    print("   - POST /api/traditional_sa")
    print("   - POST /api/hybrid_sa")
    print("   - GET  /api/health")
    app.run(debug=True, port=5000)
