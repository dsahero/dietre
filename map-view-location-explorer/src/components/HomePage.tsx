import React from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  MapPin,
  Users,
  Shield,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Compass,
  BarChart3,
  LogIn,
  UserPlus,
  Activity,
} from 'lucide-react';
import bannerImage from '../assets/images/event_venue_banner_1789784962387.jpg';
import { EVENTS_DATA } from '../data/events';
import { INITIAL_LOCATIONS } from '../data/locations';

interface HomePageProps {
  onGoToLogin: () => void;
  onGoToSignUp: () => void;
}

const FALLBACK_BANNER =
  'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1920&q=80';

export const HomePage: React.FC<HomePageProps> = ({
  onGoToLogin,
  onGoToSignUp,
}) => {
  const scrollToAppInfo = (e: React.MouseEvent) => {
    e.preventDefault();
    const infoSection = document.getElementById('app-info');
    if (infoSection) {
      infoSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F7F2EA] text-[#38261E] flex flex-col font-sans select-none scroll-smooth">
      {/* ========================================================================= */}
      {/* 1. TOP IMAGE BANNER FIRST WITH COMPANY NAME & TOP-RIGHT AUTH BUTTONS */}
      {/* ========================================================================= */}
      <section className="relative w-full min-h-[90vh] lg:min-h-screen flex flex-col justify-between overflow-hidden">
        {/* Background Image Banner with Gradient into Content Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src={bannerImage}
            alt="Terracotta Bohemian Venue District Banner"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = FALLBACK_BANNER;
            }}
          />
          {/* Bohemian warm sunset & earthen shadow scrim */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#25140C]/85 via-[#351C12]/45 via-40% to-transparent" />
          {/* Warm linen sand feathering at the bottom edge */}
          <div className="absolute inset-x-0 bottom-0 h-28 sm:h-36 md:h-44 bg-gradient-to-b from-transparent via-[#F7F2EA]/60 via-65% to-[#F7F2EA]" />
        </div>

        {/* Top Header Bar over the Banner */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative z-20 w-full border-b border-white/15 backdrop-blur-md bg-[#25140C]/40"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            {/* Company Logo & Name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#C15C3D] text-white flex items-center justify-center shadow-lg shadow-[#C15C3D]/30">
                <Calendar className="w-5 h-5 text-[#FFDEC9]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold font-serif tracking-tight text-white">
                    EventOrbit
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-[#D49A4C] text-[#25140C] rounded-full uppercase tracking-wider">
                    Boho Host
                  </span>
                </div>
                <span className="block text-[11px] text-[#E8D5C4] font-medium">
                  Spatial Event Planning & Terracotta Venue Suite
                </span>
              </div>
            </div>

            {/* Middle Nav Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#EAD8C9]">
              <a
                href="#app-info"
                onClick={scrollToAppInfo}
                className="hover:text-white transition-colors"
              >
                App Overview
              </a>
              <a
                href="#features"
                onClick={scrollToAppInfo}
                className="hover:text-white transition-colors"
              >
                Core Features
              </a>
              <a
                href="#workflow"
                onClick={scrollToAppInfo}
                className="hover:text-white transition-colors"
              >
                Host Workflow
              </a>
            </nav>

            {/* Top-Right Header Buttons: Log In & Sign Up */}
            <div className="flex items-center gap-2.5">
              <button
                id="btn-header-login"
                type="button"
                onClick={onGoToLogin}
                className="px-4 py-2 text-xs font-semibold text-white hover:text-[#25140C] bg-white/10 hover:bg-white border border-white/25 hover:border-white rounded-xl backdrop-blur-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98]"
              >
                <LogIn className="w-3.5 h-3.5 text-[#DFAB62]" />
                <span>Log In</span>
              </button>

              <button
                id="btn-header-signup"
                type="button"
                onClick={onGoToSignUp}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#C15C3D] hover:bg-[#A84A2E] rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98]"
              >
                <UserPlus className="w-3.5 h-3.5 text-white" />
                <span>Sign Up</span>
              </button>
            </div>
          </div>
        </motion.header>

        {/* Hero Center Content in the Banner */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center my-auto py-12 space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FAF5EF]/15 border border-[#DFAB62]/30 backdrop-blur-sm text-xs font-semibold text-[#FFDEC9]">
            <Sparkles className="w-3.5 h-3.5 text-[#DFAB62]" />
            <span>Curated Bohemian Venues & Spatial Event Coordination</span>
          </div>

          {/* Prominent Company Name & Headline */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold font-serif text-white tracking-tight leading-none drop-shadow-md">
              EventOrbit
            </h1>
            <p className="text-base sm:text-xl lg:text-2xl text-[#F7ECE1] font-medium font-serif max-w-2xl mx-auto leading-snug drop-shadow-sm">
              Artisan Spatial Intelligence for Bohemian Hosts & Venue Curators
            </p>
          </div>

          <p className="text-xs sm:text-sm text-[#E6D4C3] max-w-xl mx-auto leading-relaxed">
            Curate earthy courtyards, botanical pavilions, and terracotta lofts with real-time operational status markers, live guest capacities, and seamless host coordination.
          </p>

          {/* Call To Action Buttons inside Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              id="btn-banner-signup"
              type="button"
              onClick={onGoToSignUp}
              className="w-full sm:w-auto px-7 py-3.5 bg-[#C15C3D] hover:bg-[#A84A2E] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-xl shadow-[#C15C3D]/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <span>Create Host Account</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>

            <button
              id="btn-banner-login"
              type="button"
              onClick={onGoToLogin}
              className="w-full sm:w-auto px-7 py-3.5 bg-white/15 hover:bg-white/25 text-white border border-white/30 text-xs sm:text-sm font-semibold rounded-2xl backdrop-blur-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <LogIn className="w-4 h-4 text-[#DFAB62]" />
              <span>Host Log In</span>
            </button>
          </div>
        </motion.div>
      </section>

      {/* ========================================================================= */}
      {/* 2. INFORMATION ABOUT THE APP (REACHED UPON SCROLLING DOWN) */}
      {/* ========================================================================= */}
      <div id="app-info" className="w-full">
        {/* Section A: App Overview & Live Workspace Demonstration */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: What the app does */}
            <motion.div
              initial={{ opacity: 0, x: -28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="lg:col-span-7 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3D2317] text-[#DFAB62] text-xs font-semibold">
                <Activity className="w-3.5 h-3.5 text-[#DFAB62]" />
                <span>Unified Bohemian Venue Management</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold font-serif text-[#2B170F] tracking-tight leading-tight">
                Complete Command Over Your Earthen Venues, Schedules & Attendees
              </h2>

              <p className="text-sm text-[#61493C] leading-relaxed font-normal">
                EventOrbit brings warmth and clarity to modern event hosting. Replace clinical spreadsheets with an earthy, spatial canvas designed for creators and venue stewards.
              </p>

              <div className="space-y-3.5 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-[#EAE0D2] text-[#687C64] border border-[#CBD8C9] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#2B170F]">
                      Interactive Spatial Venue Map
                    </h4>
                    <p className="text-xs text-[#6B5549]">
                      Filter courtyards and lofts by operational readiness: Operational (Terracotta), Verified (Olive Sage), or Pending (Golden Ochre).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-[#EAE0D2] text-[#687C64] border border-[#CBD8C9] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#2B170F]">
                      Live RSVP & Gathering Capacities
                    </h4>
                    <p className="text-xs text-[#6B5549]">
                      Keep track of guest counts, seating arrangements, event dates, and categories like Gastronomy, Craft Workshops, and Music.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-[#EAE0D2] text-[#687C64] border border-[#CBD8C9] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#2B170F]">
                      Unified Host Profile & Security
                    </h4>
                    <p className="text-xs text-[#6B5549]">
                      Custom avatar management, email updates, password protection, and account settings designed for trusted venue credentials.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onGoToSignUp}
                  className="px-5 py-2.5 bg-[#C15C3D] hover:bg-[#A84A2E] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Register as Host</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#FFDEC9]" />
                </button>
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="px-4 py-2.5 text-xs font-semibold text-[#7C513D] hover:text-[#2B170F] underline cursor-pointer"
                >
                  Existing Host Log In →
                </button>
              </div>
            </motion.div>

            {/* Right Column: Interactive Live App Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 28, scale: 0.97 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.65, delay: 0.1, ease: 'easeOut' }}
              className="lg:col-span-5"
            >
              <div className="bg-[#EFE5D8] rounded-3xl border border-[#DFCEBD] shadow-xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#DFCEBD]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#C15C3D]" />
                    <div className="w-3 h-3 rounded-full bg-[#D49A4C]" />
                    <div className="w-3 h-3 rounded-full bg-[#687C64]" />
                    <span className="text-xs font-bold font-serif text-[#2B170F] ml-2">
                      Live App Interface Preview
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-[#F2F5F1] text-[#687C64] px-2.5 py-0.5 rounded-full border border-[#CBD8C9]">
                    Host Active
                  </span>
                </div>

                {/* Event Card preview */}
                <div className="bg-[#FAF5EF] rounded-2xl border border-[#DFCEBD] p-4 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C15C3D] bg-[#FBECE6] px-2 py-0.5 rounded-md border border-[#F2C7B6]">
                      Featured Gathering
                    </span>
                    <span className="text-xs font-semibold text-[#61493C] flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#A5826F]" />
                      {EVENTS_DATA[0]?.participants || 420} Guests Registered
                    </span>
                  </div>
                  <h4 className="text-sm font-bold font-serif text-[#2B170F]">
                    {EVENTS_DATA[0]?.name || 'Sunset Terracotta Gathering'}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-[#7A6052]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#A5826F]" />
                      {EVENTS_DATA[0]?.date || 'Oct 14, 2026'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#A5826F]" />
                      {EVENTS_DATA[0]?.locationName || "Amy's Kitchen & Bistro"}
                    </span>
                  </div>
                </div>

                {/* Venue Status Indicators Preview */}
                <div className="bg-[#FAF5EF] rounded-2xl border border-[#DFCEBD] p-4 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#2B170F] flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-[#C15C3D]" />
                      Terracotta Spatial Venue Markers
                    </span>
                    <span className="text-[11px] font-mono text-[#7A6052]">
                      {INITIAL_LOCATIONS.length} Active Venues
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2 bg-[#FBECE6] rounded-xl border border-[#F2C7B6]">
                      <span className="block text-[11px] font-bold text-[#C15C3D]">
                        Operational
                      </span>
                      <span className="text-[10px] text-[#A84A2E] font-medium">Terracotta</span>
                    </div>
                    <div className="p-2 bg-[#F2F5F1] rounded-xl border border-[#CBD8C9]">
                      <span className="block text-[11px] font-bold text-[#687C64]">
                        Verified
                      </span>
                      <span className="text-[10px] text-[#546650] font-medium">Sage Olive</span>
                    </div>
                    <div className="p-2 bg-[#FDF6EC] rounded-xl border border-[#EED9BD]">
                      <span className="block text-[11px] font-bold text-[#D49A4C]">
                        Pending
                      </span>
                      <span className="text-[10px] text-[#9A6E32] font-medium">Sun Ochre</span>
                    </div>
                  </div>
                </div>

                {/* Host session summary */}
                <div className="flex items-center justify-between p-3 bg-[#351C12] text-[#FAF5EF] rounded-xl border border-[#522E1F]">
                  <div className="flex items-center gap-2.5">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
                      alt="Host Avatar"
                      className="w-8 h-8 rounded-full object-cover border border-[#DFAB62]"
                    />
                    <div>
                      <span className="block text-xs font-bold leading-tight">Lily Dritten</span>
                      <span className="block text-[10px] text-[#D8C2AF]">Lead Venue Host</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onGoToLogin}
                    className="text-[11px] font-bold text-[#DFAB62] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Host Access</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section B: Core Feature Deep-Dive */}
        <section id="features" className="py-16 bg-[#EFE5D8]/80 border-y border-[#DFCEBD]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-3xl mx-auto mb-12 space-y-2"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-[#8A5A43] bg-[#FAF5EF] px-3 py-1 rounded-full border border-[#DFCEBD]">
                Crafted Capabilities
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold font-serif text-[#2B170F] tracking-tight">
                Built to Power the Entire Bohemian Event Lifecycle
              </h3>
              <p className="text-xs sm:text-sm text-[#6B5549]">
                Everything an artisan event host needs from courtyard scouting to live atmospheric execution.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: MapPin,
                  title: 'Spatial Venue Map',
                  desc: 'Explore curated venues on an interactive map. Filter by Operational (Terracotta), Verified (Sage), and Pending (Ochre) with instant location cards.',
                  delay: 0,
                },
                {
                  icon: BarChart3,
                  title: 'Attendance & Gathering Grid',
                  desc: 'Monitor RSVP numbers, dates, and venue linkages. Categorize easily by Gastronomy, Craft Workshops, Ecology, and Music.',
                  delay: 0.12,
                },
                {
                  icon: Shield,
                  title: 'Host Profile & Security',
                  desc: 'Manage host profiles with custom avatars, secure password updates, email address synchronization, and verified credentials.',
                  delay: 0.24,
                },
              ].map((feat, idx) => {
                const IconComp = feat.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 25 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.5, delay: feat.delay, ease: 'easeOut' }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="bg-[#FAF5EF] p-6 rounded-3xl border border-[#DFCEBD] shadow-xs space-y-3 transition-shadow hover:shadow-md hover:border-[#C15C3D]/40"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-[#3D2317] text-white flex items-center justify-center shadow-xs">
                      <IconComp className="w-5 h-5 text-[#DFAB62]" />
                    </div>
                    <h4 className="text-base font-bold font-serif text-[#2B170F]">
                      {feat.title}
                    </h4>
                    <p className="text-xs text-[#6B5549] leading-relaxed">
                      {feat.desc}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section C: 3-Step Host Workflow */}
        <section id="workflow" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto mb-12 space-y-2"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-[#8A5A43] bg-[#FAF5EF] px-3 py-1 rounded-full border border-[#DFCEBD]">
              Host Guide
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold font-serif text-[#2B170F] tracking-tight">
              Get Started in Three Mindful Steps
            </h3>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: 1,
                title: 'Create Your Host Account',
                desc: 'Provide your name, email, and password credentials via our streamlined host registration form.',
                delay: 0,
              },
              {
                step: 2,
                title: 'Map & Verify Venues',
                desc: 'Assign event locations, check operational readiness on the spatial map, and review addresses.',
                delay: 0.12,
              },
              {
                step: 3,
                title: 'Host With Atmosphere',
                desc: 'Track guest counts, coordinate day-of activities, and manage host operations from the dashboard.',
                delay: 0.24,
              },
            ].map((st, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: st.delay, ease: 'easeOut' }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-[#FAF5EF] p-6 rounded-3xl border border-[#DFCEBD] space-y-3 shadow-xs hover:shadow-md"
              >
                <span className="w-8 h-8 rounded-full bg-[#C15C3D] text-white font-bold font-serif text-xs flex items-center justify-center shadow-xs">
                  {st.step}
                </span>
                <h4 className="text-sm font-bold font-serif text-[#2B170F]">{st.title}</h4>
                <p className="text-xs text-[#6B5549] leading-relaxed">
                  {st.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Section D: Call To Action Banner */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 25 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="bg-gradient-to-br from-[#351C12] via-[#4A2718] to-[#25140C] text-[#FAF5EF] rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl border border-[#6B3E29]"
          >
            <h3 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white">
              Ready to Upgrade Your Bohemian Event Hosting Workflow?
            </h3>
            <p className="text-xs sm:text-sm text-[#E2D0BE] max-w-xl mx-auto leading-relaxed">
              Join boutique coordinators and venue stewards using EventOrbit for unified spatial planning.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                id="btn-bottom-signup"
                type="button"
                onClick={onGoToSignUp}
                className="w-full sm:w-auto px-6 py-3 bg-[#C15C3D] hover:bg-[#A84A2E] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4 text-white" />
                <span>Create Host Account</span>
              </button>

              <button
                id="btn-bottom-login"
                type="button"
                onClick={onGoToLogin}
                className="w-full sm:w-auto px-6 py-3 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs sm:text-sm rounded-2xl border border-white/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4 text-[#DFAB62]" />
                <span>Host Log In</span>
              </button>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#DFCEBD] bg-[#EFE5D8]/70 py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-[#7A6052]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#C15C3D] text-white flex items-center justify-center shadow-xs">
                <Calendar className="w-3.5 h-3.5 text-[#FFDEC9]" />
              </div>
              <span className="font-bold font-serif text-[#2B170F]">EventOrbit</span>
              <span>— Terracotta Bohemian Event Platform</span>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-[#61493C]">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="hover:text-[#2B170F] cursor-pointer"
              >
                Back to Top ↑
              </button>
              <button
                type="button"
                onClick={onGoToLogin}
                className="hover:text-[#2B170F] cursor-pointer"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={onGoToSignUp}
                className="hover:text-[#2B170F] cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
