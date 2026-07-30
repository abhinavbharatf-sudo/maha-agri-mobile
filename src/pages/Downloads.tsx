import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Download,
  FileText,
  File,
  Image,
  Filter,
  Calendar,
  ExternalLink,
  Eye,
} from 'lucide-react';

const downloadItems = [
  {
    id: 1,
    title: 'Annual Report 2023-24',
    category: 'reports',
    type: 'PDF',
    size: '4.2 MB',
    date: '2024-01-15',
    description: 'Comprehensive overview of programs, achievements, and financial statements for FY 2023-24.',
  },
  {
    id: 2,
    title: 'Annual Report 2022-23',
    category: 'reports',
    type: 'PDF',
    size: '3.8 MB',
    date: '2023-04-10',
    description: 'Yearly impact report with detailed project outcomes and beneficiary data.',
  },
  {
    id: 3,
    title: 'Maha-Agri Project Brochure',
    category: 'brochures',
    type: 'PDF',
    size: '2.1 MB',
    date: '2024-01-01',
    description: 'Detailed overview of the Maha-Agri precision farming initiative.',
  },
  {
    id: 4,
    title: 'Women Empowerment Impact Study',
    category: 'research',
    type: 'PDF',
    size: '1.5 MB',
    date: '2023-11-20',
    description: 'Independent research study on the impact of Mee Swayamsevika program.',
  },
  {
    id: 5,
    title: 'Financial Statement FY 2023-24',
    category: 'financials',
    type: 'PDF',
    size: '890 KB',
    date: '2024-01-15',
    description: 'Audited financial statements with balance sheet and income statement.',
  },
  {
    id: 6,
    title: 'CSR Partnership Guidelines',
    category: 'policies',
    type: 'PDF',
    size: '1.2 MB',
    date: '2024-01-01',
    description: 'Guidelines for corporate partners for CSR collaboration.',
  },
  {
    id: 7,
    title: 'Volunteer Handbook',
    category: 'brochures',
    type: 'PDF',
    size: '3.5 MB',
    date: '2023-10-15',
    description: 'Complete guide for volunteers joining our programs.',
  },
  {
    id: 8,
    title: 'Privacy Policy',
    category: 'policies',
    type: 'PDF',
    size: '450 KB',
    date: '2023-06-01',
    description: 'Our commitment to data protection and privacy.',
  },
  {
    id: 9,
    title: 'Training Calendar 2024',
    category: 'brochures',
    type: 'PDF',
    size: '680 KB',
    date: '2024-01-05',
    description: 'Schedule of training programs and workshops for the year.',
  },
  {
    id: 10,
    title: 'Drone Services Catalog',
    category: 'brochures',
    type: 'PDF',
    size: '2.8 MB',
    date: '2023-12-01',
    description: 'Comprehensive catalog of our drone-based services.',
  },
];

const Downloads = () => {
  const [activeFilter, setActiveFilter] = useState('all');

  const categories = [
    { value: 'all', label: 'All Documents' },
    { value: 'reports', label: 'Reports' },
    { value: 'brochures', label: 'Brochures' },
    { value: 'financials', label: 'Financials' },
    { value: 'policies', label: 'Policies' },
    { value: 'research', label: 'Research' },
  ];

  const filteredItems = activeFilter === 'all'
    ? downloadItems
    : downloadItems.filter(item => item.category === activeFilter);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      reports: '#486581',
      brochures: '#16a34a',
      financials: '#e68000',
      policies: '#829ab1',
      research: '#334e68',
    };
    return colors[category] || '#486581';
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
              <Download className="w-4 h-4" />
              Downloads
            </div>
            <h1 className="text-display-2 font-bold mb-6">
              Documents &
              <span className="block text-primary-200">Resources</span>
            </h1>
            <p className="text-xl text-primary-200 leading-relaxed">
              Access our annual reports, financial statements, program brochures,
              research papers, and policy documents.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Downloads Section */}
      <section className="section-padding bg-white">
        <div className="container-premium">
          {/* Filters */}
          <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-2">
            <Filter className="w-5 h-5 text-primary-400" />
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setActiveFilter(category.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeFilter === category.value
                    ? 'bg-primary-900 text-white'
                    : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Downloads Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="bg-white rounded-xl border border-primary-100 p-5 hover:shadow-card transition-all group"
              >
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${getCategoryColor(item.category)}20` }}
                  >
                    <FileText
                      className="w-6 h-6"
                      style={{ color: getCategoryColor(item.category) }}
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-bold text-primary-900 truncate group-hover:text-primary-700 transition-colors">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-primary-500 mt-1">
                      <span
                        className="px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: `${getCategoryColor(item.category)}20`,
                          color: getCategoryColor(item.category),
                        }}
                      >
                        {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                      </span>
                      <span>{item.type}</span>
                      <span>|</span>
                      <span>{item.size}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-primary-600 mb-4 line-clamp-2">{item.description}</p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-primary-100">
                  <span className="flex items-center gap-1 text-xs text-primary-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(item.date)}
                  </span>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-600 hover:bg-primary-50 transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-900 text-white hover:bg-primary-800 transition-colors">
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="section-padding bg-primary-50">
        <div className="container-premium">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="text-heading-1 font-bold text-primary-900 mb-4">
              Need a Specific Document?
            </h2>
            <p className="text-lg text-primary-600 max-w-2xl mx-auto mb-8">
              If you need a document not listed here, or require documents in a different format,
              please contact us and we'll be happy to assist.
            </p>
            <a
              href="mailto:info@abhinavbharatfoundation.org"
              className="btn-primary"
            >
              Request Document
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Downloads;
