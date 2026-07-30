import { Link } from 'react-router-dom';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Instagram,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { IsoIcon, IafIcon } from '../layout/OfficialEmblems';

const Footer = () => {
  const quickLinks = [
    { label: 'About Us', path: '/about' },
    { label: 'Our Programmes', path: '/projects' },
    { label: 'Citizen Services', path: '/services' },
    { label: 'Media Centre', path: '/media' },
    { label: 'Careers', path: '/careers' },
    { label: 'Contact Us', path: '/contact' },
  ];

  const resources = [
    { label: 'Annual Reports', path: '/downloads#reports' },
    { label: 'Policy Documents', path: '/downloads#policies' },
    { label: 'Transparency Portal', path: '/transparency' },
    { label: 'Photo Gallery', path: '/gallery' },
  ];

  const programmes = [
    { label: 'Maha-Agri Project', path: '/projects#maha-agri' },
    { label: 'Mee Swayamsevika', path: '/projects#swayamsevika' },
    { label: 'Drone Services', path: '/projects#drones' },
    { label: 'Emergency QR Network', path: '/services#emergency' },
  ];

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Youtube, href: '#', label: 'YouTube' },
    { icon: Instagram, href: '#', label: 'Instagram' },
  ];

  return (
    <footer className="bg-primary-950 text-primary-200">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white rounded flex items-center justify-center">
                <Building2 className="w-8 h-8 text-primary-900" />
              </div>
              <div>
                <div className="font-bold text-white text-lg tracking-tight">
                  ABHINAV BHARAT FOUNDATION
                </div>
                <div className="text-xs text-primary-400 font-medium uppercase tracking-wider">
                  Registered Under Companies Act, 2013
                </div>
              </div>
            </Link>

            <p className="text-sm text-primary-400 leading-relaxed mb-6 max-w-md">
              Empowering communities through innovation, agriculture, and sustainable development.
              Working towards a self-reliant and prosperous rural Maharashtra since 2015.
            </p>

            <div className="space-y-3 text-sm">
              <a href="mailto:info@abhinavbharatfoundation.org" className="flex items-center gap-2.5 text-primary-300 hover:text-white transition-colors">
                <Mail className="w-4 h-4" />
                info@abhinavbharatfoundation.org
              </a>
              <a href="tel:+911800123456" className="flex items-center gap-2.5 text-primary-300 hover:text-white transition-colors">
                <Phone className="w-4 h-4" />
                1800-123-456 (Toll Free)
              </a>
              <div className="flex items-start gap-2.5 text-primary-300">
                <MapPin className="w-4 h-4 mt-0.5" />
                <span>Foundation House, Sector 15, Hinjewadi,<br />Pune, Maharashtra 411057</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="inline-flex items-center gap-1 text-sm text-primary-300 hover:text-white transition-colors group"
                  >
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -ml-3 group-hover:ml-0 transition-all" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Programmes */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Our Programmes
            </h4>
            <ul className="space-y-2.5">
              {programmes.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="inline-flex items-center gap-1 text-sm text-primary-300 hover:text-white transition-colors group"
                  >
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -ml-3 group-hover:ml-0 transition-all" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Resources
            </h4>
            <ul className="space-y-2.5">
              {resources.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="inline-flex items-center gap-1 text-sm text-primary-300 hover:text-white transition-colors group"
                  >
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -ml-3 group-hover:ml-0 transition-all" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Our Certifications */}
      <div className="border-t border-primary-800 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-3">
            <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-[0.2em]">Our Certifications</p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <div className="flex items-center gap-2 px-4 py-2 rounded border border-primary-700 bg-primary-900/60">
                <IsoIcon className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-[10px] font-bold text-white leading-none">ISO 9001:2015</div>
                  <div className="text-[9px] text-primary-400 leading-none mt-0.5">Quality Certified</div>
                </div>
                <ShieldCheck className="w-3 h-3 text-blue-400 ml-1" />
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded border border-primary-700 bg-primary-900/60">
                <IafIcon className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-[10px] font-bold text-white leading-none">IAF Accreditation</div>
                  <div className="text-[9px] text-primary-400 leading-none mt-0.5">Internationally Accredited</div>
                </div>
                <ShieldCheck className="w-3 h-3 text-blue-400 ml-1" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-primary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-xs text-primary-500 text-center md:text-left">
              © {new Date().getFullYear()} Abhinav Bharat Foundation. All rights reserved.
              <span className="ml-2">Registered under Companies Act, 2013.</span>
            </div>

            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 rounded bg-primary-800 flex items-center justify-center text-primary-400 hover:bg-primary-700 hover:text-white transition-colors"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>

            <div className="flex items-center gap-4 text-xs text-primary-500">
              <Link to="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <span className="hidden sm:inline text-primary-700">|</span>
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms of Use
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
