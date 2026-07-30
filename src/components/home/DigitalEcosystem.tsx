import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Tractor,
  Users,
  QrCode,
  Plane,
  GraduationCap,
  Rocket,
  ArrowRight,
  TrendingUp,
  MapPin,
  Activity,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

const programmes = [
  {
    id: 'maha-agri',
    title: 'MAHA-AGRI PROJECT',
    subtitle: 'Agricultural Transformation',
    description: 'Precision farming revolution across 45,000+ hectares with drone monitoring, soil sensors, AI-powered crop advisory, and market linkage for 89,340+ farmers.',
    image: 'https://images.pexels.com/photos/2889440/pexels-photo-2889440.jpeg?auto=compress&cs=tinysrgb&w=800',
    icon: Tractor,
    gradient: 'from-green-600 to-emerald-700',
    color: 'emerald',
    metrics: [
      { value: '89,340+', label: 'Farmers Enrolled' },
      { value: '45,000+', label: 'Hectares Covered' },
      { value: '47%', label: 'Yield Increase' },
    ],
    status: 'Phase 3 Active',
    districts: 34,
    launchYear: 2019,
  },
  {
    id: 'swayamsevika',
    title: 'MEE SWAYAMSEVIKA',
    subtitle: 'Women Empowerment',
    description: 'Building network of 8,200+ women micro-entrepreneurs through skill training, financial inclusion, market access, and leadership development programs.',
    image: 'https://images.pexels.com/photos/3184294/pexels-photo-3184294.jpeg?auto=compress&cs=tinysrgb&w=800',
    icon: Users,
    gradient: 'from-blue-600 to-indigo-700',
    color: 'indigo',
    metrics: [
      { value: '32,450+', label: 'Women Trained' },
      { value: '8,200+', label: 'Enterprises Started' },
      { value: '156%', label: 'Average Income Rise' },
    ],
    status: 'Active',
    districts: 89,
    launchYear: 2019,
  },
  {
    id: 'emergency-qr',
    title: 'EMERGENCY HELP QR',
    subtitle: 'Citizen Safety Network',
    description: 'Quick response system with 12,500+ QR points across public spaces connecting citizens to emergency services, medical aid, and women safety helpline.',
    image: 'https://images.pexels.com/photos/4056822/pexels-photo-4056822.jpeg?auto=compress&cs=tinysrgb&w=800',
    icon: QrCode,
    gradient: 'from-amber-500 to-orange-600',
    color: 'amber',
    metrics: [
      { value: '12,500+', label: 'QR Points' },
      { value: '4,200+', label: 'Emergencies Handled' },
      { value: '<8 min', label: 'Response Time' },
    ],
    status: '24/7 Operational',
    districts: 156,
    launchYear: 2022,
  },
  {
    id: 'drone-services',
    title: 'DRONE SERVICES WING',
    subtitle: 'Technology Innovation',
    description: 'Fleet of 47 agricultural drones for crop monitoring, precision spraying, land survey, disaster assessment, and NDVI analysis across rural Maharashtra.',
    image: 'https://images.pexels.com/photos/4425873/pexels-photo-4425873.jpeg?auto=compress&cs=tinysrgb&w=800',
    icon: Plane,
    gradient: 'from-slate-600 to-slate-800',
    color: 'slate',
    metrics: [
      { value: '47', label: 'Drone Fleet' },
      { value: '125,000+', label: 'Hectares Surveyed' },
      { value: '60%', label: 'Cost Reduction' },
    ],
    status: 'Active',
    districts: 112,
    launchYear: 2021,
  },
  {
    id: 'training-edp',
    title: 'TRAINING & EDP',
    subtitle: 'Skill Development Mission',
    description: 'Comprehensive training and Entrepreneurship Development Programs for rural youth, farmers, and women focusing on employability and self-employment.',
    image: 'https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?auto=compress&cs=tinysrgb&w=800',
    icon: GraduationCap,
    gradient: 'from-teal-600 to-cyan-700',
    color: 'teal',
    metrics: [
      { value: '324+', label: 'Programs Conducted' },
      { value: '45,000+', label: 'Youth Trained' },
      { value: '78%', label: 'Placement Rate' },
    ],
    status: 'Ongoing',
    districts: 156,
    launchYear: 2017,
  },
  {
    id: 'rural-startup',
    title: 'RURAL ENTREPRENEURSHIP',
    subtitle: 'Startup Ecosystem Builder',
    description: 'Fostering rural entrepreneurship through incubation support, mentor network, funding access, and market connectivity for tier-2 and tier-3 innovators.',
    image: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=800',
    icon: Rocket,
    gradient: 'from-purple-600 to-violet-700',
    color: 'purple',
    metrics: [
      { value: '234+', label: 'Startups Incubated' },
      { value: '8,500+', label: 'Jobs Created' },
      { value: '₹45Cr', label: 'Funding Facilitated' },
    ],
    status: 'Active',
    districts: 78,
    launchYear: 2020,
  },
];

const DigitalEcosystem = () => {
  return (
    <section className="py-28 md:py-36 lg:py-44 bg-gradient-to-b from-white via-primary-50/30 to-white">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16">
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
            <Activity className="w-4 h-4" />
            <span>Flagship Programmes</span>
          </motion.div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-900 tracking-tight mb-7 leading-[1.1]">
            Integrated Digital
            <span className="block text-primary-600">Ecosystem</span>
          </h2>
          <p className="text-lg md:text-xl text-primary-600 max-w-3xl mx-auto leading-relaxed">
            Six comprehensive programmes driving sustainable transformation across Maharashtra.
            Each initiative is designed for scalability, measurable outcomes, and community ownership.
          </p>
        </motion.div>

        {/* Programmes Grid - Enterprise Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7 lg:gap-8">
          {programmes.map((prog, index) => (
            <motion.div
              key={prog.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -6 }}
              className="group relative bg-white border border-primary-100/80 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-primary-900/10 transition-all duration-500"
            >
              {/* Card Header with Image */}
              <div className="relative h-52 overflow-hidden">
                <motion.img
                  src={prog.image}
                  alt={prog.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${prog.gradient} opacity-70 group-hover:opacity-80 transition-opacity duration-500`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                {/* Header Content */}
                <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-11 h-11 bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                      <prog.icon className="w-5.5 h-5.5 text-white" />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/15 backdrop-blur-md rounded-full border border-white/20">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-2 h-2 bg-accent-green-400 rounded-full"
                      />
                      <span className="text-xs font-semibold text-white">{prog.status}</span>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-white/15 backdrop-blur-md rounded-full text-white text-xs font-medium border border-white/20">
                    Est. {prog.launchYear}
                  </div>
                </div>

                {/* Title at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-5 pt-10 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="text-[11px] text-white/80 font-semibold uppercase tracking-widest mb-1">
                    {prog.subtitle}
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white leading-tight">
                    {prog.title}
                  </h3>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6">
                <p className="text-sm text-primary-600 leading-relaxed mb-6 line-clamp-3">
                  {prog.description}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {prog.metrics.map((m, i) => (
                    <motion.div
                      key={m.label}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="text-center p-3 bg-primary-50/80 rounded-xl border border-primary-100/50"
                    >
                      <div className="text-lg md:text-xl font-bold text-primary-900">{m.value}</div>
                      <div className="text-[10px] text-primary-500 uppercase tracking-wider leading-tight mt-0.5">{m.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-5 border-t border-primary-100">
                  <div className="flex items-center gap-2 text-xs text-primary-500 font-medium">
                    <MapPin className="w-3.5 h-3.5" />
                    {prog.districts} Districts
                  </div>
                  <Link
                    to={`/projects#${prog.id}`}
                    className="inline-flex items-center gap-2 text-sm font-bold text-primary-900 hover:text-primary-700 transition-colors group/link"
                  >
                    <span>Explore</span>
                    <motion.span
                      whileHover={{ x: 3 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </motion.span>
                  </Link>
                </div>
              </div>

              {/* Bottom Accent Line */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${prog.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
            </motion.div>
          ))}
        </div>

        {/* View All Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center mt-16 md:mt-20"
        >
          <Link
            to="/projects"
            className="inline-flex items-center gap-3 px-10 py-4 bg-primary-900 text-white font-bold rounded-lg hover:bg-primary-800 transition-colors shadow-lg shadow-primary-900/20"
          >
            <span className="text-sm uppercase tracking-wider">View All Programmes</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default DigitalEcosystem;
