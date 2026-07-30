import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, ExternalLink, Newspaper, FileText, Video } from 'lucide-react';

const news = [
  {
    id: 1,
    title: 'Phase 3 of Maha-Agri Project Launched Across 50 New Districts',
    excerpt: 'Expanding precision farming initiative with advanced drone monitoring and AI-powered crop advisory for 45,000 additional farmers.',
    date: '2024-01-15',
    category: 'Agriculture',
    type: 'Press Release',
  },
  {
    id: 2,
    title: 'MOU Signed with Government of Maharashtra for Rural Skill Development',
    excerpt: 'Partnership to train 100,000 rural youth in digital skills and entrepreneurship over the next three years.',
    date: '2024-01-10',
    category: 'Partnership',
    type: 'Announcement',
  },
  {
    id: 3,
    title: 'Drone Fleet Expansion: 20 New Advanced Units Added',
    excerpt: 'Enhancing agricultural monitoring capabilities and disaster response readiness.',
    date: '2024-01-05',
    category: 'Technology',
    type: 'Update',
  },
  {
    id: 4,
    title: 'Annual Impact Report 2023-24 Published',
    excerpt: 'Comprehensive report highlighting programme outcomes and audited financial statements.',
    date: '2024-01-02',
    category: 'Report',
    type: 'Publication',
  },
];

const NewsSection = () => {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <section className="py-24 md:py-32 lg:py-40 bg-primary-50/60">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-14 md:mb-18"
        >
          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2.5 px-5 py-2 bg-primary-900 text-white rounded-full text-xs font-bold uppercase tracking-wider mb-7"
            >
              <Newspaper className="w-4 h-4" />
              <span>Latest Updates</span>
            </motion.div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-900 tracking-tight leading-[1.1]">
              News &
              <span className="block text-primary-600">Announcements</span>
            </h2>
          </div>
          <Link
            to="/media"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 border-2 border-primary-900 text-primary-900 font-bold rounded-lg hover:bg-primary-900 hover:text-white transition-all shrink-0"
          >
            <span className="text-sm uppercase tracking-wider">View All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* News Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {news.map((item, i) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -6 }}
              className="group bg-white border border-primary-100/80 rounded-xl overflow-hidden hover:border-primary-300 hover:shadow-xl hover:shadow-primary-900/5 transition-all duration-300"
            >
              <div className="p-6 lg:p-7">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-[10px] text-primary-500 uppercase tracking-wider font-semibold">
                    {item.type === 'Press Release' && <FileText className="w-3.5 h-3.5" />}
                    {item.type === 'Video' && <Video className="w-3.5 h-3.5" />}
                    <span>{item.type}</span>
                  </div>
                  <span className="text-xs text-primary-400 font-medium">{formatDate(item.date)}</span>
                </div>
                <h3 className="font-bold text-primary-900 leading-snug mb-3 group-hover:text-primary-700 transition-colors line-clamp-2 text-base lg:text-lg">
                  {item.title}
                </h3>
                <p className="text-sm text-primary-600 leading-relaxed line-clamp-2 mb-5">
                  {item.excerpt}
                </p>
                <div className="flex items-center justify-between pt-5 border-t border-primary-100">
                  <span className="text-[10px] text-primary-500 uppercase tracking-wider font-semibold">
                    {item.category}
                  </span>
                  <span className="text-xs font-bold text-primary-900 group-hover:text-primary-700 transition-colors inline-flex items-center gap-1.5">
                    Read
                    <motion.span whileHover={{ x: 3 }} transition={{ duration: 0.2 }}>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </motion.span>
                  </span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewsSection;
