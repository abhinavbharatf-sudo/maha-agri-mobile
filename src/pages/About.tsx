import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Building2,
  Target,
  Eye,
  Users,
  Award,
  Calendar,
  MapPin,
  HandHeart,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

const About = () => {
  const leadership = [
    {
      name: 'Dr. Rajesh Kumar',
      role: 'Founder & President',
      bio: 'Visionary leader with 25+ years in rural development',
      image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    {
      name: 'Mrs. Priya Sharma',
      role: 'Executive Director',
      bio: 'Expert in women empowerment and micro-finance',
      image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    {
      name: 'Mr. Amit Patil',
      role: 'Director - Agriculture',
      bio: 'Agricultural scientist with focus on sustainable farming',
      image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    {
      name: 'Ms. Sneha Deshmukh',
      role: 'Director - Operations',
      bio: 'Operations excellence across 156 districts',
      image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
  ];

  const timeline = [
    { year: '2015', title: 'Foundation Established', desc: 'Started with a vision to transform rural Maharashtra' },
    { year: '2017', title: 'First Major Project', desc: 'Launched pilot agricultural support program in 12 villages' },
    { year: '2019', title: 'Women Empowerment Initiative', desc: 'Mee Swayamsevika program launched across 50 districts' },
    { year: '2021', title: 'Technology Integration', desc: 'Drone services and digital platforms introduced' },
    { year: '2023', title: '156 Districts Coverage', desc: 'Expanded to cover entire Maharashtra state' },
    { year: '2024', title: 'Phase 3 Launch', desc: 'MAHA-AGRI project expanded to 50 more districts' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
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
              About Us
            </div>
            <h1 className="text-display-2 font-bold mb-6">
              Building a Self-Reliant
              <span className="block text-primary-200">Rural India</span>
            </h1>
            <p className="text-xl text-primary-200 leading-relaxed">
              Since 2015, Abhinav Bharat Foundation has been at the forefront of rural transformation,
              empowering communities through innovation, sustainable agriculture, and inclusive development.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section id="story" className="section-padding bg-white">
        <div className="container-premium">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 rounded-full text-sm font-medium text-primary-700 mb-6">
                <Calendar className="w-4 h-4" />
                Our Story
              </div>
              <h2 className="text-heading-1 font-bold text-primary-900 mb-6">
                A Journey of
                <span className="text-primary-600"> Transformation</span>
              </h2>
              <div className="space-y-4 text-primary-600 leading-relaxed">
                <p>
                  Abhinav Bharat Foundation was born from a simple yet powerful vision: to create
                  sustainable livelihoods and opportunities for rural communities. What started
                  as a small initiative in 12 villages of Pune district has grown into a
                  pan-Maharashtra movement touching millions of lives.
                </p>
                <p>
                  Our founder, Dr. Rajesh Kumar, witnessed the struggles of farmers and rural
                  women firsthand during his extensive work in grassroots development. This
                  experience shaped the foundation's unique approach: combining traditional
                  wisdom with modern technology, and community participation with expert guidance.
                </p>
                <p>
                  Today, we work across 156 districts, partnering with government bodies,
                  corporate CSR initiatives, and international organizations to create
                  scalable, sustainable impact models.
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden">
                <img
                  src="https://images.pexels.com/photos/3184294/pexels-photo-3184294.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Community gathering"
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
              <div className="absolute -bottom-8 -right-8 bg-white rounded-xl shadow-premium-lg p-6 border border-primary-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary-900 flex items-center justify-center">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary-900">11+ Years</div>
                    <div className="text-sm text-primary-500">of Impact</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="section-padding bg-primary-50">
        <div className="container-premium">
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-2xl p-8 border border-primary-100"
            >
              <div className="w-14 h-14 rounded-xl bg-primary-900 flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-primary-900 mb-4">Our Mission</h3>
              <p className="text-primary-600 leading-relaxed">
                To catalyze sustainable rural transformation through innovative agricultural
                practices, women empowerment, skill development, and technology-enabled services
                that create self-reliant and prosperous communities across India.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl p-8 border border-primary-100"
            >
              <div className="w-14 h-14 rounded-xl bg-accent-green-600 flex items-center justify-center mb-6">
                <Eye className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-primary-900 mb-4">Our Vision</h3>
              <p className="text-primary-600 leading-relaxed">
                A self-reliant rural India where every farmer is prosperous, every woman is
                empowered, every youth is skilled, and every village has access to modern
                amenities, healthcare, and quality education.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section-padding bg-white">
        <div className="container-premium">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-heading-1 font-bold text-primary-900 mb-4">
              Our Journey
            </h2>
            <p className="text-lg text-primary-600 max-w-2xl mx-auto">
              Key milestones in our mission to transform rural Maharashtra
            </p>
          </motion.div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-primary-200 -translate-x-1/2 hidden md:block" />

            <div className="space-y-12">
              {timeline.map((item, index) => (
                <motion.div
                  key={item.year}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative flex items-center gap-8 ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  <div className={`flex-1 hidden md:block ${index % 2 === 0 ? 'text-right' : 'text-left'}`}>
                    <div className="bg-primary-50 rounded-xl p-6 inline-block">
                      <div className="text-2xl font-bold text-primary-900 mb-2">{item.year}</div>
                      <h4 className="font-semibold text-primary-800 mb-1">{item.title}</h4>
                      <p className="text-sm text-primary-600">{item.desc}</p>
                    </div>
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary-900 border-4 border-white shadow hidden md:block" />
                  <div className="flex-1 md:hidden">
                    <div className="bg-primary-50 rounded-xl p-6">
                      <div className="text-2xl font-bold text-primary-900 mb-2">{item.year}</div>
                      <h4 className="font-semibold text-primary-800 mb-1">{item.title}</h4>
                      <p className="text-sm text-primary-600">{item.desc}</p>
                    </div>
                  </div>
                  <div className="flex-1 hidden md:block" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section id="leadership" className="section-padding bg-primary-50">
        <div className="container-premium">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm font-medium text-primary-700 mb-4 shadow-sm">
              <Users className="w-4 h-4" />
              Leadership
            </div>
            <h2 className="text-heading-1 font-bold text-primary-900 mb-4">
              Meet Our Team
            </h2>
            <p className="text-lg text-primary-600 max-w-2xl mx-auto">
              Dedicated professionals driving change across rural Maharashtra
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {leadership.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl overflow-hidden border border-primary-100 group"
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <h4 className="font-bold text-primary-900">{member.name}</h4>
                  <div className="text-sm text-primary-600 font-medium mb-2">{member.role}</div>
                  <p className="text-sm text-primary-500">{member.bio}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section id="partners" className="section-padding bg-white">
        <div className="container-premium">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 rounded-full text-sm font-medium text-primary-700 mb-4">
              <HandHeart className="w-4 h-4" />
              Our Partners
            </div>
            <h2 className="text-heading-1 font-bold text-primary-900 mb-4">
              Collaborating for Impact
            </h2>
            <p className="text-lg text-primary-600 max-w-2xl mx-auto">
              Working together with government, corporate, and international partners
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {['Government of Maharashtra', 'NABARD', 'TATA Trusts', 'Bill & Melinda Gates Foundation', 'UNDP', 'World Bank'].map((partner, index) => (
              <motion.div
                key={partner}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-primary-50 rounded-xl p-6 flex items-center justify-center aspect-square hover:bg-primary-100 transition-colors"
              >
                <span className="text-primary-400 text-sm text-center font-medium">{partner}</span>
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
              Join Our Mission
            </h2>
            <p className="text-xl text-primary-200 mb-8 max-w-2xl mx-auto">
              Partner with us in creating sustainable impact. Whether you're a corporate,
              NGO, or individual, there's a role for everyone in this transformation.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/contact" className="btn-primary bg-white text-primary-900 hover:bg-primary-100">
                Become a Partner
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link to="/careers" className="btn-secondary border-white text-white hover:bg-white/10">
                View Careers
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;
