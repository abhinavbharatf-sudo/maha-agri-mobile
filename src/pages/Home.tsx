import Hero from '../components/home/Hero';
import DigitalEcosystem from '../components/home/DigitalEcosystem';
import MissionVision from '../components/home/MissionVision';
import Impact from '../components/home/Impact';
import MaharashtraMap from '../components/home/MaharashtraMap';
import FeaturedProjects from '../components/home/FeaturedProjects';
import NewsSection from '../components/home/NewsSection';
import TransparencySection from '../components/home/TransparencySection';
import GalleryPreview from '../components/home/GalleryPreview';
import StartupFundCTA from '../components/home/StartupFundCTA';

const Home = () => {
  return (
    <>
      <Hero />
      <DigitalEcosystem />
      <MissionVision />
      <Impact />
      <MaharashtraMap />
      <FeaturedProjects />
      <StartupFundCTA />
      <NewsSection />
      <TransparencySection />
      <GalleryPreview />
    </>
  );
};

export default Home;
