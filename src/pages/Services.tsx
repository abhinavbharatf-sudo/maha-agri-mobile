import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FileText,
  Leaf,
  HeartPulse,
  PhoneCall,
  GraduationCap,
  Users,
  Building2,
  QrCode,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
} from 'lucide-react';

const services = [
  {
    id: 'citizen',
    title: 'Citizen Services',
    description: 'Comprehensive support for rural citizens including document assistance, government scheme applications, and digital services access.',
    icon: FileText,
    color: 'primary',
    features: ['Document Assistance', 'Scheme Applications', 'Digital Services', 'Certificate Processing', 'Grievance Redressal', 'RTI Support'],
    availability: 'Mon-Sat, 9 AM - 6 PM',
    contact: '1800-123-456',
  },
  {
    id: 'agriculture',
    title: 'Agricultural Support',
    description: 'End-to-end support for farmers including soil testing, seed distribution, crop advisory, market linkage, and technology adoption.',
    icon: Leaf,
    color: 'accent-green',
    features: ['Soil Testing Labs', 'Seed Distribution', 'Crop Advisory', 'Market Linkage', 'PM-KISAN Help', 'Insurance Support'],
    availability: '24/7 Helpline',
    contact: '1800-123-457',
  },
  {
    id: 'health',
    title: 'Health Programs',
    description: 'Community health initiatives including medical camps, telemedicine, women & child health programs, and health awareness campaigns.',
    icon: HeartPulse,
    color: 'accent-saffron',
    features: ['Medical Camps', 'Telemedicine', 'Mother & Child Health', 'Health Awareness', 'Vaccination Drives', 'Eye Care Camps'],
    availability: '24/7 Emergency',
    contact: '1800-123-458',
  },
  {
    id: 'emergency',
    title: 'Emergency Help',
    description: 'Quick response emergency services through QR network, connecting citizens to medical, police, and fire services within 8 minutes.',
    icon: PhoneCall,
    color: 'accent-saffron',
    features: ['24/7 Helpline', 'QR Emergency Points', 'Ambulance Dispatch', 'Women Safety', 'Medical Emergency', 'Quick Response'],
    availability: '24/7',
    contact: '1800-123-459',
  },
  {
    id: 'training',
    title: 'Training & Skill Development',
    description: 'Skill training programs for youth, women, and farmers focusing on employability, entrepreneurship, and modern techniques.',
    icon: GraduationCap,
    color: 'primary',
    features: ['Technical Training', 'Soft Skills', 'Digital Literacy', 'Industry Certifications', 'Placement Support', 'Startup Mentoring'],
    availability: 'Multiple Batches',
    contact: '1800-123-460',
  },
  {
    id: 'women',
    title: 'Women Empowerment',
    description: 'Programs for women including SHG formation, skill training, financial literacy, micro-entrepreneurship, and leadership development.',
    icon: Users,
    color: 'primary',
    features: ['SHG Formation', 'Skill Training', 'Financial Literacy', 'Micro-entrepreneurship', 'Leadership Programs', 'Legal Aid'],
    availability: 'Mon-Sat, 9 AM - 6 PM',
    contact: '1800-123-461',
  },
];

const quickAccess = [
  { label: 'Apply for Scheme', icon: FileText, link: '#' },
  { label: 'Book Training', icon: GraduationCap, link: '#' },
  { label: 'Emergency QR', icon: QrCode, link: '#' },
  { label: 'Farmer Registration', icon: Leaf, link: '#' },
];

const Services = () => {
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
              <Building2 className="w-4 h-4" />
              Citizen Services
            </div>
            <h1 className="text-display-2 font-bold mb-6">
              Services for
              <span className="block text-primary-200">Every Citizen</span>
            </h1>
            <p className="text-xl text-primary-200 leading-relaxed">
              Access our comprehensive range of services designed to support farmers, women,
              youth, and every citizen of rural Maharashtra.
            </p>
          </motion.div>

          {/* Quick Access Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12"
          >
            {quickAccess.map((item, index) => (
              <Link
                key={item.label}
                to={item.link}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center gap-3 hover:bg-white/20 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium text-white">{item.label}</span>
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="section-padding bg-white">
        <div className="container-premium">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                id={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl border border-primary-100 p-6 hover:shadow-card-hover transition-all duration-300 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: service.color === 'accent-green' ? '#dcfce7' : service.color === 'accent-saffron' ? '#fff8f0' : '#f0f4f8',
                    }}
                  >
                    <service.icon
                      className="w-7 h-7"
                      style={{
                        color: service.color === 'accent-green' ? '#16a34a' : service.color === 'accent-saffron' ? '#e68000' : '#486581',
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-accent-green-100 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-accent-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-accent-green-700">Active</span>
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-primary-900 mb-2 group-hover:text-primary-700 transition-colors">
                  {service.title}
                </h3>
                <p className="text-primary-600 text-sm leading-relaxed mb-4">
                  {service.description}
                </p>

                {/* Features */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {service.features.slice(0, 4).map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-primary-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent-green-500" />
                      {feature}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-primary-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-primary-500">
                    <Clock className="w-4 h-4" />
                    {service.availability}
                  </div>
                  <a
                    href={`tel:${service.contact}`}
                    className="flex items-center gap-1 text-sm font-medium text-primary-900 hover:text-primary-700"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Access */}
      <section className="section-padding bg-primary-50">
        <div className="container-premium">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-heading-1 font-bold text-primary-900 mb-4">
              How to Access Services
            </h2>
            <p className="text-lg text-primary-600 max-w-2xl mx-auto">
              Multiple touchpoints designed for easy access across rural and urban areas
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Phone, title: 'Call Helpline', desc: '1800-123-456 (Toll Free)' },
              { icon: MapPin, title: 'Visit Center', desc: '156 district offices' },
              { icon: FileText, title: 'Online Portal', desc: 'Apply from anywhere' },
              { icon: QrCode, title: 'QR Points', desc: '12,500+ locations' },
            ].map((method, index) => (
              <motion.div
                key={method.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 text-center border border-primary-100"
              >
                <div className="w-14 h-14 mx-auto rounded-xl bg-primary-100 flex items-center justify-center mb-4">
                  <method.icon className="w-7 h-7 text-primary-700" />
                </div>
                <h4 className="font-bold text-primary-900 mb-2">{method.title}</h4>
                <p className="text-sm text-primary-600">{method.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary-900 text-white">
        <div className="container-premium text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-heading-1 font-bold mb-6">
              Need Assistance?
            </h2>
            <p className="text-xl text-primary-200 mb-8 max-w-2xl mx-auto">
              Our team is ready to help. Reach out through any of our service channels
              and we'll connect you with the right support.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="tel:1800123456" className="btn-primary bg-white text-primary-900 hover:bg-primary-100">
                <Phone className="w-4 h-4 mr-2" />
                Call Now: 1800-123-456
              </a>
              <Link to="/contact" className="btn-secondary border-white text-white hover:bg-white/10">
                Visit Contact Page
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Services;
