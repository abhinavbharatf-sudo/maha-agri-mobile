import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield,
  CheckCircle2,
  Award,
  FileText,
  Download,
  Calendar,
  ExternalLink,
  ArrowRight,
  Building2,
  Users,
  TrendingUp,
} from 'lucide-react';

const badges = [
  {
    id: 'section8',
    name: 'Section 8 Company',
    description: 'Registered under Companies Act, 2013',
    number: 'U85300MH2015NPL280123',
    verified: true,
    date: '2015-06-15',
  },
  {
    id: 'ngo-darpan',
    name: 'NGO Darpan',
    description: 'NITI Aayog Registration',
    number: 'MH/2015/0098765',
    verified: true,
    date: '2015-08-20',
  },
  {
    id: 'udyam',
    name: 'Udyam Registration',
    description: 'MSME Registered Enterprise',
    number: 'UDYAM-MH-12-0045678',
    verified: true,
    date: '2020-07-01',
  },
  {
    id: '12a',
    name: '12A Certificate',
    description: 'Income Tax Exemption',
    number: 'CIT/12A/2015-16/4567',
    verified: true,
    date: '2016-03-10',
  },
  {
    id: '80g',
    name: '80G Certificate',
    description: 'Donation Tax Benefits',
    number: 'CIT/80G/2016-17/1234',
    verified: true,
    date: '2017-04-05',
  },
  {
    id: 'csr',
    name: 'CSR Eligible',
    description: 'Corporate CSR Funding Eligible',
    number: 'CSR/MH/2018/567',
    verified: true,
    date: '2018-01-15',
  },
];

const financials = [
  { year: '2023-24', income: 'INR 42.5 Cr', expenditure: 'INR 38.2 Cr', beneficiaries: '8.5 Lakh', report: '#' },
  { year: '2022-23', income: 'INR 35.8 Cr', expenditure: 'INR 32.1 Cr', beneficiaries: '7.2 Lakh', report: '#' },
  { year: '2021-22', income: 'INR 28.4 Cr', expenditure: 'INR 25.6 Cr', beneficiaries: '5.8 Lakh', report: '#' },
  { year: '2020-21', income: 'INR 22.1 Cr', expenditure: 'INR 19.8 Cr', beneficiaries: '4.5 Lakh', report: '#' },
];

const policies = [
  { title: 'Code of Conduct', date: '2023-01-15', type: 'PDF' },
  { title: 'Child Protection Policy', date: '2022-06-20', type: 'PDF' },
  { title: 'Anti-Corruption Policy', date: '2023-03-10', type: 'PDF' },
  { title: 'Whistleblower Protection', date: '2022-09-05', type: 'PDF' },
  { title: 'Data Protection Policy', date: '2023-06-01', type: 'PDF' },
  { title: 'Financial Management Policy', date: '2022-12-15', type: 'PDF' },
];

const Transparency = () => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 text-white py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
        <div className="container-premium relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              Transparency & Compliance
            </div>
            <h1 className="text-display-2 font-bold mb-6">
              Committed to
              <span className="block text-primary-200">Full Transparency</span>
            </h1>
            <p className="text-xl text-primary-200 leading-relaxed">
              We believe in complete accountability. All registrations, certifications,
              financial statements, and policies are publicly accessible.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Verification Badges */}
      <section className="section-padding bg-white">
        <div className="container-premium">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 rounded-full text-sm font-medium text-primary-700 mb-4">
              <Award className="w-4 h-4" />
              Verifications & Certifications
            </div>
            <h2 className="text-heading-1 font-bold text-primary-900 mb-4">
              Officially Verified
            </h2>
            <p className="text-lg text-primary-600 max-w-2xl mx-auto">
              All legal compliances and certifications verified by respective government authorities
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {badges.map((badge, index) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl border border-primary-100 p-6 hover:shadow-card transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-accent-green-600" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-accent-green-100 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-green-500" />
                    <span className="text-xs font-medium text-accent-green-700">Verified</span>
                  </div>
                </div>
                <h4 className="font-bold text-primary-900 mb-1">{badge.name}</h4>
                <p className="text-sm text-primary-600 mb-3">{badge.description}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-primary-500">Registration Number</span>
                    <span className="text-primary-900 font-mono text-xs">{badge.number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-500">Valid From</span>
                    <span className="text-primary-700">{formatDate(badge.date)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Financial Summary */}
      <section className="section-padding bg-primary-50">
        <div className="container-premium">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm font-medium text-primary-700 mb-4 shadow-sm">
              <TrendingUp className="w-4 h-4" />
              Financial Transparency
            </div>
            <h2 className="text-heading-1 font-bold text-primary-900 mb-4">
              Financial Overview
            </h2>
            <p className="text-lg text-primary-600 max-w-2xl">
              Annual financial summary showing income, expenditure, and beneficiary reach
            </p>
          </motion.div>

          <div className="bg-white rounded-xl overflow-hidden border border-primary-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary-900 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold">Financial Year</th>
                    <th className="px-6 py-4 text-left font-semibold">Total Income</th>
                    <th className="px-6 py-4 text-left font-semibold">Expenditure</th>
                    <th className="px-6 py-4 text-left font-semibold">Beneficiaries Reached</th>
                    <th className="px-6 py-4 text-left font-semibold">Annual Report</th>
                  </tr>
                </thead>
                <tbody>
                  {financials.map((row, index) => (
                    <motion.tr
                      key={row.year}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="border-b border-primary-100 last:border-0 hover:bg-primary-50 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-primary-900">{row.year}</td>
                      <td className="px-6 py-4 text-primary-700">{row.income}</td>
                      <td className="px-6 py-4 text-primary-700">{row.expenditure}</td>
                      <td className="px-6 py-4 text-primary-700">{row.beneficiaries}</td>
                      <td className="px-6 py-4">
                        <a href={row.report} className="inline-flex items-center gap-1 text-sm font-medium text-primary-900 hover:text-primary-700">
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Policies */}
      <section className="section-padding bg-white">
        <div className="container-premium">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 rounded-full text-sm font-medium text-primary-700 mb-4">
              <FileText className="w-4 h-4" />
              Organizational Policies
            </div>
            <h2 className="text-heading-1 font-bold text-primary-900">
              Our Policies
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {policies.map((policy, index) => (
              <motion.div
                key={policy.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors group"
              >
                <div>
                  <h4 className="font-semibold text-primary-900">{policy.title}</h4>
                  <span className="text-xs text-primary-500">{formatDate(policy.date)} | {policy.type}</span>
                </div>
                <button className="p-2 rounded-lg hover:bg-primary-200 transition-colors">
                  <Download className="w-4 h-4 text-primary-600" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Governance */}
      <section className="section-padding bg-primary-900 text-white">
        <div className="container-premium">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-heading-1 font-bold mb-4">
              Governance Structure
            </h2>
            <p className="text-lg text-primary-200 max-w-2xl mx-auto">
              Our organization is governed by a distinguished board with extensive experience
              in development, finance, and public policy.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Board of Trustees', count: 7, desc: 'Strategic oversight and governance' },
              { title: 'Executive Committee', count: 5, desc: 'Operational management' },
              { title: 'Advisory Board', count: 12, desc: 'Domain expertise and guidance' },
            ].map((body, index) => (
              <motion.div
                key={body.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center"
              >
                <div className="w-14 h-14 mx-auto rounded-xl bg-white/10 flex items-center justify-center mb-4">
                  <Users className="w-7 h-7" />
                </div>
                <h4 className="font-bold mb-2">{body.title}</h4>
                <div className="text-3xl font-bold text-primary-200 mb-2">{body.count}</div>
                <p className="text-sm text-primary-300">{body.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="section-padding bg-primary-50">
        <div className="container-premium text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-heading-1 font-bold text-primary-900 mb-4">
              Questions About Our Transparency?
            </h2>
            <p className="text-lg text-primary-600 max-w-2xl mx-auto mb-8">
              We welcome queries about our financial practices, governance, or impact reports.
              Our team is ready to provide detailed information.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/contact" className="btn-primary">
                Contact Our Team
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <a href="mailto:transparency@abhinavbharatfoundation.org" className="btn-secondary">
                <ExternalLink className="w-4 h-4 mr-2" />
                Email Transparency Team
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Transparency;
