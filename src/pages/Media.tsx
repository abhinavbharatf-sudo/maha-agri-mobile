import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Video, Calendar, Clock, Filter, ArrowRight, ExternalLink, Play } from 'lucide-react';

const newsArticles = [
  {
    id: 1,
    title: 'Foundation Launches Phase 3 of Maha-Agri Project',
    excerpt: 'Expanding precision farming to 50 new districts with advanced drone monitoring and AI-powered crop advisory services.',
    date: '2024-01-15',
    category: 'Agriculture',
    image: 'https://images.pexels.com/photos/2889440/pexels-photo-2889440.jpeg?auto=compress&cs=tinysrgb&w=600',
    type: 'news',
    source: 'The Hindu',
  },
  {
    id: 2,
    title: 'Partnership with State Government for Rural Skill Development',
    excerpt: 'MOU signed to train 100,000 rural youth in digital skills and entrepreneurship over the next three years.',
    date: '2024-01-10',
    category: 'Partnership',
    image: 'https://images.pexels.com/photos/3184294/pexels-photo-3184294.jpeg?auto=compress&cs=tinysrgb&w=400',
    type: 'news',
    source: 'Indian Express',
  },
  {
    id: 3,
    title: 'Drone Fleet Expansion: 20 New Units Added',
    excerpt: 'Enhancing agricultural monitoring and disaster response capabilities with advanced drone technology.',
    date: '2024-01-05',
    category: 'Technology',
    image: 'https://images.pexels.com/photos/4425873/pexels-photo-4425873.jpeg?auto=compress&cs=tinysrgb&w=400',
    type: 'news',
    source: 'Tech News',
  },
  {
    id: 4,
    title: 'Women Self-Help Groups Cross 10,000 Milestone',
    excerpt: 'Over 10,000 SHGs now active across Maharashtra, empowering more than 150,000 women entrepreneurs.',
    date: '2024-01-02',
    category: 'Women Empowerment',
    image: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400',
    type: 'news',
    source: 'Maharashtra Times',
  },
  {
    id: 5,
    title: 'Annual Impact Report 2023 Released',
    excerpt: 'Foundation publishes comprehensive report highlighting achievements across all program areas.',
    date: '2023-12-28',
    category: 'Report',
    image: 'https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?auto=compress&cs=tinysrgb&w=400',
    type: 'news',
    source: 'Official',
  },
];

const pressReleases = [
  {
    id: 1,
    title: 'Foundation Announces Expansion Plans for 2024',
    date: '2024-01-20',
    category: 'Announcement',
  },
  {
    id: 2,
    title: 'New Partnership with NABARD for Agricultural Credit',
    date: '2024-01-12',
    category: 'Partnership',
  },
  {
    id: 3,
    title: 'Recognition from Ministry of Rural Development',
    date: '2024-01-08',
    category: 'Award',
  },
];

const videos = [
  {
    id: 1,
    title: 'Our Journey - Documentary',
    duration: '12:45',
    thumbnail: 'https://images.pexels.com/photos/2889440/pexels-photo-2889440.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 2,
    title: 'Maha-Agri Impact Story',
    duration: '8:30',
    thumbnail: 'https://images.pexels.com/photos/4425873/pexels-photo-4425873.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 3,
    title: 'Women of Change - Documentary',
    duration: '15:20',
    thumbnail: 'https://images.pexels.com/photos/3184294/pexels-photo-3184294.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

const Media = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const categories = ['all', 'Agriculture', 'Partnership', 'Technology', 'Women Empowerment'];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredNews = activeFilter === 'all'
    ? newsArticles
    : newsArticles.filter(article => article.category === activeFilter);

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
              <Newspaper className="w-4 h-4" />
              Media Center
            </div>
            <h1 className="text-display-2 font-bold mb-6">
              News, Updates &
              <span className="block text-primary-200">Press Coverage</span>
            </h1>
            <p className="text-xl text-primary-200 leading-relaxed">
              Stay updated with our latest news, press releases, and media coverage.
              Access official documents and multimedia content.
            </p>
          </motion.div>
        </div>
      </section>

      {/* News Section */}
      <section className="section-padding bg-white">
        <div className="container-premium">
          {/* Filters */}
          <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-2">
            <Filter className="w-5 h-5 text-primary-400" />
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveFilter(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeFilter === category
                    ? 'bg-primary-900 text-white'
                    : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                }`}
              >
                {category === 'all' ? 'All News' : category}
              </button>
            ))}
          </div>

          {/* News Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNews.map((article, index) => (
              <motion.article
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl border border-primary-100 overflow-hidden hover:shadow-card transition-shadow group"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span
                      className="inline-block px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium"
                      style={{
                        color: article.category === 'Agriculture' ? '#16a34a' : article.category === 'Partnership' ? '#486581' : article.category === 'Technology' ? '#486581' : '#e68000',
                      }}
                    >
                      {article.category}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3 text-sm text-primary-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(article.date)}
                    </span>
                    <span className="text-primary-300">|</span>
                    <span>{article.source}</span>
                  </div>
                  <h3 className="font-bold text-primary-900 mb-2 group-hover:text-primary-700 transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-primary-600 line-clamp-2 mb-4">{article.excerpt}</p>
                  <a href="#" className="inline-flex items-center gap-1 text-sm font-medium text-primary-900 hover:text-primary-700">
                    Read More
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="section-padding bg-primary-50">
        <div className="container-premium">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h2 className="text-heading-1 font-bold text-primary-900 mb-4">
              Press Releases
            </h2>
            <p className="text-lg text-primary-600">
              Official announcements and updates from Abhinav Bharat Foundation
            </p>
          </motion.div>

          <div className="space-y-4">
            {pressReleases.map((release, index) => (
              <motion.div
                key={release.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-white rounded-xl p-5 border border-primary-100 flex items-center justify-between hover:shadow-card transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <Newspaper className="w-5 h-5 text-primary-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 bg-primary-100 rounded-full text-primary-600">
                        {release.category}
                      </span>
                      <span className="text-xs text-primary-400">{formatDate(release.date)}</span>
                    </div>
                    <h4 className="font-semibold text-primary-900">{release.title}</h4>
                  </div>
                </div>
                <a href="#" className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-900">
                  Download
                  <ExternalLink className="w-4 h-4" />
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Videos */}
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
              <Video className="w-4 h-4" />
              Video Gallery
            </div>
            <h2 className="text-heading-1 font-bold text-primary-900 mb-4">
              Watch Our Stories
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {videos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative rounded-xl overflow-hidden group cursor-pointer"
              >
                <div className="relative aspect-video">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 text-white ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 rounded text-xs text-white">
                    {video.duration}
                  </div>
                </div>
                <div className="p-4 bg-primary-50 border border-primary-100 border-t-0 rounded-b-xl">
                  <h4 className="font-semibold text-primary-900">{video.title}</h4>
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
              Media Inquiries
            </h2>
            <p className="text-xl text-primary-200 mb-8 max-w-2xl mx-auto">
              For press coverage, interviews, or official statements, please contact our communications team.
            </p>
            <Link to="/contact" className="btn-primary bg-white text-primary-900 hover:bg-primary-100">
              Contact Media Team
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Media;
