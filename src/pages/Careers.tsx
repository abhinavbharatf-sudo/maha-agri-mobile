import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  MapPin,
  Clock,
  Users,
  Heart,
  Building2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { sendOTP } from '../../services/whatapi';

const jobOpenings = [
  {
    id: 1,
    title: 'Program Manager - Agriculture',
    department: 'Projects',
    location: 'Pune',
    type: 'Full-time',
    experience: '5+ years',
    description: 'Lead agricultural programs across multiple districts, manage teams, and ensure program outcomes.',
    requirements: ['Masters in Agriculture/Rural Management', '5+ years in development sector', 'Team management experience', 'Fluent in Marathi & English'],
  },
  {
    id: 2,
    title: 'Field Coordinator',
    department: 'Operations',
    location: 'Multiple Locations',
    type: 'Full-time',
    experience: '2+ years',
    description: 'Coordinate field activities, support SHGs, and implement programs at the grassroots level.',
    requirements: ['Graduate degree', '2+ years field experience', 'Strong communication skills', 'Willingness to travel extensively'],
  },
  {
    id: 3,
    title: 'Data Analyst',
    department: 'Technology',
    location: 'Pune',
    type: 'Full-time',
    experience: '3+ years',
    description: 'Analyze program data, create dashboards, and support evidence-based decision making.',
    requirements: ['Postgraduate in Statistics/Data Science', '3+ years experience', 'Python/R proficiency', 'Experience with visualization tools'],
  },
  {
    id: 4,
    title: 'Communications Lead',
    department: 'Communications',
    location: 'Pune',
    type: 'Full-time',
    experience: '4+ years',
    description: 'Manage brand communications, media relations, and content strategy.',
    requirements: ['Masters in Mass Comm/Marketing', '4+ years in communications', 'Excellent writing skills', 'Social media expertise'],
  },
  {
    id: 5,
    title: 'Drone Operations Specialist',
    department: 'Technology',
    location: 'Pune',
    type: 'Full-time',
    experience: '2+ years',
    description: 'Operate and maintain agricultural drones, train operators, and manage drone fleet.',
    requirements: ['Drone pilot certification', '2+ years experience', 'Technical aptitude', 'Willing to travel'],
  },
];

const benefits = [
  { icon: Heart, title: 'Health Insurance', desc: 'Comprehensive coverage for you and family' },
  { icon: Clock, title: 'Work-Life Balance', desc: 'Flexible hours and remote options' },
  { icon: Users, title: 'Learning & Development', desc: 'Continuous skill enhancement' },
  { icon: Building2, title: 'Impact Work', desc: 'Make a real difference in lives' },
];

const Careers = () => {
  const handleSendOtpClick = async (phone: string, generatedOtpCode: string) => {
    try {
      const result = await sendOTP(phone, generatedOtpCode, {
        orgName: "ABHINAV BHARAT FOUNDATION"
      });
      if (result.success) {
        console.log('OTP sent successfully!', result.messageId);
      } else {
        console.error('Failed to send OTP:', result.error);
      }
    } catch (error) {
      console.error('Unexpected error sending OTP:', error);
    }
  };

  return (
    <div className="min-h-screen">
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
              <Briefcase className="w-4 h-4" />
              Careers
            </div>
            <h1 className="text-display-2 font-bold mb-6">
              Join the Mission of
              <span className="block text-primary-200">Transforming Rural India</span>
            </h1>
            <p className="text-xl text-primary-200 leading-relaxed">
              Be part of a team that creates real impact. We're looking for passionate
              individuals committed to rural development and community empowerment.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-primary-50">
        <div className="container-premium">
          <div className="grid md:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 text-center border border-primary-100"
              >
                <div className="w-14 h-14 mx-auto rounded-xl bg-primary-100 flex items-center justify-center mb-4">
                  <benefit.icon className="w-7 h-7 text-primary-700" />
                </div>
                <h4 className="font-bold text-primary-900 mb-2">{benefit.title}</h4>
                <p className="text-sm text-primary-600">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-premium">
          <div className="space-y-4">
            {jobOpenings.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-white rounded-xl border border-primary-100 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-primary-900 mb-2">{job.title}</h3>
                    </div>
                    <a
                      href={`mailto:careers@abhinavbharatfoundation.org?subject=Application: ${job.title}`}
                      className="btn-primary text-sm shrink-0"
                    >
                      Apply Now
                    </a>
                  </div>
                  <p className="text-primary-600 mb-4">{job.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Careers;