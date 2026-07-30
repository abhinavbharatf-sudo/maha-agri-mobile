import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  ChevronDown,
  Landmark,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import TopInfoBar from './TopInfoBar';
import {
  AshokaEmblemIcon,
  NgoDarpanIcon,
  UdyamMsmeIcon,
  TaxSealIcon,
  CsrMcaIcon,
} from './OfficialEmblems';

const navLinks: { label: string; path: string; submenu?: { label: string; path: string; desc: string }[]; isNew?: boolean }[] = [
  { label: 'Home', path: '/' },
  {
    label: 'About',
    path: '/about',
    submenu: [
      { label: 'Foundation Story', path: '/about#story', desc: 'Our journey since 2015' },
      { label: 'Leadership', path: '/about#leadership', desc: 'Meet our team' },
      { label: 'Partners', path: '/about#partners', desc: 'Collaborators' },
    ],
  },
  {
    label: 'Programmes',
    path: '/projects',
    submenu: [
      { label: 'Maha-Agri', path: '/projects#maha-agri', desc: 'Agricultural transformation' },
      { label: 'Mee Swayamsevika', path: '/projects#swayamsevika', desc: 'Women empowerment' },
      { label: 'Startup Fund', path: '/projects#startup', desc: 'Rural entrepreneurship mission' },
      { label: 'Drone Services', path: '/projects#drones', desc: 'Technology solutions' },
      { label: 'Training & EDP', path: '/projects#training', desc: 'Skill development' },
    ],
  },
  { label: 'Services', path: '/services' },
  { label: 'Media', path: '/media' },
  { label: 'Gallery', path: '/gallery' },
  { label: 'Careers', path: '/careers' },
  { label: 'Transparency', path: '/transparency' },
  { label: 'Start-Up Fund', path: '/projects#startup', isNew: true },
  { label: 'Contact', path: '/contact' },
];

const trustBadges = [
  {
    icon: AshokaEmblemIcon,
    name: 'CIN',
    number: 'U85500MH2023NPL413850',
    statusLabel: 'MCA REGISTERED',
  },
  {
    icon: UdyamMsmeIcon,
    name: 'MSME',
    number: 'UDYAM-MH-34-0031485',
    statusLabel: 'MSME REGISTERED',
  },
  {
    icon: NgoDarpanIcon,
    name: 'NGO DARPAN',
    number: 'MH/2023/0342816',
    statusLabel: 'RECOGNIZED',
  },
  {
    icon: TaxSealIcon,
    name: '12A',
    number: 'AAZCA6912HE20241',
    statusLabel: 'CERTIFIED',
  },
  {
    icon: TaxSealIcon,
    name: '80G',
    number: 'AAZCA6912HF20241',
    statusLabel: 'CERTIFIED',
  },
  {
    icon: CsrMcaIcon,
    name: 'CSR',
    number: 'CSR00076475',
    statusLabel: 'REGISTERED',
  },
];

const statusItems = [
  'MCA Registered',
  'Multi-Registered Organization',
  'National Presence',
  'Public Trust Compliant',
];

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setActiveMenu(null);
  }, [location.pathname]);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white shadow-lg' : 'bg-white/98 backdrop-blur-sm'
    }`}>
      <TopInfoBar />

      {/* Identity + Trust Badges */}
      <div className="bg-white border-b border-primary-100">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-1.5">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-2 lg:gap-4">

            {/* Logo + Foundation Name */}
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="relative">
                <div className="w-9 h-9 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300 ring-1 ring-primary-600/20">
                  <Landmark className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent-green-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-1.5 h-1.5 text-white" />
                </div>
              </div>
              <div>
                <div className="text-primary-900 font-bold text-sm tracking-tight leading-tight">
                  ABHINAV BHARAT FOUNDATION
                </div>
                <div className="text-[9px] text-primary-500 font-medium leading-tight mt-0.5">
                  Registered with Ministry of Corporate Affairs, Govt. of India
                </div>
              </div>
            </Link>

            {/* Trust Badges */}
            <div className="hidden md:flex items-stretch gap-1.5 lg:gap-2">
              {trustBadges.map((badge, idx) => (
                <motion.div
                  key={badge.name}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex flex-col items-center justify-between w-[88px] lg:w-[96px] px-2 py-1 rounded border border-primary-100 bg-primary-50/60 hover:bg-primary-50 hover:border-primary-200 transition-all duration-200 cursor-default"
                  title={`${badge.name} — ${badge.number}`}
                >
                  {/* Top: icon + name + VERIFIED pill */}
                  <div className="flex items-center justify-between w-full gap-1 mb-0.5">
                    <div className="flex items-center gap-1">
                      <badge.icon className="w-3.5 h-3.5 text-primary-700 shrink-0" />
                      <span className="text-[9px] font-bold text-primary-900 tracking-wide leading-none">
                        {badge.name}
                      </span>
                    </div>
                    <span className="text-[7px] font-bold bg-accent-green-500 text-white px-1 py-0.5 rounded-sm leading-none shrink-0">
                      ✔
                    </span>
                  </div>
                  {/* Registration number */}
                  <div className="text-[7px] text-primary-500 font-medium truncate w-full text-center leading-none mb-0.5">
                    {badge.number}
                  </div>
                  {/* Status */}
                  <div className="text-[7px] font-bold text-accent-green-600 uppercase tracking-wide leading-none">
                    {badge.statusLabel}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Status strip */}
          <div className="hidden lg:flex items-center gap-4 mt-1 pb-0.5">
            {statusItems.map((item) => (
              <div key={item} className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-accent-green-500 shrink-0" />
                <span className="text-[9px] font-semibold text-primary-600 tracking-wide">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-primary-950 border-b border-primary-800">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-11">
            <nav className="hidden lg:flex items-center">
              {navLinks.map((item) => (
                <div
                  key={item.path}
                  className="relative"
                  onMouseEnter={() => item.submenu && setActiveMenu(item.label)}
                  onMouseLeave={() => setActiveMenu(null)}
                >
                  <Link
                    to={item.path}
                    className={`relative px-4 h-11 flex items-center text-sm font-medium transition-colors ${
                      location.pathname === item.path
                        ? 'text-white'
                        : 'text-primary-300 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {item.label}
                      {item.isNew && (
                        <span className="text-[8px] font-bold bg-accent-green-500 text-white px-1 py-0.5 rounded leading-none">NEW</span>
                      )}
                    </span>
                    {item.submenu && (
                      <ChevronDown className={`w-4 h-4 ml-0.5 transition-transform ${activeMenu === item.label ? 'rotate-180' : ''}`} />
                    )}
                    {location.pathname === item.path && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute bottom-0 left-4 right-4 h-0.5 bg-accent-saffron-400"
                      />
                    )}
                  </Link>

                  <AnimatePresence>
                    {item.submenu && activeMenu === item.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 pt-2 -translate-x-2"
                      >
                        <div className="bg-white rounded-lg shadow-xl border border-primary-100 py-2 min-w-[240px]">
                          {item.submenu.map((sub) => (
                            <Link
                              key={sub.path}
                              to={sub.path}
                              className="block px-4 py-2.5 hover:bg-primary-50 transition-colors"
                            >
                              <div className="text-sm font-medium text-primary-900">{sub.label}</div>
                              <div className="text-xs text-primary-500 mt-0.5">{sub.desc}</div>
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </nav>

            <div className="flex items-center gap-3 ml-auto">
              <Link
                to="/contact"
                className="hidden xl:flex items-center gap-2 px-6 py-1.5 bg-accent-saffron-500 text-primary-950 text-sm font-semibold rounded hover:bg-accent-saffron-400 transition-colors"
              >
                Partner With Us
              </Link>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 text-white hover:bg-primary-800 rounded-lg transition-colors"
              >
                {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-primary-100"
          >
            <div className="max-w-[1440px] mx-auto px-6 py-4 space-y-1">
              {navLinks.map((item) => (
                <div key={item.path}>
                  <Link
                    to={item.path}
                    className={`block w-full text-left px-4 py-3 rounded-lg text-sm font-medium ${
                      location.pathname === item.path
                        ? 'bg-primary-900 text-white'
                        : 'text-primary-700 hover:bg-primary-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {item.label}
                      {item.isNew && (
                        <span className="text-[8px] font-bold bg-accent-green-500 text-white px-1 py-0.5 rounded leading-none">NEW</span>
                      )}
                    </span>
                  </Link>
                  {item.submenu && (
                    <div className="pl-4 space-y-1 mt-1">
                      {item.submenu.map((sub) => (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          className="block px-4 py-2 text-xs text-primary-500 hover:bg-primary-50 rounded"
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-4 mt-4 border-t border-primary-100">
                <Link
                  to="/contact"
                  className="block w-full text-center px-4 py-3 bg-primary-900 text-white rounded-lg font-medium"
                >
                  Partner With Us
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
