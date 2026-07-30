import { motion } from 'framer-motion';
import { MapPin, Activity, Building2, Users, Globe, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const divisions = [
  { name: 'Pune Division', projects: 8, districts: 'Pune, Satara, Solapur, Sangli', color: '#16a34a' },
  { name: 'Nagpur Division', projects: 6, districts: 'Nagpur, Bhandara, Wardha, Gondia, Chandrapur', color: '#334e68' },
  { name: 'Mumbai Division', projects: 4, districts: 'Mumbai City, Mumbai Suburban, Thane, Palghar, Raigad', color: '#e68000' },
  { name: 'Aurangabad Division', projects: 5, districts: 'Aurangabad, Jalna, Parbhani, Beed, Hingoli', color: '#16a34a' },
  { name: 'Nashik Division', projects: 4, districts: 'Nashik, Dhule, Jalgaon, Nandurbar, Ahmednagar', color: '#334e68' },
  { name: 'Amravati Division', projects: 3, districts: 'Amravati, Akola, Buldhana, Yavatmal, Washim', color: '#e68000' },
];

const MaharashtraMap = () => {
  return (
    <section className="py-28 md:py-40 lg:py-48 bg-gradient-to-b from-white via-primary-50/40 to-white relative overflow-hidden">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `linear-gradient(#1a3a5c 1px, transparent 1px), linear-gradient(90deg, #1a3a5c 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      <div className="max-w-[1440px] mx-auto px-6 lg:px-16 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20 md:mb-24"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2.5 px-5 py-2 bg-primary-900 text-white rounded-full text-xs font-bold uppercase tracking-wider mb-8"
          >
            <Globe className="w-4 h-4" />
            <span>Operational Footprint</span>
          </motion.div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-900 tracking-tight mb-7 leading-[1.1]">
            Pan-Maharashtra
            <span className="block text-primary-600">Presence</span>
          </h2>
          <p className="text-lg md:text-xl text-primary-600 max-w-3xl mx-auto leading-relaxed">
            Operating across all six revenue divisions with 156 district offices and over 2,800 village
            touchpoints, ensuring last-mile delivery of services and support.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
          {/* Map Visualization */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative"
          >
            <div className="bg-white rounded-2xl border border-primary-100/80 p-6 lg:p-10 shadow-sm hover:shadow-xl transition-shadow duration-500">
              <div className="relative aspect-square max-w-md mx-auto">
                {/* Maharashtra SVG */}
                <svg viewBox="0 0 400 400" className="w-full h-full">
                  {/* State outline */}
                  <path
                    d="M70,100 L110,50 L200,35 L290,55 L350,110 L375,200 L360,290 L300,345 L230,370 L160,360 L100,315 L70,250 L55,175 Z"
                    fill="#f0f4f8"
                    stroke="#334e68"
                    strokeWidth="2"
                    className="drop-shadow-sm"
                  />
                  {/* Division separators */}
                  <path d="M200,35 L200,200" stroke="#829ab1" strokeWidth="1" strokeDasharray="4,3" />
                  <path d="M80,200 L350,200" stroke="#829ab1" strokeWidth="1" strokeDasharray="4,3" />
                  <path d="M120,310 L280,90" stroke="#829ab1" strokeWidth="1" strokeDasharray="4,3" />
                  {/* Cities */}
                  <motion.circle
                    cx="200" cy="290" r="8"
                    fill="#16a34a"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 0.5 }}
                  />
                  <circle cx="290" cy="150" r="8" fill="#16a34a" />
                  <circle cx="100" cy="230" r="8" fill="#16a34a" />
                  <circle cx="200" cy="130" r="8" fill="#16a34a" />
                  <circle cx="150" cy="200" r="8" fill="#16a34a" />
                  <circle cx="250" cy="220" r="8" fill="#16a34a" />
                  {/* City labels */}
                  <text x="200" y="310" textAnchor="middle" className="text-[10px] fill-primary-600 font-medium">Pune</text>
                  <text x="290" y="140" textAnchor="middle" className="text-[10px] fill-primary-600 font-medium">Nagpur</text>
                  <text x="100" y="220" textAnchor="middle" className="text-[10px] fill-primary-600 font-medium">Mumbai</text>
                  <text x="200" y="120" textAnchor="middle" className="text-[10px] fill-primary-600 font-medium">Nashik</text>
                  <text x="150" y="215" textAnchor="middle" className="text-[10px] fill-primary-600 font-medium">Aurangabad</text>
                  <text x="250" y="238" textAnchor="middle" className="text-[10px] fill-primary-600 font-medium">Amravati</text>
                </svg>

                {/* Legend */}
                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl border border-primary-100/80">
                  <div className="flex items-center gap-4 text-xs text-primary-600">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-accent-green-500" />
                      <span className="font-medium">Regional Office</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border-2 border-primary-300" />
                      <span className="font-medium">District Office</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Division Cards */}
          <div className="space-y-4">
            {divisions.map((div, i) => (
              <motion.div
                key={div.name}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ x: 4 }}
                className="bg-white border border-primary-100/80 p-5 rounded-xl hover:border-primary-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: div.color }}
                    />
                    <h4 className="font-bold text-primary-900">{div.name}</h4>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-green-50 rounded-full text-xs font-bold text-accent-green-700">
                    <Activity className="w-3 h-3" />
                    {div.projects} Projects
                  </div>
                </div>
                <p className="text-sm text-primary-500 leading-relaxed">{div.districts}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Statistics Row */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-14"
        >
          {[
            { value: '6', label: 'Revenue Divisions', icon: Building2 },
            { value: '156', label: 'District Offices', icon: MapPin },
            { value: '358', label: 'Taluka Centres', icon: Globe },
            { value: '2,847+', label: 'Village Touchpoints', icon: Users },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-white border border-primary-100/80 p-6 lg:p-7 text-center rounded-xl hover:shadow-xl hover:shadow-primary-900/5 transition-all duration-300 group"
            >
              <stat.icon className="w-5 h-5 mx-auto text-primary-400 mb-3 group-hover:text-primary-600 transition-colors" />
              <div className="text-3xl lg:text-4xl font-bold text-primary-900 mb-1.5">{stat.value}</div>
              <div className="text-[11px] text-primary-500 uppercase tracking-wider font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default MaharashtraMap;
