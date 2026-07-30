import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Tractor,
  Users,
  Plane,
  GraduationCap,
  Rocket,
  HeartPulse,
  QrCode,
  Leaf,
  ArrowRight,
  MapPin,
  TrendingUp,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

const projects = [
  {
    id: 'maha-agri',
    title: 'MAHA-AGRI PROJECT',
    subtitle: 'Precision Farming Revolution',
    description: 'Comprehensive agricultural transformation initiative implementing precision farming, drone monitoring, soil analysis, and market linkage across 45,000+ hectares.',
    icon: Tractor,
    image: 'https://images.pexels.com/photos/2889440/pexels-photo-2889440.jpeg?auto=compress&cs=tinysrgb&w=800',
    color: 'accent-green',
    stats: [
      { label: 'Farmers Enrolled', value: '89,340+' },
      { label: 'Hectares Covered', value: '45,000+' },
      { label: 'Average Yield Increase', value: '47%' },
    ],
    features: ['Precision Farming', 'Drone Monitoring', 'Soil Testing Labs', 'Market Linkage', 'Seed Distribution', 'Training Programs'],
    timeline: '2019 - Present',
    districts: 34,
    status: 'Active',
  },
  {
    id: 'swayamsevika',
    title: 'Mee Swayamsevika',
    subtitle: 'Women Empowerment Network',
    description: 'Building a network of women micro-entrepreneurs through skill training, financial inclusion, market access, and self-help group formation.',
    icon: Users,
    image: 'https://images.pexels.com/photos/3184294/pexels-photo-3184294.jpeg?auto=compress&cs=tinysrgb&w=800',
    color: 'primary',
    stats: [
      { label: 'Women Trained', value: '32,450+' },
      { label: 'Enterprises Started', value: '8,200+' },
      { label: 'Average Income Rise', value: '156%' },
    ],
    features: ['Skill Development', 'Micro-finance Access', 'Market Training', 'Leadership Programs', 'SHG Formation', 'Digital Literacy'],
    timeline: '2019 - Present',
    districts: 89,
    status: 'Active',
  },
  {
    id: 'drones',
    title: 'Drone Services',
    subtitle: 'Technology Innovation Hub',
    description: 'Advanced drone technology for agricultural monitoring, precision spraying, land survey, and disaster assessment across rural Maharashtra.',
    icon: Plane,
    image: 'https://images.pexels.com/photos/4425873/pexels-photo-4425873.jpeg?auto=compress&cs=tinysrgb&w=800',
    color: 'primary',
    stats: [
      { label: 'Drone Fleet', value: '47' },
      { label: 'Hectares Surveyed', value: '125,000+' },
      { label: 'Cost Reduction', value: '60%' },
    ],
    features: ['Crop Monitoring', 'Precision Spraying', 'Land Survey', 'Disaster Response', 'NDVI Analysis', 'Yield Prediction'],
    timeline: '2021 - Present',
    districts: 112,
    status: 'Active',
  },
  {
    id: 'training',
    title: 'Training & EDP',
    subtitle: 'Skill Development Programs',
    description: 'Comprehensive training and Entrepreneurship Development Programs for rural youth, farmers, and women focusing on employability and self-employment.',
    icon: GraduationCap,
    image: 'https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?auto=compress&cs=tinysrgb&w=800',
    color: 'accent-green',
    stats: [
      { label: 'Programs Conducted', value: '324+' },
      { label: 'Youth Trained', value: '45,000+' },
      { label: 'Placement Rate', value: '78%' },
    ],
    features: ['Technical Training', 'Soft Skills', 'Digital Literacy', 'Industry Partnerships', 'Placement Support', 'Startup Mentoring'],
    timeline: '2017 - Present',
    districts: 156,
    status: 'Active',
  },
  {
    id: 'emergency',
    title: 'Emergency Help QR',
    subtitle: 'Citizen Safety Network',
    description: 'Quick response emergency system using QR codes installed in public spaces, connecting citizens to emergency services within 8 minutes.',
    icon: QrCode,
    image: 'https://images.pexels.com/photos/4056822/pexels-photo-4056822.jpeg?auto=compress&cs=tinysrgb&w=800',
    color: 'accent-saffron',
    stats: [
      { label: 'QR Points Deployed', value: '12,500+' },
      { label: 'Emergencies Handled', value: '4,200+' },
      { label: 'Avg Response Time', value: '<8 min' },
    ],
    features: ['24/7 Helpline', 'Medical Emergency', 'Women Safety', 'Quick Dispatch', 'GPS Tracking', 'Hospital Network'],
    timeline: '2022 - Present',
    districts: 156,
    status: 'Active',
  },
  {
    id: 'entrepreneurship',
    title: 'Rural Entrepreneurship',
    subtitle: 'Startup Ecosystem Builder',
    description: 'Fostering rural entrepreneurship through incubation support, mentorship, funding access, and market connectivity for tier-2 and tier-3 innovators.',
    icon: Rocket,
    image: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=800',
    color: 'primary',
    stats: [
      { label: 'Startups Incubated', value: '234+' },
      { label: 'Jobs Created', value: '8,500+' },
      { label: 'Funding Facilitated', value: 'INR 45Cr' },
    ],
    features: ['Incubation Support', 'Mentor Network', 'Investor Connect', 'Market Access', 'Prototype Funding', 'Business Dev'],
    timeline: '2020 - Present',
    districts: 78,
    status: 'Active',
  },
];

const Projects = () => {
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
              <Leaf className="w-4 h-4" />
              Our Projects
            </div>
            <h1 className="text-display-2 font-bold mb-6">
              Initiatives Creating
              <span className="block text-primary-200">Sustainable Impact</span>
            </h1>
            <p className="text-xl text-primary-200 leading-relaxed">
              Every project is designed for scalability, sustainability, and measurable outcomes.
              Explore our flagship initiatives transforming rural Maharashtra.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="section-padding bg-white">
        <div className="container-premium">
          <div className="space-y-16">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                id={project.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="bg-primary-50 rounded-2xl overflow-hidden"
              >
                <div className={`grid lg:grid-cols-2 ${index % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}>
                  {/* Image Side */}
                  <div className={`relative ${index % 2 !== 0 ? 'lg:order-2' : ''}`}>
                    <div className="relative h-64 lg:h-full min-h-[400px] overflow-hidden">
                      <img
                        src={project.image}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                      <div className="absolute bottom-4 left-4 lg:hidden">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2 h-2 rounded-full bg-accent-green-400 animate-pulse" />
                          <span className="text-xs font-medium text-white/80">{project.status}</span>
                        </div>
                        <div className="text-sm text-white/60">{project.timeline}</div>
                      </div>
                    </div>
                  </div>

                  {/* Content Side */}
                  <div className="p-8 lg:p-12 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          backgroundColor: project.color === 'accent-green' ? '#dcfce7' : project.color === 'accent-saffron' ? '#fff8f0' : '#f0f4f8',
                        }}
                      >
                        <project.icon
                          className="w-6 h-6"
                          style={{
                            color: project.color === 'accent-green' ? '#16a34a' : project.color === 'accent-saffron' ? '#e68000' : '#486581',
                          }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 hidden lg:flex">
                          <span className="w-2 h-2 rounded-full bg-accent-green-500 animate-pulse" />
                          <span className="text-xs font-medium text-primary-500">{project.status}</span>
                          <span className="text-primary-300">|</span>
                          <span className="text-xs text-primary-400">{project.timeline}</span>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-primary-900 mb-2">{project.title}</h3>
                    <p className="text-primary-600 font-medium mb-4">{project.subtitle}</p>
                    <p className="text-primary-600 leading-relaxed mb-6">{project.description}</p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {project.stats.map((stat) => (
                        <div key={stat.label} className="bg-white rounded-lg p-4 text-center">
                          <div className="text-xl font-bold text-primary-900">{stat.value}</div>
                          <div className="text-xs text-primary-500">{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {project.features.map((feature) => (
                        <span
                          key={feature}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-xs font-medium text-primary-700"
                        >
                          <CheckCircle2 className="w-3 h-3 text-accent-green-500" />
                          {feature}
                        </span>
                      ))}
                    </div>

                    {/* Districts & Link */}
                    <div className="flex items-center justify-between pt-4 border-t border-primary-200">
                      <div className="flex items-center gap-2 text-sm text-primary-500">
                        <MapPin className="w-4 h-4" />
                        {project.districts} Districts
                      </div>
                      <Link
                        to="/contact"
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary-900 hover:text-primary-700"
                      >
                        Partner on this project
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
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
              Partner With Us
            </h2>
            <p className="text-xl text-primary-200 mb-8 max-w-2xl mx-auto">
              Whether you're a corporate looking for CSR opportunities, an NGO seeking collaboration,
              or a government body working on rural development, we have partnership models for you.
            </p>
            <Link to="/contact" className="btn-primary bg-white text-primary-900 hover:bg-primary-100">
              Start a Partnership
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Projects;
