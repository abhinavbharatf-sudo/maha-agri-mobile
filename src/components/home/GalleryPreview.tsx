import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Camera, ArrowRight, Play, Video, Image } from 'lucide-react';

const images = [
  { src: 'https://images.pexels.com/photos/2889440/pexels-photo-2889440.jpeg?auto=compress&cs=tinysrgb&w=600', alt: 'Agricultural Training', cat: 'Agriculture' },
  { src: 'https://images.pexels.com/photos/3184294/pexels-photo-3184294.jpeg?auto=compress&cs=tinysrgb&w=600', alt: 'Women SHG Meeting', cat: 'Women' },
  { src: 'https://images.pexels.com/photos/4425873/pexels-photo-4425873.jpeg?auto=compress&cs=tinysrgb&w=600', alt: 'Drone Operations', cat: 'Technology' },
  { src: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400', alt: 'Health Camp', cat: 'Health' },
  { src: 'https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?auto=compress&cs=tinysrgb&w=400', alt: 'Training Session', cat: 'Training' },
];

const GalleryPreview = () => {
  return (
    <section className="py-28 md:py-40 lg:py-48 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16">
        {/* Header */}
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
              className="inline-flex items-center gap-2.5 px-5 py-2 bg-white/10 border border-white/20 rounded-full text-xs font-bold text-white uppercase tracking-wider mb-8"
            >
              <Camera className="w-4 h-4" />
              <span>Gallery</span>
            </motion.div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-5 leading-[1.1]">
              Mission in
              <span className="block text-primary-300">Action</span>
            </h2>
            <p className="text-lg md:text-xl text-primary-300 max-w-xl leading-relaxed">
              Visual documentation of our programmes, community engagement, and transformation stories.
            </p>
          </div>
          <Link
            to="/gallery"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-white text-primary-900 font-bold rounded-lg hover:bg-primary-100 transition-colors shrink-0 shadow-lg"
          >
            <span className="text-sm uppercase tracking-wider">Full Gallery</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {images.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -4 }}
              className={`relative overflow-hidden group ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
            >
              <div className={`${i === 0 ? 'aspect-none h-full' : 'aspect-square'} rounded-xl overflow-hidden`}>
                <motion.img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-400">
                  <span className="text-[11px] text-white/90 uppercase tracking-wider font-bold px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full">{img.cat}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Video CTA */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mt-12 bg-white/5 border border-white/15 rounded-2xl p-7 md:p-8 flex flex-col md:flex-row items-center justify-between gap-7"
        >
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <Video className="w-7 h-7 text-white" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white mb-1">Watch Our Story</h4>
              <p className="text-sm text-primary-300">Documentary on mission and impact</p>
            </div>
          </div>
          <button className="flex items-center gap-2.5 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-all backdrop-blur-sm border border-white/10">
            <Play className="w-4 h-4" />
            <span className="text-sm uppercase tracking-wider">Play Documentary</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default GalleryPreview;
