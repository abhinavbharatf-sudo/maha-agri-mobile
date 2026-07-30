import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, MapPin, CheckCircle2, Activity } from 'lucide-react';

const featured = [
  {
    id: 'maha-agri',
    title: 'MAHA-AGRI PROJECT',
    subtitle: 'Agricultural Transformation Mission',
    desc: 'Precision farming revolution across 45,000+ hectares with drone monitoring, AI crop advisory, and market linkage.',
    image: 'https://images.pexels.com/photos/2889440/pexels-photo-2889440.jpeg?auto=compress&cs=tinysrgb&w=900',
    gradient: 'from-green-600 to-emerald-700',
    stats: [
      { value: '89,340+', label: 'Farmers' },
      { value: '45,000+', label: 'Hectares' },
      { value: '47%', label: 'Yield Rise' },
    ],
    status: 'Phase 3 Active',
    districts: 34,
  },
  {
    id: 'swayamsevika',
    title: 'MEE SWAYAMSEVIKA',
    subtitle: 'Women Empowerment Mission',
    desc: 'Building network of 8,200+ women micro-entrepreneurs through skill training, financial inclusion, and market access.',
    image: 'https://images.pexels.com/photos/3184294/pexels-photo-3184294.jpeg?auto=compress&cs=tinysrgb&w=900',
    gradient: 'from-blue-600 to-indigo-700',
    stats: [
      { value: '32,450+', label: 'Women' },
      { value: '8,200+', label: 'Enterprises' },
      { value: '156%', label: 'Income Rise' },
    ],
    status: 'Operational',
    districts: 89,
  },
];

const otherProjects = [
  { id: 'emergency', title: 'Emergency QR Network', status: '24/7 Active' },
  { id: 'drones', title: 'Drone Services Wing', status: 'Operational' },
  { id: 'training', title: 'Training & EDP', status: 'Ongoing' },
  { id: 'startup', title: 'Rural Startup Mission', status: 'Active' },
];

const FeaturedProjects = () => {
  return (
    <section className="py-28 md:py-40 lg:py-48 bg-gradient-to-b from-white via-primary-50/30 to-white">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16 md:mb-20"
        >
          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2.5 px-5 py-2 bg-primary-900 text-white rounded-full text-xs font-bold uppercase tracking-wider mb-7"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Featured Programmes</span>
            </motion.div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-900 tracking-tight leading-[1.1]">
              Flagship
              <span className="block text-primary-600">Initiatives</span>
            </h2>
          </div>
          <Link
            to="/projects"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-primary-900 text-white font-bold rounded-lg hover:bg-primary-800 transition-colors shrink-0 shadow-lg shadow-primary-900/20"
          >
            <span className="text-sm uppercase tracking-wider">All Programmes</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Featured Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          {featured.map((proj, i) => (
            <motion.div
              key={proj.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -8 }}
              className="group relative bg-white border border-primary-100/80 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary-900/10 transition-all duration-500"
            >
              {/* Image */}
              <div className="relative h-64 md:h-72 overflow-hidden">
                <motion.img
                  src={proj.image}
                  alt={proj.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${proj.gradient} opacity-60 group-hover:opacity-70 transition-opacity duration-500`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Overlay content */}
                <div className="absolute top-5 left-5 flex items-center gap-3">
                  <div className="px-4 py-2 bg-white/95 backdrop-blur-sm rounded-full text-xs font-bold text-primary-900 uppercase tracking-wide shadow-sm">
                    {proj.status}
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-7">
                  <div className="text-[11px] text-white/80 uppercase tracking-widest font-semibold mb-2">{proj.subtitle}</div>
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight">{proj.title}</h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-7">
                <p className="text-primary-600 leading-relaxed mb-6">{proj.desc}</p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {proj.stats.map((s, idx) => (
                    <motion.div
                      key={s.label}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + idx * 0.1 }}
                      className="text-center p-4 bg-primary-50/80 rounded-xl border border-primary-100/50"
                    >
                      <div className="text-xl md:text-2xl font-bold text-primary-900">{s.value}</div>
                      <div className="text-[10px] text-primary-500 uppercase tracking-wider font-medium mt-1">{s.label}</div>
                    </motion.div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-primary-100">
                  <div className="flex items-center gap-2 text-xs text-primary-500 font-medium">
                    <MapPin className="w-4 h-4" />
                    <span>{proj.districts} Districts</span>
                  </div>
                  <Link
                    to={`/projects#${proj.id}`}
                    className="inline-flex items-center gap-2 text-sm font-bold text-primary-900 hover:text-primary-700 transition-colors group/link"
                  >
                    <span>Explore</span>
                    <motion.span whileHover={{ x: 3 }} transition={{ duration: 0.2 }}>
                      <ArrowRight className="w-4 h-4" />
                    </motion.span>
                  </Link>
                </div>
              </div>

              {/* Bottom accent */}
              <div className={`absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r ${proj.gradient}`} />
            </motion.div>
          ))}
        </div>

        {/* Other Projects */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {otherProjects.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -4 }}
            >
              <Link
                to={`/projects#${p.id}`}
                className="block bg-white border border-primary-100/80 p-6 rounded-xl hover:border-primary-300 hover:shadow-lg transition-all duration-300 group h-full"
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-2 h-2 rounded-full bg-accent-green-500 animate-pulse" />
                  <span className="text-[10px] text-primary-500 uppercase tracking-wider font-semibold">{p.status}</span>
                </div>
                <h4 className="font-bold text-primary-900 group-hover:text-primary-700 transition-colors text-base">
                  {p.title}
                </h4>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProjects;
