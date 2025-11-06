"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import logoImg from "../images.jpeg"
import { Upload, Download, Play, BarChart3, Calendar, AlertCircle, CheckCircle, Settings, Users, Images } from "lucide-react"
import * as Papa from "papaparse"

// ==================== API CLIENT ====================
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api"

const callPythonBackend = async (endpoint: string, data: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      
      throw new Error(`Backend error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("[v0] Backend API Error:", error)
    throw error
  }
}

// ==================== REACT COMPONENT ====================

const TimetableOptimizer = () => {
  const [courses, setCourses] = useState<any[]>([])
  const [timeslots, setTimeslots] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [instructors, setInstructors] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])

  const [traditionalResult, setTraditionalResult] = useState<any>(null)
  const [hybridResult, setHybridResult] = useState<any>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState({ method: "", iter: 0, total: 0, cost: 0, best: 0 })
  const [activeTab, setActiveTab] = useState("upload")
  const [viewType, setViewType] = useState("student")
  const [errorMessage, setErrorMessage] = useState("")

  const [params, setParams] = useState({
    maxIterations: 1000,
    initialTemp: 100,
    coolingRate: 0.95,
  })
  const [showParams, setShowParams] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const parseCSV = (file: File, setter: (data: any[]) => void) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        setter(results.data)
      },
    })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (data: any[]) => void) => {
    const file = e.target.files?.[0]
    if (file) parseCSV(file, setter)
  }

  const runOptimization = async () => {
    if (!courses.length || !timeslots.length || !rooms.length) {
      setErrorMessage("Please upload all required data files first!")
      return
    }

    setErrorMessage("")
    setIsRunning(true)
    setProgress({ method: "Traditional SA", iter: 0, total: params.maxIterations, cost: 0, best: 0 })

    try {
      console.log("[v0] Starting optimization with backend...")

      // Call Python backend for Traditional SA
      const tradResult = await callPythonBackend("traditional_sa", {
        courses,
        timeslots,
        rooms,
        instructors,
        students,
        params,
      })

      setTraditionalResult(tradResult)
      setProgress({ method: "Hybrid SA", iter: 0, total: params.maxIterations, cost: 0, best: 0 })

      // Call Python backend for Hybrid SA
      const hybResult = await callPythonBackend("hybrid_sa", {
        courses,
        timeslots,
        rooms,
        instructors,
        students,
        params,
      })

      setHybridResult(hybResult)
      setIsRunning(false)
      setActiveTab("results")
      console.log("[v0] Optimization completed successfully")
    } catch (error) {
      console.error("[v0] Optimization error:", error)
      setErrorMessage("Error running optimization. Make sure Python backend is running on http://localhost:5000")
      setIsRunning(false)
    }
  }

  const generateStudentSchedule = (result: any) => {
    const scheduleRows: any[] = []

    students.forEach((student) => {
      const assignment = result.solution.find((s: any) => s.course === student.course_id)
      if (assignment) {
        const course = courses.find((c) => c.id === student.course_id)
        const ts = timeslots.find((t) => t.id === assignment.timeslot)
        const room = rooms.find((r) => r.id === assignment.room)
        const instructor = instructors.find((i) => i.id === assignment.instructor_id)

        scheduleRows.push({
          student_id: student.id,
          student_name: student.name,
          specialty: student.specialty || "N/A",
          module_name: course?.name || "Unknown",
          exam_day: ts?.day || "",
          time: ts?.time || "",
          classroom: room?.name || "",
          instructor: instructor?.name || "Unknown",
        })
      }
    })

    return scheduleRows
  }

  const exportStudentSchedule = (result: any, method: string) => {
    const data = generateStudentSchedule(result)
    const csv = Papa.unparse(data)

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `student_schedule_${method}_${Date.now()}.csv`
    a.click()
  }

  const exportGroupTimetable = (result: any, method: string, specialty: string) => {
    const scheduleData = result.solution
      .map((entry: any) => {
        const course = courses.find((c) => c.id === entry.course)
        const ts = timeslots.find((t) => t.id === entry.timeslot)
        const room = rooms.find((r) => r.id === entry.room)
        const instructor = instructors.find((i) => i.id === entry.instructor_id)
        const courseStudents = students.filter((s) => s.course_id === entry.course)
        const specialties = [...new Set(courseStudents.map((s) => s.specialty))]

        return {
          course: course?.name,
          day: ts?.day,
          time: ts?.time,
          room: room?.name,
          instructor: instructor?.name,
          specialties: (specialties as any).join(", "),
        }
      })
      .filter((s) => specialty === "all" || s.specialties.includes(specialty))

    const csv = Papa.unparse(scheduleData)
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `specialty_timetable_${specialty}_${method}_${Date.now()}.csv`
    a.click()
  }

  const renderStudentTable = (result: any, method: string) => {
    if (!result) return null

    const scheduleRows = generateStudentSchedule(result)

    return (
      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">{method} - Student Schedule</h3>
          <button
            onClick={() => exportStudentSchedule(result, method)}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 inline-flex items-center gap-2"
          >
            <Download size={16} /> Export Student Schedule
          </button>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead className="bg-purple-100 sticky top-0">
              <tr>
                <th className="border border-gray-300 p-2">Student ID</th>
                <th className="border border-gray-300 p-2">Student Name</th>
                <th className="border border-gray-300 p-2">Specialty</th>
                <th className="border border-gray-300 p-2">Module Name</th>
                <th className="border border-gray-300 p-2">Exam Day</th>
                <th className="border border-gray-300 p-2">Time</th>
                <th className="border border-gray-300 p-2">Classroom</th>
                <th className="border border-gray-300 p-2">Instructor</th>
              </tr>
            </thead>
            <tbody>
              {scheduleRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-2">{row.student_id}</td>
                  <td className="border border-gray-300 p-2">{row.student_name}</td>
                  <td className="border border-gray-300 p-2">{row.specialty}</td>
                  <td className="border border-gray-300 p-2 font-semibold">{row.module_name}</td>
                  <td className="border border-gray-300 p-2">{row.exam_day}</td>
                  <td className="border border-gray-300 p-2">{row.time}</td>
                  <td className="border border-gray-300 p-2">{row.classroom}</td>
                  <td className="border border-gray-300 p-2">{row.instructor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderGroupTimetable = (result: any, method: string) => {
    if (!result) return null

    const scheduleData = result.solution.map((entry: any) => {
      const course = courses.find((c) => c.id === entry.course)
      const ts = timeslots.find((t) => t.id === entry.timeslot)
      const room = rooms.find((r) => r.id === entry.room)
      const instructor = instructors.find((i) => i.id === entry.instructor_id)
      const courseStudents = students.filter((s) => s.course_id === entry.course)
      const specialties = [...new Set(courseStudents.map((s) => s.specialty))]

      return {
        courseName: course?.name,
        day: ts?.day,
        time: ts?.time,
        roomName: room?.name,
        instructorName: instructor?.name,
        specialties: specialties,
      }
    })

    const allSpecialties = [...new Set(students.map((s) => s.specialty).filter(Boolean))] as string[]
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]

    const renderSpecialtyTable = (specialty: string) => {
      const filteredData = scheduleData.filter((s) => (s.specialties as any).includes(specialty))
      const times = [...new Set(filteredData.map((s) => s.time))].sort() as string[]

      return (
        <div key={specialty} className="space-y-2 mb-6 border-2 border-indigo-200 rounded-lg p-4 bg-indigo-50">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-bold text-indigo-900">📚 {specialty}</h4>
            <button
              onClick={() => exportGroupTimetable(result, method, specialty)}
              className="bg-indigo-600 text-white px-3 py-1 text-xs rounded hover:bg-indigo-700 inline-flex items-center gap-1"
            >
              <Download size={12} /> Export
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-400 text-xs bg-white">
              <thead>
                <tr className="bg-indigo-200">
                  <th className="border border-gray-400 p-2 bg-indigo-300 font-bold">Time / Day</th>
                  {days.map((day) => (
                    <th key={day} className="border border-gray-400 p-2 min-w-[140px] font-bold">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {times.map((time) => (
                  <tr key={time}>
                    <td className="border border-gray-400 p-2 font-bold bg-indigo-100 text-center">{time}</td>
                    {days.map((day) => {
                      const classes = filteredData.filter((s) => s.day === day && s.time === time)
                      return (
                        <td key={day} className="border border-gray-400 p-2">
                          {classes.map((c, idx) => (
                            <div
                              key={idx}
                              className="mb-1 p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded border border-indigo-300"
                            >
                              <div className="font-bold text-indigo-900">{c.courseName}</div>
                              <div className="text-xs text-gray-700 mt-1">📍 {c.roomName}</div>
                              <div className="text-xs text-gray-600">👤 {c.instructorName}</div>
                            </div>
                          ))}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    const renderFullTable = () => {
      const allTimes = [...new Set(scheduleData.map((s) => s.time))].sort() as string[]

      return (
        <div className="space-y-2 mb-6 border-2 border-green-200 rounded-lg p-4 bg-green-50">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-bold text-green-900">📋 Full Timetable (All Specialties)</h4>
            <button
              onClick={() => exportGroupTimetable(result, method, "all")}
              className="bg-green-600 text-white px-3 py-1 text-xs rounded hover:bg-green-700 inline-flex items-center gap-1"
            >
              <Download size={12} /> Export Full
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-400 text-xs bg-white">
              <thead>
                <tr className="bg-green-200">
                  <th className="border border-gray-400 p-2 bg-green-300 font-bold">Time / Day</th>
                  {days.map((day) => (
                    <th key={day} className="border border-gray-400 p-2 min-w-[160px] font-bold">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allTimes.map((time) => (
                  <tr key={time}>
                    <td className="border border-gray-400 p-2 font-bold bg-green-100 text-center">{time}</td>
                    {days.map((day) => {
                      const classes = scheduleData.filter((s) => s.day === day && s.time === time)
                      return (
                        <td key={day} className="border border-gray-400 p-2">
                          {classes.map((c, idx) => (
                            <div
                              key={idx}
                              className="mb-1 p-2 bg-gradient-to-br from-green-50 to-emerald-50 rounded border border-green-300"
                            >
                              <div className="font-bold text-green-900">{c.courseName}</div>
                              <div className="text-xs text-purple-700 mt-1">🎓 {(c.specialties as any).join(", ")}</div>
                              <div className="text-xs text-gray-700">📍 {c.roomName}</div>
                              <div className="text-xs text-gray-600">👤 {c.instructorName}</div>
                            </div>
                          ))}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6 mb-8">
        <h3 className="text-xl font-bold text-center text-indigo-700">{method} - Specialty Timetables</h3>

        {renderFullTable()}

        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-700 border-b-2 border-gray-300 pb-2">
            Individual Specialty Timetables
          </h4>
          {allSpecialties.map((specialty) => renderSpecialtyTable(specialty))}
        </div>
      </div>
    )
  }

  const renderChart = () => {
    if (!traditionalResult || !hybridResult) return null

    const maxLen = Math.max(traditionalResult.history.length, hybridResult.history.length)
    const width = 800
    const height = 400
    const margin = { top: 20, right: 30, bottom: 40, left: 60 }

    const maxCost = Math.max(
      ...traditionalResult.history.map((h: any) => h.cost),
      ...hybridResult.history.map((h: any) => h.cost),
    )

    const xScale = (i: number) => margin.left + (i / maxLen) * (width - margin.left - margin.right)
    const yScale = (cost: number) => height - margin.bottom - (cost / maxCost) * (height - margin.top - margin.bottom)

    const tradPath = traditionalResult.history
      .map((h: any, i: number) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(h.cost)}`)
      .join(" ")

    const hybridPath = hybridResult.history
      .map((h: any, i: number) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(h.cost)}`)
      .join(" ")

    const tradBest: number[] = []
    let tb = Infinity
    for (let i = 0; i < traditionalResult.history.length; i++) {
      tb = Math.min(tb, traditionalResult.history[i].cost as number)
      tradBest.push(tb)
    }
    const hybridBest: number[] = []
    let hb = Infinity
    for (let i = 0; i < hybridResult.history.length; i++) {
      hb = Math.min(hb, hybridResult.history[i].cost as number)
      hybridBest.push(hb)
    }
    const tradBestPath = tradBest
      .map((c: number, i: number) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(c)}`)
      .join(" ")
    const hybridBestPath = hybridBest
      .map((c: number, i: number) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(c)}`)
      .join(" ")

    const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = (e.target as SVGElement).closest('svg') as SVGSVGElement
      const bbox = rect.getBoundingClientRect()
      const x = e.clientX - bbox.left
      const innerW = width - margin.left - margin.right
      const t = Math.max(0, Math.min(1, (x - margin.left) / innerW))
      const idx = Math.round(t * (maxLen - 1))
      setHoveredIndex(idx)
    }
    const handleLeave = () => setHoveredIndex(null)

    const hi = hoveredIndex ?? null
    const getValue = (arr: any[], i: number) => arr[Math.max(0, Math.min(arr.length - 1, i))]?.cost as number
    const tradVal = hi !== null ? getValue(traditionalResult.history, hi) : null
    const hybrVal = hi !== null ? getValue(hybridResult.history, hi) : null

    return (
      <svg
        width={width}
        height={height}
        className="border border-gray-300 bg-white"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        <text x={width / 2} y={15} textAnchor="middle" className="font-bold">
          Cost Convergence Comparison
        </text>

        <g>
          {[0, 1, 2, 3, 4, 5].map((t) => (
            <g key={t}>
              <line
                x1={margin.left}
                y1={height - margin.bottom - (t / 5) * (height - margin.top - margin.bottom)}
                x2={width - margin.right}
                y2={height - margin.bottom - (t / 5) * (height - margin.top - margin.bottom)}
                stroke="#eee"
              />
              <text
                x={margin.left - 8}
                y={height - margin.bottom - (t / 5) * (height - margin.top - margin.bottom) + 4}
                textAnchor="end"
                className="text-[10px] fill-gray-500"
              >
                {((t / 5) * maxCost).toFixed(0)}
              </text>
            </g>
          ))}
          <line
            x1={margin.left}
            y1={height - margin.bottom}
            x2={width - margin.right}
            y2={height - margin.bottom}
            stroke="#666"
          />
          <line x1={margin.left} y1={margin.top} x2={margin.left} y2={height - margin.bottom} stroke="#666" />
          <text x={width / 2} y={height - 10} textAnchor="middle" className="text-sm">
            Iteration
          </text>
          <text
            x={10}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90 10 ${height / 2})`}
            className="text-sm"
          >
            Cost
          </text>
        </g>

        <path d={tradPath} fill="none" stroke="#ef4444" strokeWidth="2" />
        <path d={hybridPath} fill="none" stroke="#3b82f6" strokeWidth="2" />
        <path d={tradBestPath} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d={hybridBestPath} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 4" />

        <g>
          <rect x={width - 150} y={30} width={15} height={3} fill="#ef4444" />
          <text x={width - 130} y={35} className="text-xs">
            Traditional SA
          </text>
          <rect x={width - 150} y={45} width={15} height={3} fill="#3b82f6" />
          <text x={width - 130} y={50} className="text-xs">
            Hybrid SA
          </text>
          <rect x={width - 150} y={60} width={15} height={3} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={width - 130} y={65} className="text-xs">Traditional Best</text>
          <rect x={width - 150} y={75} width={15} height={3} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={width - 130} y={80} className="text-xs">Hybrid Best</text>
        </g>

        {hi !== null && (
          <g>
            <line x1={xScale(hi)} y1={margin.top} x2={xScale(hi)} y2={height - margin.bottom} stroke="#888" strokeDasharray="3 3" />
            {tradVal !== null && (
              <circle cx={xScale(hi)} cy={yScale(tradVal as number)} r={4} fill="#ef4444" />
            )}
            {hybrVal !== null && (
              <circle cx={xScale(hi)} cy={yScale(hybrVal as number)} r={4} fill="#3b82f6" />
            )}
            <g transform={`translate(${Math.min(xScale(hi) + 10, width - 180)}, ${margin.top + 10})`}>
              <rect width="170" height="48" rx="6" fill="#ffffff" stroke="#ddd" />
              <text x="8" y="18" className="text-[12px] fill-gray-800">Iter: {hi}</text>
              <text x="8" y="34" className="text-[12px] fill-red-600">Trad: {tradVal?.toFixed(2)}</text>
              <text x="90" y="34" className="text-[12px] fill-blue-600">Hybrid: {hybrVal?.toFixed(2)}</text>
            </g>
          </g>
        )}
      </svg>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-2xl p-6">
          <h1 className="text-3xl font-bold text-center mb-2 text-indigo-700 flex items-center justify-center gap-2">
            <Image 
    src="/logo.jpeg" 
    alt="" 
    width={70} 
    height={70} 
    className="rounded" 
  />
            <span>University Exam Timetabling Optimizer</span>
          </h1>
          <p className="text-center text-gray-600 mb-2">Simulated Annealing: Traditional vs Hybrid Approach</p>

          <div className="flex border-b mb-6">
            {["upload", "results", "comparison"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 font-semibold ${
                  activeTab === tab
                    ? "border-b-2 border-indigo-600 text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-4 text-red-800">
              <AlertCircle size={20} className="inline mr-2" />
              {errorMessage}
            </div>
          )}

          {activeTab === "upload" && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <button
                  onClick={() => setShowParams(!showParams)}
                  className="flex items-center gap-2 font-semibold text-indigo-700 mb-2"
                >
                  <Settings size={20} />
                  Optimization Parameters
                  <span className="text-xs">({showParams ? "Hide" : "Show"})</span>
                </button>

                {showParams && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Max Iterations</label>
                      <input
                        type="number"
                        value={params.maxIterations}
                        onChange={(e) => setParams({ ...params, maxIterations: Number.parseInt(e.target.value) })}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Initial Temperature</label>
                      <input
                        type="number"
                        value={params.initialTemp}
                        onChange={(e) => setParams({ ...params, initialTemp: Number.parseFloat(e.target.value) })}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Cooling Rate (0-1)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={params.coolingRate}
                        onChange={(e) => setParams({ ...params, coolingRate: Number.parseFloat(e.target.value) })}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-yellow-800">📋 CSV Format Requirements:</h4>
                <div className="text-xs space-y-1 text-yellow-900">
                  <div>
                    • <strong>Modules.csv:</strong> id, name, instructor_id
                  </div>
                  <div>
                    • <strong>Instructors.csv:</strong> id, name
                  </div>
                  <div>
                    • <strong>Classrooms.csv:</strong> id, name, capacity
                  </div>
                  <div>
                    • <strong>Students.csv:</strong> id, name, course_id, specialty
                  </div>
                  <div>
                    • <strong>Timeslots.csv:</strong> id, day, time
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: "Modules", state: courses, setter: setCourses },
                  { name: "Timeslots", state: timeslots, setter: setTimeslots },
                  { name: "Classrooms", state: rooms, setter: setRooms },
                  { name: "Instructors", state: instructors, setter: setInstructors },
                  { name: "Students", state: students, setter: setStudents },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-indigo-400"
                  >
                    <label className="flex flex-col items-center cursor-pointer">
                      <Upload className="text-indigo-600 mb-2" size={32} />
                      <span className="text-sm font-semibold mb-2">{item.name}.csv</span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => handleFileUpload(e, item.setter)}
                        className="hidden"
                      />
                      {item.state.length > 0 && (
                        <span className="text-green-600 text-xs flex items-center gap-1">
                          <CheckCircle size={14} /> {item.state.length} records loaded
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </div>

              <button
                onClick={runOptimization}
                disabled={isRunning || courses.length === 0}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                <Play size={20} />
                {isRunning ? `Running ${progress.method}... ` : "Run Python Backend Optimization"}
              </button>

              {isRunning && (
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>🐍 {progress.method}</span>
                    <span>Processing...</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full animate-pulse" style={{ width: "100%" }} />
                  </div>
                  <div className="text-xs mt-2 text-gray-600">Calling Python backend API...</div>
                </div>
              )}
            </div>
          )}

          {activeTab === "results" && (
            <div className="space-y-8">
              <div className="flex justify-center gap-4 mb-4">
                <button
                  onClick={() => setViewType("student")}
                  className={`px-6 py-2 rounded flex items-center gap-2 ${
                    viewType === "student" ? "bg-purple-600 text-white" : "bg-gray-200"
                  }`}
                >
                  <Users size={20} /> Student Schedule
                </button>
                <button
                  onClick={() => setViewType("group")}
                  className={`px-6 py-2 rounded flex items-center gap-2 ${
                    viewType === "group" ? "bg-blue-600 text-white" : "bg-gray-200"
                  }`}
                >
                  <Calendar size={20} /> Specialty Timetable
                </button>
              </div>

              {viewType === "student" ? (
                <>
                  {traditionalResult && renderStudentTable(traditionalResult, "Traditional SA")}
                  {hybridResult && renderStudentTable(hybridResult, "Hybrid SA")}
                </>
              ) : (
                <>
                  {traditionalResult && renderGroupTimetable(traditionalResult, "Traditional SA")}
                  {hybridResult && renderGroupTimetable(hybridResult, "Hybrid SA")}
                </>
              )}

              {!traditionalResult && !hybridResult && (
                <div className="text-center text-gray-500 py-12">
                  <AlertCircle size={48} className="mx-auto mb-4 text-gray-400" />
                  <p>No results yet. Upload data and run optimization first.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "comparison" && (
            <div className="space-y-6">
              {traditionalResult && hybridResult ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                      <h3 className="font-bold text-lg mb-2">🔴 Traditional SA</h3>
                      <p className="text-sm text-gray-600 mb-2">Random initialization</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Final Cost:</span>
                          <strong>{(traditionalResult.cost as number).toFixed(2)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Iterations:</span>
                          <strong>{traditionalResult.history.length}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Initial Cost:</span>
                          <strong>{(traditionalResult.history[0].cost as number).toFixed(2)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Improvement:</span>
                          <strong className="text-green-600">
                            {(
                              (((traditionalResult.history[0].cost - traditionalResult.cost) /
                                traditionalResult.history[0].cost) *
                                100) as number
                            ).toFixed(1)}
                            %
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <h3 className="font-bold text-lg mb-2">🔵 Hybrid SA</h3>
                      <p className="text-sm text-gray-600 mb-2">Feasible initialization (Greedy)</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Final Cost:</span>
                          <strong>{(hybridResult.cost as number).toFixed(2)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Iterations:</span>
                          <strong>{hybridResult.history.length}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Initial Cost:</span>
                          <strong>{(hybridResult.history[0].cost as number).toFixed(2)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Improvement:</span>
                          <strong className="text-green-600">
                            {(
                              (((hybridResult.history[0].cost - hybridResult.cost) / hybridResult.history[0].cost) *
                                100) as number
                            ).toFixed(1)}
                            %
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">Cost decreases are shown with solid lines; dashed lines indicate best-so-far trajectories.</div>
                  <div className="flex justify-center mt-2">{renderChart()}</div>

                  
                </>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <BarChart3 size={48} className="mx-auto mb-4 text-gray-400" />
                  <p>Run optimization first to see comparison.</p>
                </div>
              )}
            </div>
          )}
        </div>

       
      </div>
    </div>
  )
}

export default TimetableOptimizer
