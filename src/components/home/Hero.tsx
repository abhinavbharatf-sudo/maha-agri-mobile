import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import {
  ArrowRight,
  Play,
  MapPin,
  Users,
  Tractor,
  GraduationCap,
  Plane,
  Leaf,
  HeartPulse,
  Building2,
  Activity,
  CheckCircle2,
  Shield,
  TrendingUp,
  Globe,
  Wifi,
  Clock,
  Zap,
  Award,
} from 'lucide-react';

const Hero = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const [liveData, setLiveData] = useState({
    projects: 0,
    districts: 0,
    villages: 0,
    volunteers: 0,
    farmers: 0,
    training: 0,
    todayActivity: 0,
  });

  const targets = {
    projects: 24,
    districts: 156,
    villages: 2847,
    volunteers: 15420,
    farmers: 89340,
    training: 324,
    todayActivity: 847,
  };

  useEffect(() => {
    const duration = 3000;
    const steps = 100;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const ease = 1 - Math.pow(1 - progress, 4);

      setLiveData({
        projects: Math.floor(targets.projects * ease),
        districts: Math.floor(targets.districts * ease),
        villages: Math.floor(targets.villages * ease),
        volunteers: Math.floor(targets.volunteers * ease),
        farmers: Math.floor(targets.farmers * ease),
        training: Math.floor(targets.training * ease),
        todayActivity: Math.floor(targets.todayActivity * ease),
      });

      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const formatNum = (n: number) => {
    if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  return (
    <section ref={ref} className="relative min-h-screen overflow-hidden bg-primary-950">
      {/* Cinematic Digital Painting Background */}
      <motion.div style={{ y, opacity }} className="absolute inset-0">
        {/* Deep sky gradient - twilight to dawn */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#061224] via-[#132744] to-[#1e3a5f]" />

        {/* Distant mountain ranges of Maharashtra */}
        <svg className="absolute bottom-0 left-0 right-0 h-[50%] opacity-40" viewBox="0 0 1440 400" preserveAspectRatio="none">
          <defs>
            <linearGradient id="mountainGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a3a5c" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0d1f33" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="mountainGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2d4a6f" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#132744" stopOpacity="1" />
            </linearGradient>
          </defs>
          {/* Far mountains */}
          <path d="M0,280 Q360,180 720,220 T1440,180 V400 H0 Z" fill="url(#mountainGrad1)" />
          {/* Mid mountains */}
          <path d="M0,320 Q240,220 480,280 T960,240 T1440,280 V400 H0 Z" fill="url(#mountainGrad2)" />
        </svg>

        {/* Dawn light - rising sun representing hope */}
        <div className="absolute top-[20%] right-[25%] w-[600px] h-[600px]">
          {/* Sun glow layers */}
          <div className="absolute inset-0 rounded-full bg-gradient-radial from-amber-400/15 via-orange-300/8 to-transparent blur-3xl" />
          <div className="absolute inset-[15%] rounded-full bg-gradient-radial from-amber-300/25 via-amber-200/10 to-transparent blur-2xl" />
          {/* Sun core */}
          <div className="absolute inset-[35%] rounded-full bg-gradient-radial from-amber-200/40 to-transparent" />
        </div>

        {/* Agricultural land gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-[35%]">
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/30 via-green-800/15 to-transparent" />
          {/* Field pattern */}
          <svg className="absolute inset-0 opacity-15" viewBox="0 0 1440 200" preserveAspectRatio="none">
            {[...Array(15)].map((_, i) => (
              <line
                key={i}
                x1="0"
                y1={15 + i * 13}
                x2="1440"
                y2={10 + i * 13}
                stroke="#4ade80"
                strokeWidth="0.8"
                opacity={0.4 + i * 0.04}
              />
            ))}
          </svg>
        </div>

        {/* Drone flight paths - technology innovation */}
        <svg className="absolute top-[25%] left-0 w-full h-[300px] opacity-25">
          <defs>
            <linearGradient id="flightLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
              <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,100 Q300,50 600,90 T1100,70 T1440,100" stroke="url(#flightLine)" strokeWidth="1.5" fill="none" />
          <path d="M0,180 Q400,120 700,160 T1200,130 T1440,150" stroke="url(#flightLine)" strokeWidth="1" fill="none" opacity="0.5" />
          {/* Drone markers */}
          <circle cx="400" cy="75" r="3" fill="#60a5fa" opacity="0.6" />
          <circle cx="900" cy="80" r="3" fill="#60a5fa" opacity="0.6" />
        </svg>

        {/* Healthcare symbol - subtle */}
        <div className="absolute top-[45%] right-[8%] opacity-20">
          <div className="w-20 h-20 relative">
            <div className="absolute top-1/2 left-0 right-0 h-5 bg-emerald-400 rounded -translate-y-1/2" />
            <div className="absolute left-1/2 top-0 bottom-0 w-5 bg-emerald-400 rounded -translate-x-1/2" />
          </div>
        </div>

        {/* Light particles */}
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/25 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 60}%`,
            }}
            animate={{
              y: [0, -25, 0],
              opacity: [0.15, 0.5, 0.15],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}

        {/* Atmospheric overlays */}
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-primary-950/60 to-transparent" />
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-16 pt-44 md:pt-52 lg:pt-56 pb-24">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Content - 7 columns */}
          <div className="lg:col-span-7 space-y-8 lg:space-y-10">
            {/* Government Badge */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-3"
            >
              <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-sm">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">National Mission Platform</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-sm border border-emerald-500/30">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-300 font-medium">Active Since 2015</span>
              </div>
            </motion.div>

            {/* Main Headline - Premium Typography */}
            <motion.div
              initial={{ opacity: 0, y: 35 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] xl:text-8xl font-bold text-white leading-[0.95] tracking-tighter">
                <span className="block">Empowering</span>
                <span className="block text-primary-300 mt-1">Rural</span>
                <span className="block mt-1 relative inline-block">
                  Maharashtra
                  <motion.div
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute -bottom-2 lg:-bottom-3 left-0 right-0 h-1.5 lg:h-2 bg-gradient-to-r from-emerald-500 via-emerald-400 to-transparent rounded-full"
                  />
                </span>
              </h1>

              <p className="text-lg md:text-xl lg:text-2xl text-primary-200 max-w-2xl leading-relaxed font-light tracking-wide">
                A transformative mission driving agricultural innovation, women empowerment,
                and sustainable rural prosperity across Maharashtra's 156 districts.
              </p>
            </motion.div>

            {/* Quick Statistics */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-4 gap-4 pt-4"
            >
              {[
                { value: liveData.projects, suffix: '+', label: 'Projects' },
                { value: liveData.districts, suffix: '', label: 'Districts' },
                { value: formatNum(liveData.villages), suffix: '+', label: 'Villages' },
                { value: formatNum(liveData.farmers), suffix: '+', label: 'Farmers' },
              ].map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  className="text-center p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-sm hover:bg-white/10 transition-colors"
                >
                  <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight">
                    {stat.value}{stat.suffix}
                  </div>
                  <div className="text-[11px] md:text-xs text-primary-400 uppercase tracking-wider mt-1 font-medium">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap gap-4 pt-2"
            >
              <Link
                to="/services"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-primary-900 font-semibold rounded-sm hover:bg-primary-50 transition-all shadow-xl hover:shadow-2xl"
              >
                <span className="text-sm uppercase tracking-wider">Access Services</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/projects"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-transparent text-white font-semibold rounded-sm border-2 border-white/40 hover:bg-white/10 hover:border-white/60 transition-all"
              >
                <Play className="w-5 h-5" />
                <span className="text-sm uppercase tracking-wider">Explore Programmes</span>
              </Link>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="flex flex-wrap items-center gap-6 pt-4 text-sm text-primary-300"
            >
              {['Section 8 Company', 'NGO Darpan Verified', '12A & 80G Certified', 'CSR Eligible'].map((text) => (
                <div key={text} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium">{text}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right Side - Mission Command Centre - 5 columns */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              {/* Glass Dashboard */}
              <div className="relative bg-white/[0.07] backdrop-blur-xl rounded-xl border border-white/15 shadow-2xl overflow-hidden">
                {/* Header Bar */}
                <div className="relative px-5 py-3.5 bg-gradient-to-r from-primary-800/60 to-primary-900/60 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                        <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-75" />
                      </div>
                      <span className="text-xs font-semibold text-white uppercase tracking-wider">
                        Mission Control
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-primary-300">
                      <Wifi className="w-3.5 h-3.5" />
                      <span>Live</span>
                      <span className="text-primary-500">|</span>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Content */}
                <div className="relative p-5 space-y-4">
                  {/* Primary Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Building2, value: liveData.projects, suffix: '+', label: 'Active Projects', bg: 'bg-primary-700/30', trend: '+3 this month' },
                      { icon: MapPin, value: liveData.districts, suffix: '/288', label: 'Districts', bg: 'bg-emerald-600/25', trend: '54% of state' },
                      { icon: Users, value: formatNum(liveData.volunteers), suffix: '+', label: 'Volunteers', bg: 'bg-amber-500/20', trend: 'Expanding' },
                      { icon: Tractor, value: formatNum(liveData.farmers), suffix: '+', label: 'Farmers', bg: 'bg-emerald-600/25', trend: '+23% YoY' },
                    ].map((item, i) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        className={`${item.bg} p-4 rounded-lg border border-white/10`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <item.icon className="w-4 h-4 text-white/70" />
                          <span className="text-[10px] text-white/50 uppercase tracking-wider">{item.label}</span>
                        </div>
                        <div className="text-2xl font-bold text-white tracking-tight">
                          {item.value}{item.suffix}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-medium mt-0.5">{item.trend}</div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Secondary Metrics */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { icon: Globe, value: liveData.villages.toLocaleString(), label: 'Villages' },
                      { icon: GraduationCap, value: liveData.training, label: 'Trainings' },
                      { icon: Zap, value: liveData.todayActivity, label: 'Today' },
                    ].map((item, i) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 + i * 0.08 }}
                        className="bg-white/5 p-3 rounded-lg text-center border border-white/5"
                      >
                        <item.icon className="w-4 h-4 mx-auto text-white/50 mb-1" />
                        <div className="text-lg font-bold text-white">{item.value}</div>
                        <div className="text-[9px] text-white/40 uppercase tracking-wider">{item.label}</div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Mission Pillars */}
                  <div className="pt-2">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2 font-medium">
                      Mission Pillars
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {[
                        { icon: Tractor, label: 'Agri' },
                        { icon: Users, label: 'Women' },
                        { icon: GraduationCap, label: 'Skills' },
                        { icon: Plane, label: 'Drones' },
                        { icon: HeartPulse, label: 'Health' },
                        { icon: Leaf, label: 'Eco' },
                      ].map((p, i) => (
                        <motion.div
                          key={p.label}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.8 + i * 0.05 }}
                          className="flex flex-col items-center p-2 rounded bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <p.icon className="w-4 h-4 text-white/60" />
                          <span className="text-[8px] text-white/35 mt-1 uppercase">{p.label}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status Footer */}
                <div className="relative px-5 py-2.5 bg-gradient-to-r from-emerald-600/25 to-emerald-500/15 border-t border-white/10">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                        <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-50" />
                      </div>
                      <span className="text-white/80 font-medium">All Systems Operational</span>
                    </div>
                    <span className="text-white/35">Updated just now</span>
                  </div>
                </div>
              </div>

              {/* Floating Accent Badges */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="absolute -top-3 -right-3"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 rounded-sm shadow-lg"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-bold">+23% Growth</span>
                  </div>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="absolute -bottom-3 -left-3"
              >
                <motion.div
                  animate={{ y: [0, 5, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  className="bg-white text-primary-900 px-4 py-2 rounded-sm shadow-lg border border-primary-100"
                >
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-bold">11 Years Active</span>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-3"
        >
          <span className="text-[11px] text-primary-400 uppercase tracking-widest font-medium">Scroll to explore</span>
          <div className="w-6 h-10 border-2 border-primary-500/40 rounded-full flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 14, 0], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-3 bg-primary-400/60 rounded-full"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
