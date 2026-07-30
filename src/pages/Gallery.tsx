import { motion } from 'framer-motion';
import { useState } from 'react';
import { Camera, Play, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const galleryImages = [
  {
    id: 1,
    src: 'https://images.pexels.com/photos/2889440/pexels-photo-2889440.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Agricultural Training Session',
    category: 'Agriculture',
    year: '2024',
  },
  {
    id: 2,
    src: 'https://images.pexels.com/photos/3184294/pexels-photo-3184294.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Women Self Help Group Meeting',
    category: 'Women Empowerment',
    year: '2024',
  },
  {
    id: 3,
    src: 'https://images.pexels.com/photos/4425873/pexels-photo-4425873.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Drone Technology in Action',
    category: 'Technology',
    year: '2024',
  },
  {
    id: 4,
    src: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Community Health Camp',
    category: 'Health',
    year: '2023',
  },
  {
    id: 5,
    src: 'https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Youth Training Program',
    category: 'Training',
    year: '2023',
  },
  {
    id: 6,
    src: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Leadership Meeting',
    category: 'Events',
    year: '2024',
  },
  {
    id: 7,
    src: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Field Visit',
    category: 'Field Work',
    year: '2023',
  },
  {
    id: 8,
    src: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Farmer Interaction',
    category: 'Agriculture',
    year: '2023',
  },
  {
    id: 9,
    src: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Workshop Session',
    category: 'Training',
    year: '2024',
  },
  {
    id: 10,
    src: 'https://images.pexels.com/photos/3184315/pexels-photo-3184315.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Team Building',
    category: 'Events',
    year: '2024',
  },
  {
    id: 11,
    src: 'https://images.pexels.com/photos/1595385/pexels-photo-1595385.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Equipment Distribution',
    category: 'Field Work',
    year: '2023',
  },
  {
    id: 12,
    src: 'https://images.pexels.com/photos/1595391/pexels-photo-1595391.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Community Gathering',
    category: 'Events',
    year: '2023',
  },
];

const videos = [
  { id: 1, title: 'Our Journey - Documentary', duration: '12:45', thumbnail: 'https://images.pexels.com/photos/2889440/pexels-photo-2889440.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: 2, title: 'Maha-Agri Impact Story', duration: '8:30', thumbnail: 'https://images.pexels.com/photos/4425873/pexels-photo-4425873.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: 3, title: 'Women of Change', duration: '15:20', thumbnail: 'https://images.pexels.com/photos/3184294/pexels-photo-3184294.jpeg?auto=compress&cs=tinysrgb&w=400' },
];

const Gallery = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos');

  const categories = ['all', 'Agriculture', 'Women Empowerment', 'Technology', 'Health', 'Training', 'Events', 'Field Work'];

  const filteredImages = activeFilter === 'all'
    ? galleryImages
    : galleryImages.filter(img => img.category === activeFilter);

  const currentIndex = selectedImage !== null
    ? filteredImages.findIndex(img => img.id === selectedImage)
    : -1;

  const handlePrev = () => {
    if (currentIndex > 0) {
      setSelectedImage(filteredImages[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredImages.length - 1) {
      setSelectedImage(filteredImages[currentIndex + 1].id);
    }
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
              <Camera className="w-4 h-4" />
              Gallery
            </div>
            <h1 className="text-display-2 font-bold mb-6">
              Capturing Moments of
              <span className="block text-primary-200">Transformation</span>
            </h1>
            <p className="text-xl text-primary-200 leading-relaxed">
              Visual stories of impact, empowerment, and community building from across Maharashtra.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tabs */}
      <section className="bg-white border-b border-primary-100">
        <div className="container-premium">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('photos')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'photos'
                  ? 'text-primary-900 border-primary-900'
                  : 'text-primary-500 border-transparent hover:text-primary-700'
              }`}
            >
              <Camera className="w-4 h-4 inline mr-2" />
              Photos ({galleryImages.length})
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'videos'
                  ? 'text-primary-900 border-primary-900'
                  : 'text-primary-500 border-transparent hover:text-primary-700'
              }`}
            >
              <Play className="w-4 h-4 inline mr-2" />
              Videos ({videos.length})
            </button>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding bg-white">
        <div className="container-premium">
          {activeTab === 'photos' && (
            <>
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
                    {category === 'all' ? 'All' : category}
                  </button>
                ))}
              </div>

              {/* Gallery Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredImages.map((image, index) => (
                  <motion.div
                    key={image.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    onClick={() => setSelectedImage(image.id)}
                    className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                  >
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-sm font-medium truncate">{image.alt}</p>
                      <p className="text-white/70 text-xs">{image.category} | {image.year}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'videos' && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          )}
        </div>
      </section>

      {/* Lightbox */}
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-8 h-8" />
          </button>

          {currentIndex > 0 && (
            <button
              className="absolute left-4 p-2 text-white/70 hover:text-white"
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            >
              <ChevronLeft className="w-10 h-10" />
            </button>
          )}

          {currentIndex < filteredImages.length - 1 && (
            <button
              className="absolute right-4 p-2 text-white/70 hover:text-white"
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
            >
              <ChevronRight className="w-10 h-10" />
            </button>
          )}

          <div className="max-w-5xl max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={filteredImages[currentIndex]?.src}
              alt={filteredImages[currentIndex]?.alt}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <p className="text-center text-white mt-4">{filteredImages[currentIndex]?.alt}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Gallery;
