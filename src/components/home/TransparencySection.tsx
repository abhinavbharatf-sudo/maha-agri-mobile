import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, CheckCircle2, Award, Download, FileText, ExternalLink } from 'lucide-react';

const registrations = [
  { name: 'Section 8 Company', id: 'U85300MH2015NPL280123', year: '2015' },
  { name: 'NGO Darpan', id: 'MH/2015/0098765', year: '2015' },
  { name: 'Udyam MSME', id: 'UDYAM-MH-12-0045678', year: '2020' },
  { name: '12A Certificate', id: 'CIT/12A/2015-16/4567', year: '2016' },
  { name: '80G Certificate', id: 'CIT/80G/2016-17/1234', year: '2017' },
  { name: 'CSR Eligible', id: 'CSR/MH/2018/567', year: '2018' },
];

const highlights = [
  'Annual audited financial statements',
  'Project-wise expenditure tracking',
  'Independent external audits',
  'Publicly accessible reports',
];

const TransparencySection = () => {
  return (
    <section className="py-28 md:py-40 lg:py-48 bg-gradient-to-b from-white via-primary-50/30 to-white">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2.5 px-5 py-2 bg-primary-900 text-white rounded-full text-xs font-bold uppercase tracking-wider mb-8"
            >
              <Shield className="w-4 h-4" />
              <span>Trust & Accountability</span>
            </motion.div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary-900 tracking-tight mb-7 leading-[1.1]">
              Fully Verified.
              <span className="block text-primary-600">Fully Transparent.</span>
            </h2>
            <p className="text-lg md:text-xl text-primary-600 leading-relaxed mb-10">
              Abhinav Bharat Foundation maintains the highest standards of governance.
              All registrations, certifications, and financial documents are publicly accessible.
            </p>

            <div className="space-y-5 mb-10">
              {highlights.map((h, i) => (
                <motion.div
                  key={h}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-6 h-6 rounded-lg bg-accent-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-green-600" />
                  </div>
                  <span className="text-primary-700 text-base font-medium">{h}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/transparency"
                className="inline-flex items-center gap-2.5 px-8 py-4 bg-primary-900 text-white font-bold rounded-lg hover:bg-primary-800 transition-colors shadow-lg shadow-primary-900/20"
              >
                <span className="text-sm uppercase tracking-wider">Transparency Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#"
                className="inline-flex items-center gap-2.5 px-8 py-4 border-2 border-primary-900 text-primary-900 font-bold rounded-lg hover:bg-primary-900 hover:text-white transition-all"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm uppercase tracking-wider">Annual Report</span>
              </a>
            </div>
          </motion.div>

          {/* Verification Cards */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="grid grid-cols-2 gap-5"
          >
            {registrations.map((reg, i) => (
              <motion.div
                key={reg.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -4 }}
                className="bg-white border border-primary-100/80 p-6 rounded-xl hover:border-primary-300 hover:shadow-xl hover:shadow-primary-900/5 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                    <Award className="w-5 h-5 text-primary-500 group-hover:text-primary-700 transition-colors" />
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-accent-green-50 rounded-full text-xs font-bold text-accent-green-700">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                      className="w-1.5 h-1.5 rounded-full bg-accent-green-500"
                    />
                    Verified
                  </div>
                </div>
                <h4 className="font-bold text-primary-900 mb-1.5 group-hover:text-primary-700 transition-colors text-base">
                  {reg.name}
                </h4>
                <p className="text-xs text-primary-500 font-medium">Since {reg.year}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TransparencySection;
