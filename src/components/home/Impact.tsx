import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Tractor,
  Users,
  GraduationCap,
  HeartPulse,
  MapPin,
  Building2,
  TrendingUp,
  ArrowUpRight,
  Award,
  LineChart,
  CheckCircle2,
  Shield,
  Globe,
} from 'lucide-react';

interface Metric {
  icon: React.ElementType;
  value: number;
  suffix: string;
  label: string;
  growth: string;
  desc: string;
  accent: string;
}

const metrics: Metric[] = [
  { icon: Tractor, value: 89340, suffix: '+', label: 'Farmers', growth: '+23%', desc: 'Small & marginal farmers', accent: '#16a34a' },
  { icon: Users, value: 32450, suffix: '+', label: 'Women', growth: '+45%', desc: 'Women trained & employed', accent: '#334e68' },
  { icon: GraduationCap, value: 45000, suffix: '+', label: 'Youth', growth: '+32%', desc: 'Skill development beneficiaries', accent: '#e68000' },
  { icon: HeartPulse, value: 125000, suffix: '+', label: 'Health', growth: '+18%', desc: 'Health services delivered', accent: '#16a34a' },
  { icon: MapPin, value: 2847, suffix: '+', label: 'Villages', growth: '+15%', desc: 'Villages with active presence', accent: '#334e68' },
  { icon: Building2, value: 156, suffix: '', label: 'Districts', growth: '+8%', desc: 'Districts operational', accent: '#e68000' },
];

const Impact = () => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (animated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !animated) {
          setAnimated(true);
          runAnimation();
        }
      },
      { threshold: 0.2 }
    );

    const el = document.getElementById('impact-metrics');
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [animated]);

  const runAnimation = () => {
    const duration = 2600;
    const steps = 80;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const ease = 1 - Math.pow(1 - progress, 4);

      setCounts({
        farmers: Math.floor(metrics[0].value * ease),
        women: Math.floor(metrics[1].value * ease),
        youth: Math.floor(metrics[2].value * ease),
        health: Math.floor(metrics[3].value * ease),
        villages: Math.floor(metrics[4].value * ease),
        districts: Math.floor(metrics[5].value * ease),
      });

      if (step >= steps) clearInterval(timer);
    }, interval);
  };

  const getValue = (idx: number) => {
    const keys = ['farmers', 'women', 'youth', 'health', 'villages', 'districts'];
    return counts[keys[idx]] || 0;
  };

  const formatNum = (n: number) => {
    if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  return (
    <section id="impact-metrics" className="py-28 md:py-40 lg:py-48 bg-white relative">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-50/30 via-white to-primary-50/20" />

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
            <LineChart className="w-4 h-4" />
            <span>Transparent Results</span>
          </motion.div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-900 tracking-tight mb-7 leading-[1.1]">
            Measurable
            <span className="block text-primary-600">Impact</span>
          </h2>
          <p className="text-lg md:text-xl text-primary-600 max-w-3xl mx-auto leading-relaxed">
            Every number represents a life transformed. We maintain complete transparency
            in reporting outcomes and continuously track progress against national goals.
          </p>
        </motion.div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 lg:gap-6 mb-16">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -6 }}
              className="relative bg-white border border-primary-100/80 p-6 lg:p-7 text-center hover:border-primary-300 hover:shadow-xl hover:shadow-primary-900/5 transition-all duration-400 rounded-xl group"
            >
              <div
                className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-5 shadow-sm"
                style={{ backgroundColor: `${m.accent}12` }}
              >
                <m.icon className="w-5.5 h-5.5" style={{ color: m.accent }} />
              </div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-900 mb-1.5">
                {formatNum(getValue(i))}{m.suffix}
              </div>
              <div className="text-[11px] text-primary-500 uppercase tracking-wider font-semibold mb-3">{m.label}</div>
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ backgroundColor: `${m.accent}15`, color: m.accent }}
              >
                <ArrowUpRight className="w-3 h-3" />
                {m.growth}
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Summary Banner */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 rounded-2xl overflow-hidden shadow-xl"
        >
          <div className="grid md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-primary-700/60">
            <div className="p-8 md:p-10 lg:p-12 text-center">
              <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3">₹125 Cr</div>
              <div className="text-sm text-primary-300 uppercase tracking-wider font-medium">Total Investment</div>
              <div className="text-xs text-primary-400 mt-1">Rural Development</div>
            </div>
            <div className="p-8 md:p-10 lg:p-12 text-center">
              <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3">11+</div>
              <div className="text-sm text-primary-300 uppercase tracking-wider font-medium">Years Active</div>
              <div className="text-xs text-primary-400 mt-1">Since 2015</div>
            </div>
            <div className="p-8 md:p-10 lg:p-12 text-center">
              <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3">8.5 Lakh+</div>
              <div className="text-sm text-primary-300 uppercase tracking-wider font-medium">Lives Impacted</div>
              <div className="text-xs text-primary-400 mt-1">Direct Beneficiaries</div>
            </div>
            <div className="p-8 md:p-10 lg:p-12 text-center flex items-center justify-center">
              <div className="text-center">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-accent-green-500/20 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-accent-green-400" />
                  </div>
                  <div className="w-12 h-12 rounded-full bg-accent-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-accent-green-400" />
                  </div>
                </div>
                <div className="text-sm text-primary-200 font-semibold leading-relaxed">
                  Independently Audited<br />Annual Reports
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Trust Statements */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-8 mt-10 text-sm text-primary-600"
        >
          {['Project-wise tracking', 'Quarterly reports', 'External audits', 'Public dashboards'].map((text) => (
            <div key={text} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-green-500" />
              <span>{text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Impact;
