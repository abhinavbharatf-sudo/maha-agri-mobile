import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  Building2,
  Globe,
  CheckCircle2,
} from 'lucide-react';

const offices = [
  {
    name: 'Head Office - Pune',
    address: 'Foundation House, Sector 15, Hinjewadi, Pune, Maharashtra 411057',
    phone: '020-4567890',
    email: 'pune@abhinavbharatfoundation.org',
    hours: 'Mon-Sat, 9 AM - 6 PM',
  },
  {
    name: 'Regional Office - Nagpur',
    address: 'Civil Lines, Nagpur, Maharashtra 440001',
    phone: '0712-234567',
    email: 'nagpur@abhinavbharatfoundation.org',
    hours: 'Mon-Sat, 9 AM - 6 PM',
  },
  {
    name: 'Regional Office - Aurangabad',
    address: 'CIDCO, Aurangabad, Maharashtra 431003',
    phone: '0240-234567',
    email: 'aurangabad@abhinavbharatfoundation.org',
    hours: 'Mon-Sat, 9 AM - 6 PM',
  },
];

const faqs = [
  {
    question: 'How can I partner with the Foundation for CSR activities?',
    answer: 'We welcome corporate partnerships. Please reach out through our contact form or email csr@abhinavbharatfoundation.org with your CSR objectives and we\'ll connect you with our partnerships team.',
  },
  {
    question: 'How do I apply for training programs?',
    answer: 'Training programs are announced through our website and local centers. You can register your interest through the Services page or call our helpline for upcoming sessions.',
  },
  {
    question: 'Is the Foundation eligible to receive foreign donations?',
    answer: 'Yes, we are registered under FCRA and can receive international donations. Please contact our finance team for proper documentation and bank details.',
  },
  {
    question: 'How can I volunteer with the Foundation?',
    answer: 'We welcome volunteers! Please send your profile to volunteer@abhinavbharatfoundation.org mentioning your skills, location preference, and availability.',
  },
];

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
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
              <MessageSquare className="w-4 h-4" />
              Contact Us
            </div>
            <h1 className="text-display-2 font-bold mb-6">
              Get in Touch
              <span className="block text-primary-200">We're Here to Help</span>
            </h1>
            <p className="text-xl text-primary-200 leading-relaxed">
              Have questions, suggestions, or want to partner with us? Our team is ready to assist.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12 bg-white border-b border-primary-100">
        <div className="container-premium">
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Phone, label: 'Call Us', value: '1800-123-456', subtext: 'Toll Free' },
              { icon: Mail, label: 'Email Us', value: 'info@abhinavbharatfoundation.org', subtext: '24-48 hr response' },
              { icon: MapPin, label: 'Visit Us', value: '156 District Offices', subtext: 'Across Maharashtra' },
              { icon: Clock, label: 'Working Hours', value: 'Mon-Sat', subtext: '9 AM - 6 PM' },
            ].map((method, index) => (
              <motion.div
                key={method.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="text-center p-4"
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-primary-100 flex items-center justify-center mb-3">
                  <method.icon className="w-6 h-6 text-primary-700" />
                </div>
                <div className="text-sm text-primary-500 mb-1">{method.label}</div>
                <div className="font-bold text-primary-900">{method.value}</div>
                <div className="text-xs text-primary-400">{method.subtext}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Contact Section */}
      <section className="section-padding bg-white">
        <div className="container-premium">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-heading-1 font-bold text-primary-900 mb-6">
                Send Us a Message
              </h2>
              <p className="text-primary-600 mb-8">
                Fill out the form below and our team will get back to you within 24-48 hours.
              </p>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-primary-50 rounded-xl p-8 text-center border border-primary-100"
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-accent-green-100 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-accent-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-primary-900 mb-2">Message Sent!</h3>
                  <p className="text-primary-600">
                    Thank you for reaching out. We'll get back to you soon.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-4 text-sm font-medium text-primary-900 hover:text-primary-700"
                  >
                    Send another message
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 rounded-lg border border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                        placeholder="Your name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-3 rounded-lg border border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        className="w-full px-4 py-3 rounded-lg border border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                        placeholder="+91 9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">
                        Subject *
                      </label>
                      <select
                        required
                        className="w-full px-4 py-3 rounded-lg border border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      >
                        <option value="">Select a topic</option>
                        <option value="partnership">Partnership Inquiry</option>
                        <option value="volunteer">Volunteer Opportunity</option>
                        <option value="services">Service Request</option>
                        <option value="media">Media Inquiry</option>
                        <option value="careers">Careers</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={5}
                      className="w-full px-4 py-3 rounded-lg border border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all resize-none"
                      placeholder="Tell us how we can help..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn-primary w-full">
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </button>
                </form>
              )}
            </motion.div>

            {/* Offices & Map */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-heading-1 font-bold text-primary-900 mb-6">
                Our Offices
              </h2>
              <div className="space-y-4 mb-8">
                {offices.map((office, index) => (
                  <motion.div
                    key={office.name}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="bg-primary-50 rounded-xl p-5 border border-primary-100"
                  >
                    <h4 className="font-bold text-primary-900 mb-2">{office.name}</h4>
                    <div className="space-y-2 text-sm text-primary-600">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{office.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 shrink-0" />
                        <span>{office.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 shrink-0" />
                        <span>{office.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>{office.hours}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Map Placeholder */}
              <div className="bg-primary-100 rounded-xl h-64 flex items-center justify-center">
                <div className="text-center text-primary-500">
                  <Globe className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">Interactive map coming soon</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="section-padding bg-primary-50">
        <div className="container-premium">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-heading-1 font-bold text-primary-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-primary-600">
              Quick answers to common queries
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 border border-primary-100"
              >
                <h4 className="font-bold text-primary-900 mb-2">{faq.question}</h4>
                <p className="text-primary-600">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
