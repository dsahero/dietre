"use client";

import React from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  MapPin,
  Shield,
  ArrowRight,
  Sparkles,
  Compass,
  BarChart3,
  LogIn,
  UserPlus,
  Activity,
  ShieldAlert,
} from 'lucide-react';

const BANNER_IMAGE = '/images/event_venue_banner_1789784962387.jpg';
const FALLBACK_BANNER =
  'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1920&q=80';

const DEMO_EVENT_PATH = '/events/demo-vt-hacks';
const DEMO_GUEST_FORM_PATH = '/r/demo-vt-hacks';

export function HomePageView() {
  const router = useRouter();

  const handleGoToLogin = () => {
    router.push('/login');
  };

  const handleExploreDemo = () => {
    router.push(DEMO_EVENT_PATH);
  };

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
      {/* 1. TOP IMAGE BANNER WITH COMPANY NAME & TOP-RIGHT AUTH BUTTONS */}
      {/* ========================================================================= */}
      <section className="relative w-full min-h-[90vh] lg:min-h-screen flex flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src={BANNER_IMAGE}
            alt="Warm catering table for a large event"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = FALLBACK_BANNER;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#25140C]/85 via-[#351C12]/45 via-40% to-transparent" />
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
                <span className="text-xl font-bold font-serif tracking-tight text-white">DietRe</span>
                <span className="block text-[11px] text-[#E8D5C4] font-medium">
                  Anonymous dietary matching for large events
                </span>
              </div>
            </div>

            {/* Middle Nav Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#EAD8C9]">
              <a href="#app-info" onClick={scrollToAppInfo} className="hover:text-white transition-colors">
                How it works
              </a>
              <a href="#features" onClick={scrollToAppInfo} className="hover:text-white transition-colors">
                Core Features
              </a>
              <a href="#workflow" onClick={scrollToAppInfo} className="hover:text-white transition-colors">
                Host Workflow
              </a>
              <button onClick={handleExploreDemo} className="hover:text-white transition-colors cursor-pointer">
                Live Demo
              </button>
            </nav>

            {/* Top-Right Header Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                id="btn-header-login"
                type="button"
                onClick={handleGoToLogin}
                className="px-4 py-2 text-xs font-semibold text-white hover:text-[#25140C] bg-white/10 hover:bg-white border border-white/25 hover:border-white rounded-xl backdrop-blur-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98]"
              >
                <LogIn className="w-3.5 h-3.5 text-[#DFAB62]" />
                <span>Host Log In</span>
              </button>

              <button
                id="btn-header-signup"
                type="button"
                onClick={handleGoToLogin}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#C15C3D] hover:bg-[#A84A2E] rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98]"
              >
                <UserPlus className="w-3.5 h-3.5 text-white" />
                <span>Create Event</span>
              </button>
            </div>
          </div>
        </motion.header>

        {/* Hero Center Content */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center my-auto py-12 space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FAF5EF]/15 border border-[#DFAB62]/30 backdrop-blur-sm text-xs font-semibold text-[#FFDEC9]">
            <Sparkles className="w-3.5 h-3.5 text-[#DFAB62]" />
            <span>When2meet for catering</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold font-serif text-white tracking-tight leading-none drop-shadow-md">
              DietRe
            </h1>
            <p className="text-base sm:text-xl lg:text-2xl text-[#F7ECE1] font-medium font-serif max-w-2xl mx-auto leading-snug drop-shadow-sm">
              Anonymous, ingredient-level dietary matching for events too large to poll by vote
            </p>
          </div>

          <p className="text-xs sm:text-sm text-[#E6D4C3] max-w-xl mx-auto leading-relaxed">
            Ask 30–300+ people what they eat. No names, no checkboxes — just a sentence in their own
            words, turned into restaurant rankings and safe menu items.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              id="btn-banner-signup"
              type="button"
              onClick={handleGoToLogin}
              className="w-full sm:w-auto px-7 py-3.5 bg-[#C15C3D] hover:bg-[#A84A2E] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-xl shadow-[#C15C3D]/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <span>Host an Event</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>

            <button
              id="btn-banner-demo"
              type="button"
              onClick={handleExploreDemo}
              className="w-full sm:w-auto px-7 py-3.5 bg-white/15 hover:bg-white/25 text-white border border-white/30 text-xs sm:text-sm font-semibold rounded-2xl backdrop-blur-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <Compass className="w-4 h-4 text-[#DFAB62]" />
              <span>Explore the Live Demo</span>
            </button>
          </div>
        </motion.div>
      </section>

      {/* ========================================================================= */}
      {/* 2. INFORMATION ABOUT THE APP */}
      {/* ========================================================================= */}
      <div id="app-info" className="w-full">
        {/* Section A: App Overview & Live Preview */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="lg:col-span-7 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3D2317] text-[#DFAB62] text-xs font-semibold">
                <Activity className="w-3.5 h-3.5 text-[#DFAB62]" />
                <span>Built for events, not friend groups</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold font-serif text-[#2B170F] tracking-tight leading-tight">
                Replace the &quot;who can&apos;t eat the pork?&quot; thread with real answers
              </h2>

              <p className="text-sm text-[#61493C] leading-relaxed font-normal">
                DietRe reads a diet and resolves it — into restaurant rankings a caterer can actually act
                on, and safe menu items rather than a checkbox list that flattens allergies, religious
                practice, and preference into one category.
              </p>

              <div className="space-y-3.5 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-[#EAE0D2] text-[#687C64] border border-[#CBD8C9] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#2B170F]">Anonymous by design</h4>
                    <p className="text-xs text-[#6B5549]">
                      Guests are identified only by a rotating token — &quot;Guest 07&quot;, never a name.
                      No login, no avatar, no account.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-[#EAE0D2] text-[#687C64] border border-[#CBD8C9] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#2B170F]">Ingredient-level matching</h4>
                    <p className="text-xs text-[#6B5549]">
                      Hard excludes collide with estimated ingredients — pork, gluten, shellfish,
                      meat-dairy combos — not a restaurant&apos;s self-tagged checkbox.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-[#EAE0D2] text-[#687C64] border border-[#CBD8C9] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#2B170F]">Zero-match alerts</h4>
                    <p className="text-xs text-[#6B5549]">
                      If a guest has no safe option anywhere in range, the host sees an anonymous flag —
                      plus an email only if that guest chose to leave one.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleGoToLogin}
                  className="px-5 py-2.5 bg-[#C15C3D] hover:bg-[#A84A2E] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Host an Event</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#FFDEC9]" />
                </button>
                <button
                  type="button"
                  onClick={() => router.push(DEMO_GUEST_FORM_PATH)}
                  className="px-4 py-2.5 text-xs font-semibold text-[#7C513D] hover:text-[#2B170F] underline cursor-pointer"
                >
                  Try the anonymous guest form →
                </button>
              </div>
            </motion.div>

            {/* Right Column: Illustrative Preview — no real names, no real data */}
            <motion.div
              initial={{ opacity: 0, x: 28, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
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
                      Host Dashboard Preview
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-[#F2F5F1] text-[#687C64] px-2.5 py-0.5 rounded-full border border-[#CBD8C9]">
                    Illustrative
                  </span>
                </div>

                {/* Restaurant match preview */}
                <div className="bg-[#FAF5EF] rounded-2xl border border-[#DFCEBD] p-4 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C15C3D] bg-[#FBECE6] px-2 py-0.5 rounded-md border border-[#F2C7B6]">
                      Top Ranked
                    </span>
                    <span className="text-xs font-semibold text-[#61493C] font-mono">
                      92% · 13 of 14 matched
                    </span>
                  </div>
                  <h4 className="text-sm font-bold font-serif text-[#2B170F]">Downtown kitchen, 1.4 mi</h4>
                  <div className="flex items-center gap-3 text-xs text-[#7A6052]">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#A5826F]" />
                      Within radius &amp; budget
                    </span>
                  </div>
                </div>

                {/* Anonymous response preview */}
                <div className="bg-[#FAF5EF] rounded-2xl border border-[#DFCEBD] p-4 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#2B170F] font-mono">Guest 07</span>
                    <span className="text-[10px] font-bold uppercase bg-[#FBECE6] text-[#A84A2E] px-2 py-0.5 rounded-full border border-[#F2C7B6]">
                      High constraint
                    </span>
                  </div>
                  <p className="text-xs text-[#6B5549] italic leading-relaxed">
                    &quot;No pork, no meat and dairy together, don&apos;t care about certification.&quot;
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FBECE6] text-[#A84A2E] border border-[#F2C7B6]">
                      no pork
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FBECE6] text-[#A84A2E] border border-[#F2C7B6]">
                      no meat+dairy combo
                    </span>
                  </div>
                </div>

                {/* Zero-match alert preview */}
                <div className="flex items-center justify-between p-3 bg-[#351C12] text-[#FAF5EF] rounded-xl border border-[#522E1F]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#C15C3D]/20 border border-[#C15C3D]/50 flex items-center justify-center">
                      <ShieldAlert className="w-4 h-4 text-[#DFAB62]" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold leading-tight">1 zero-match guest</span>
                      <span className="block text-[10px] text-[#D8C2AF]">Anonymous flag, no name shown</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleExploreDemo}
                    className="text-[11px] font-bold text-[#DFAB62] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>See it live</span>
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
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-3xl mx-auto mb-12 space-y-2"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-[#8A5A43] bg-[#FAF5EF] px-3 py-1 rounded-full border border-[#DFCEBD]">
                Core Features
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold font-serif text-[#2B170F] tracking-tight">
                Built for hosts running real headcounts
              </h3>
              <p className="text-xs sm:text-sm text-[#6B5549]">
                Weddings, corporate offsites, campus orgs, conferences — anything too large to swipe
                through as a group.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: MapPin,
                  title: 'Ranked Restaurant Matching',
                  desc: 'Restaurants ranked by how many actual responses they safely cover, weighted so the most constrained guests count more than optimizing for loose preferences.',
                  delay: 0,
                },
                {
                  icon: BarChart3,
                  title: 'Live Response Dashboard',
                  desc: 'Track responses, severity breakdown, and coverage in real time as the anonymous link gets shared and filled out.',
                  delay: 0.12,
                },
                {
                  icon: Shield,
                  title: 'Zero-Match Protection',
                  desc: 'If nobody on the menu works for someone, the host finds out before the event — not from a guest going hungry at the venue.',
                  delay: 0.24,
                },
              ].map((feat, idx) => {
                const IconComp = feat.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: feat.delay, ease: 'easeOut' }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="bg-[#FAF5EF] p-6 rounded-3xl border border-[#DFCEBD] shadow-xs space-y-3 transition-shadow hover:shadow-md hover:border-[#C15C3D]/40"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-[#3D2317] text-white flex items-center justify-center shadow-xs">
                      <IconComp className="w-5 h-5 text-[#DFAB62]" />
                    </div>
                    <h4 className="text-base font-bold font-serif text-[#2B170F]">{feat.title}</h4>
                    <p className="text-xs text-[#6B5549] leading-relaxed">{feat.desc}</p>
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
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto mb-12 space-y-2"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-[#8A5A43] bg-[#FAF5EF] px-3 py-1 rounded-full border border-[#DFCEBD]">
              Host Guide
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold font-serif text-[#2B170F] tracking-tight">
              Three steps, no spreadsheet archaeology
            </h3>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: 1,
                title: 'Create Your Event',
                desc: 'Sign in and drop a location, radius, budget, and expected headcount.',
                delay: 0,
              },
              {
                step: 2,
                title: 'Share the Anonymous Link',
                desc: 'Guests answer one open question in their own words — no name field exists.',
                delay: 0.12,
              },
              {
                step: 3,
                title: 'Get Ranked Recommendations',
                desc: 'The dashboard ranks restaurants by who they actually cover, and flags anyone with zero safe options.',
                delay: 0.24,
              },
            ].map((st, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: st.delay, ease: 'easeOut' }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-[#FAF5EF] p-6 rounded-3xl border border-[#DFCEBD] space-y-3 shadow-xs hover:shadow-md"
              >
                <span className="w-8 h-8 rounded-full bg-[#C15C3D] text-white font-bold font-serif text-xs flex items-center justify-center shadow-xs">
                  {st.step}
                </span>
                <h4 className="text-sm font-bold font-serif text-[#2B170F]">{st.title}</h4>
                <p className="text-xs text-[#6B5549] leading-relaxed">{st.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Section D: Call To Action Banner */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="bg-gradient-to-br from-[#351C12] via-[#4A2718] to-[#25140C] text-[#FAF5EF] rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl border border-[#6B3E29]"
          >
            <h3 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white">
              Ready to stop guessing what your guests can eat?
            </h3>
            <p className="text-xs sm:text-sm text-[#E2D0BE] max-w-xl mx-auto leading-relaxed">
              Seeded on real Blacksburg kitchens for the demo — create your own event in under a minute.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                id="btn-bottom-signup"
                type="button"
                onClick={handleGoToLogin}
                className="w-full sm:w-auto px-6 py-3 bg-[#C15C3D] hover:bg-[#A84A2E] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4 text-white" />
                <span>Host an Event</span>
              </button>

              <button
                id="btn-bottom-demo"
                type="button"
                onClick={handleExploreDemo}
                className="w-full sm:w-auto px-6 py-3 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs sm:text-sm rounded-2xl border border-white/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4 text-[#DFAB62]" />
                <span>Explore the Demo</span>
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
              <span className="font-bold font-serif text-[#2B170F]">DietRe</span>
              <span>— When2meet for catering</span>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-[#61493C]">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="hover:text-[#2B170F] cursor-pointer"
              >
                Back to Top ↑
              </button>
              <button type="button" onClick={handleGoToLogin} className="hover:text-[#2B170F] cursor-pointer">
                Host Log In
              </button>
              <button type="button" onClick={handleExploreDemo} className="hover:text-[#2B170F] cursor-pointer">
                Live Demo
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
