import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Rocket, Users, TrendingUp, MapPin } from 'lucide-react';

const stats = [
  { icon: Users, value: '250+', label: 'Startups Funded' },
  { icon: TrendingUp, value: '₹2.4 Cr', label: 'Capital Disbursed' },
  { icon: MapPin, value: '18', label: 'Districts Active' },
];

const StartupFundCTA = () => {
  return (
    <section className="py-20 md:py-24 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-saffron-500 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-[1440px] mx-auto px-6 lg:px-16">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left: Content + CTA */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2.5 px-4 py-2 bg-accent-saffron-500/15 border border-accent-saffron-400/30 rounded-full text-xs font-bold uppercase tracking-wider text-accent-saffron-400 mb-6"
            >
              <Rocket className="w-4 h-4" />
              <span>Primary Programme</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight mb-4"
            >
              Startup Fund
              <span className="block text-accent-saffron-400 mt-1">Rural Entrepreneurship Mission</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg text-primary-200 max-w-2xl leading-relaxed mb-8"
            >
              Seed funding, mentorship, and market access for rural innovators building
              sustainable enterprises across Maharashtra. From idea to impact.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <Link
                to="/services"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-accent-saffron-500 text-primary-950 font-bold rounded-lg hover:bg-accent-saffron-400 transition-all shadow-xl"
              >
                <span className="text-sm uppercase tracking-wider">Apply for Startup Fund</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/projects#startup"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-white/10 text-white font-bold rounded-lg border-2 border-white/30 hover:bg-white/20 transition-all"
              >
                <span className="text-sm uppercase tracking-wider">Learn More</span>
              </Link>
            </motion.div>
          </div>

          {/* Right: Stats */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-3 gap-4"
            >
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="text-center p-5 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl"
                >
                  <stat.icon className="w-6 h-6 mx-auto text-accent-saffron-400 mb-2" />
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-[10px] text-primary-300 uppercase tracking-wider mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StartupFundCTA;
