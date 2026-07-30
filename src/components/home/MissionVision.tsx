import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Target,
  Eye,
  CheckCircle2,
  Shield,
  Globe,
  Users,
  Leaf,
  ArrowRight,
  Award,
} from 'lucide-react';

const MissionVision = () => {
  const values = [
    { icon: Shield, title: 'Integrity', desc: 'Transparent governance' },
    { icon: Globe, title: 'Innovation', desc: 'Technology-first approach' },
    { icon: Users, title: 'Inclusivity', desc: 'Last-mile reach' },
    { icon: Leaf, title: 'Sustainability', desc: 'Long-term impact' },
  ];

  const principles = [
    'Community ownership of all programmes',
    'Evidence-based decision making',
    'Public-private partnership models',
    'Scalable and replicable solutions',
  ];

  return (
    <section className="py-28 md:py-40 lg:py-48 bg-gradient-to-b from-white via-primary-50/40 to-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, #1a3a5c 1px, transparent 0)`,
        backgroundSize: '48px 48px'
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
            <Award className="w-4 h-4" />
            <span>Foundation Charter</span>
          </motion.div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-900 tracking-tight leading-[1.1]">
            Our Mission &
            <span className="block text-primary-600">Vision</span>
          </h2>
        </motion.div>

        {/* Mission & Vision Cards */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-10 mb-16 md:mb-20">
          {/* Mission */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ y: -4 }}
            className="relative bg-white p-8 lg:p-10 rounded-2xl border border-primary-100/80 shadow-sm hover:shadow-xl hover:shadow-primary-900/5 transition-all duration-500"
          >
            <div className="absolute top-0 left-0 w-20 h-1.5 bg-gradient-to-r from-primary-900 to-primary-600 rounded-tl-2xl" />
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-800 to-primary-950 rounded-xl flex items-center justify-center shadow-sm">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-[10px] text-primary-500 uppercase tracking-wider font-semibold mb-0.5">Our Purpose</div>
                <h3 className="text-2xl md:text-3xl font-bold text-primary-900">Mission</h3>
              </div>
            </div>
            <p className="text-lg text-primary-700 leading-relaxed mb-7">
              To catalyze sustainable rural transformation through innovative agricultural practices,
              women empowerment, skill development, and technology-enabled services that create
              self-reliant and prosperous communities across Maharashtra and India.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {principles.slice(0, 2).map((p, i) => (
                <motion.div
                  key={p}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4.5 h-4.5 text-accent-green-600 mt-0.5 shrink-0" />
                  <span className="text-sm text-primary-600 leading-snug">{p}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Vision */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ y: -4 }}
            className="relative bg-white p-8 lg:p-10 rounded-2xl border border-primary-100/80 shadow-sm hover:shadow-xl hover:shadow-primary-900/5 transition-all duration-500"
          >
            <div className="absolute top-0 left-0 w-20 h-1.5 bg-gradient-to-r from-accent-green-600 to-accent-green-500 rounded-tl-2xl" />
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-accent-green-600 to-accent-green-700 rounded-xl flex items-center justify-center shadow-sm">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-[10px] text-primary-500 uppercase tracking-wider font-semibold mb-0.5">Our Aspiration</div>
                <h3 className="text-2xl md:text-3xl font-bold text-primary-900">Vision</h3>
              </div>
            </div>
            <p className="text-lg text-primary-700 leading-relaxed mb-7">
              A self-reliant rural India where every farmer is prosperous, every woman is empowered,
              every youth is skilled, and every village has access to modern amenities, quality
              healthcare, and world-class education.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {['Prosperous Farmers', 'Empowered Women', 'Skilled Youth', 'Connected Villages'].map((p, i) => (
                <motion.div
                  key={p}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4.5 h-4.5 text-accent-green-600 mt-0.5 shrink-0" />
                  <span className="text-sm text-primary-600 leading-snug">{p}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Core Values */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 rounded-2xl p-8 md:p-10 lg:p-14 shadow-xl"
        >
          <div className="text-center mb-12">
            <div className="text-[10px] text-primary-400 uppercase tracking-widest font-semibold mb-2">Our Commitment</div>
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">Core Values</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -4 }}
                className="text-center group"
              >
                <div className="w-16 h-16 mx-auto bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mb-5 group-hover:bg-white/20 transition-colors duration-300 border border-white/10">
                  <v.icon className="w-7 h-7 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">{v.title}</h4>
                <p className="text-sm text-primary-300">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Learn More */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Link
            to="/about"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-900 hover:text-primary-700 transition-colors"
          >
            Learn More About Our Foundation
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default MissionVision;
