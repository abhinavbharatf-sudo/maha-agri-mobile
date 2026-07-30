import React from 'react';
import { BookOpen, GraduationCap, Calendar, Award, CheckCircle, Clock, PlayCircle, Download } from 'lucide-react';

export default function CandidateTraining() {
  const enrolledCourses = [
    {
      id: 'EDP-2026-DRN',
      title: 'MAHA-AGRI Agri Drone Entrepreneurship & Spraying Certification',
      duration: '15 Days Live Workshop & Field Practice',
      progress: 85,
      status: 'IN_PROGRESS',
      nextClass: 'Today, 02:00 PM (Live Field Demonstration)',
      instructor: 'Prof. Anil Varma (KVK Wardha)',
      certificateStatus: 'Eligible upon completion',
    },
    {
      id: 'EDP-2026-SOIL',
      title: 'Basic Soil Testing & Digital Health Card Management EDP',
      duration: '7 Days Skill Course',
      progress: 100,
      status: 'COMPLETED',
      nextClass: 'Completed on 15 June 2026',
      instructor: 'Smt. Radhika Joshi (STTL Pune)',
      certificateStatus: 'Certificate Issued & Verified',
    },
  ];

  return (
    <div className="space-y-5 font-sans text-slate-900">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-xs">
            <GraduationCap className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Training & EDP Skill Center</h2>
            <p className="text-xs text-slate-500 font-medium">
              Entrepreneurship Development Program (EDP) & Agri-Skill Certifications
            </p>
          </div>
        </div>

        <button className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors">
          Browse New EDP Courses
        </button>
      </div>

      {/* Enrolled Courses */}
      <div className="space-y-4">
        {enrolledCourses.map(course => (
          <div key={course.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {course.id}
                </span>
                <h3 className="font-bold text-slate-900 text-sm">{course.title}</h3>
                <p className="text-xs text-slate-500 font-medium">{course.duration} • Instructor: {course.instructor}</p>
              </div>

              <span className={`self-start sm:self-center text-[10px] font-bold px-2.5 py-1 rounded-full ${
                course.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {course.status === 'COMPLETED' ? 'Completed' : 'In Progress (85%)'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Course Progress</span>
                <span className="text-emerald-800">{course.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${course.progress}%` }}></div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 text-xs">
              <span className="text-slate-500 font-medium flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Status: {course.nextClass}</span>
              </span>

              {course.status === 'COMPLETED' ? (
                <button className="flex items-center space-x-1.5 bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-800 transition-colors shadow-xs">
                  <Download className="w-3.5 h-3.5" />
                  <span>Download EDP Certificate</span>
                </button>
              ) : (
                <button className="flex items-center space-x-1.5 bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shadow-xs">
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>Join Live Session</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
