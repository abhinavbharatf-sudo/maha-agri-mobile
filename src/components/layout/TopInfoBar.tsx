import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Phone,
  Mail,
  Accessibility,
  Globe,
  ChevronDown,
  LogIn,
  Shield,
} from 'lucide-react';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'mr', label: 'मराठी' },
  { code: 'hi', label: 'हिन्दी' },
];

const divider = 'hidden md:block w-px h-3.5 bg-primary-700/70 shrink-0';

const TopInfoBar = () => {
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState(languages[0]);

  return (
    <div className="bg-primary-950 border-b border-primary-800/60 backdrop-blur-sm">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex lg:grid lg:grid-cols-3 items-center justify-between gap-x-4 h-9 text-primary-300"
          style={{ opacity: 0.9 }}
        >
          {/* LEFT: Email + Phone */}
          <div className="flex items-center justify-start gap-4 lg:gap-6 min-w-0">
            <a
              href="mailto:info@abhinavbharatfoundation.org"
              className="group flex items-center gap-2 hover:text-white transition-colors duration-200 min-w-0"
            >
              <Mail className="w-3.5 h-3.5 text-primary-400 group-hover:text-accent-saffron-400 transition-colors duration-200 shrink-0" />
              <span className="text-[14px] font-medium truncate">info@abhinavbharatfoundation.org</span>
            </a>

            <span className={divider} />

            <a
              href="tel:+919075510234"
              className="group hidden md:flex items-center gap-2 hover:text-white transition-colors duration-200 shrink-0"
            >
              <Phone className="w-3.5 h-3.5 text-primary-400 group-hover:text-accent-saffron-400 transition-colors duration-200" />
              <span className="text-[14px] font-medium whitespace-nowrap">+91 9075510234</span>
            </a>
          </div>

          {/* CENTER: Slogan (desktop only, centered in its own grid track) */}
          <div className="hidden lg:flex items-center justify-center gap-2 min-w-0">
            <Shield className="w-3.5 h-3.5 text-accent-saffron-400 shrink-0" />
            <span className="text-[14px] font-medium tracking-wide text-primary-200 whitespace-nowrap">
              Empowering Communities Since 2016
            </span>
          </div>

          {/* RIGHT: Accessibility + Language + Login */}
          <div className="flex items-center justify-end gap-4 lg:gap-6 min-w-0">
            <button
              className="group hidden md:flex items-center gap-1.5 hover:text-white transition-colors duration-200 shrink-0"
              aria-label="Accessibility"
            >
              <Accessibility className="w-3.5 h-3.5 text-primary-400 group-hover:text-accent-saffron-400 transition-colors duration-200" />
              <span className="text-[14px] font-medium whitespace-nowrap">Accessibility</span>
            </button>

            <span className="hidden md:block w-px h-3.5 bg-primary-700/70 shrink-0" />

            {/* Language Selector */}
            <div
              className="relative flex items-center shrink-0"
              onMouseEnter={() => setLangOpen(true)}
              onMouseLeave={() => setLangOpen(false)}
            >
              <button className="group flex items-center gap-1.5 hover:text-white transition-colors duration-200">
                <Globe className="w-3.5 h-3.5 text-primary-400 group-hover:text-accent-saffron-400 transition-colors duration-200" />
                <span className="text-[14px] font-medium whitespace-nowrap">{lang.label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
              </button>

              {langOpen && (
                <div className="absolute top-full right-0 mt-1 bg-primary-900 border border-primary-700/60 rounded shadow-lg py-1 min-w-[120px] z-50">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLang(l);
                        setLangOpen(false);
                      }}
                      className={`block w-full text-left px-3 py-1.5 text-[13px] transition-colors duration-150 ${
                        lang.code === l.code
                          ? 'text-accent-saffron-400 bg-primary-800/50'
                          : 'text-primary-300 hover:text-white hover:bg-primary-800/40'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="hidden md:block w-px h-3.5 bg-primary-700/70 shrink-0" />

            <Link
              to="/login"
              className="group flex items-center gap-1.5 hover:text-white transition-colors duration-200 shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 text-primary-400 group-hover:text-accent-saffron-400 transition-colors duration-200" />
              <span className="text-[14px] font-medium whitespace-nowrap">Login</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TopInfoBar;
