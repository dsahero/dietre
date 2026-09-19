"use client";

/**
 * RemixHomePageView — the remix-dietre landing page, ported into the
 * Next.js dietre app.
 *
 * Button routing:
 *   Sign Up (navbar, CTA)     → /login  (host authentication flow)
 *   Log In  (navbar, CTA)     → /login
 *   Live Demo                 → /events/demo-vt-hacks
 *   Guest Form                → /r/demo-vt-hacks
 *   Back to Top (footer)      → smooth scroll to #top
 *   Section anchors in footer → smooth scroll to section
 */

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { ForkGraphic } from './ForkGraphic';
import { DietreWordmark } from './DietreWordmark';
import { EnvelopeIcon, ChatBubbleIcon, PieChartIcon } from './FeatureCardIcons';
import { CtaUserPlusIcon, CtaLogInIcon } from './CtaIcons';
import { GreySectionTextBoxes } from './GreySectionTextBoxes';
import { PlatePattern } from './PlatePattern';
import { LowerFork } from './LowerFork';
import { useTrackProgress } from './useTrackProgress';
import './remix.css';

// Routes
const SIGNUP_PATH = '/signup';
const LOGIN_PATH = '/login';
const DEMO_EVENT_PATH = '/events/demo-vt-hacks';
const DEMO_GUEST_FORM_PATH = '/r/demo-vt-hacks';

export function RemixHomePageView() {
  const router = useRouter();
  const greyTrackRef = useRef<HTMLDivElement>(null);
  const greyProgress = useTrackProgress(greyTrackRef);

  const goToSignUp = () => router.push(SIGNUP_PATH);
  const goToLogin = () => router.push(LOGIN_PATH);
  const goToDemo = () => router.push(DEMO_EVENT_PATH);
  const goToGuestForm = () => router.push(DEMO_GUEST_FORM_PATH);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToGreySection = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('remix-grey-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToFeatures = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('remix-features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToRealEvents = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('remix-real-events')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="remix-outer">
      <main className="remix-artboard" id="top">
        {/* ==========================================================================
            SECTION 1: HEADER & HERO
            ========================================================================== */}
        <header className="remix-navbar">
          {/* Logo mark */}
          <div className="remix-logo-box">
            <span className="remix-logo-text">di</span>
            <div className="remix-logo-fork">
              <ForkGraphic
                orientation="horizontal"
                color="#D7531F"
                dropShadow="none"
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>

          {/* Nav links — scroll to main sections */}
          <button
            className="remix-nav-link remix-nav-link-1"
            onClick={scrollToGreySection}
          >
            How It Works
          </button>
          <button
            className="remix-nav-link remix-nav-link-2"
            onClick={scrollToRealEvents}
          >
            Real Events
          </button>
          <button
            className="remix-nav-link remix-nav-link-3"
            onClick={scrollToFeatures}
          >
            Core Features
          </button>
          <button
            className="remix-nav-link remix-nav-link-4"
            onClick={goToDemo}
          >
            Live Demo
          </button>

          {/* Auth buttons */}
          <button
            id="btn-signup-nav"
            className="remix-btn-signup-nav"
            onClick={goToSignUp}
          >
            Sign Up
          </button>
          <button
            id="btn-login-nav"
            className="remix-btn-login-nav"
            onClick={goToLogin}
          >
            Log In
          </button>
        </header>

        {/* HERO SECTION */}
        <div className="remix-hero-bg" />
        <motion.div
          className="remix-hero-brand-lockup"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="remix-hero-brand-title" aria-label="dietre">
            <span className="sr-only">dietre</span>
            <DietreWordmark color="#D7531F" className="remix-hero-wordmark-svg" />
          </h1>
          <motion.h2
            className="remix-hero-tagline"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            a smarter way to cater
          </motion.h2>
        </motion.div>

        {/* ==========================================================================
            SECTION 2: DARK CARD & PLATE WITH PINNED SCROLL SEQUENTIAL TEXT
            ========================================================================== */}
        <div
          className="remix-section-grey-track"
          ref={greyTrackRef}
          id="remix-grey-section"
        >
          <div className="remix-section-grey-sticky">
            {/* Concentric Decorative Discs (Plate) */}
            <div className="remix-ellipse-1" />
            <div className="remix-ellipse-2" />
            <div className="remix-ellipse-3" />

            {/* Blue Foliage Cluster nodes */}
            <PlatePattern progress={greyProgress} />

            {/* Upper Fork */}
            <div className="remix-fork-upper">
              <ForkGraphic
                rotation={33}
                color="#D7531F"
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            {/* Dark Feature Card */}
            <div className="remix-card-dark" />

            {/* Sequential scrollytelling text */}
            <GreySectionTextBoxes progress={greyProgress} />
          </div>
        </div>

        {/* ==========================================================================
            SECTION 3: IMAGE BANNER + GRADIENT OVERLAY
            ========================================================================== */}
        <div id="remix-real-events" className="remix-banner-image" />
        <div className="remix-banner-gradient" />
        <motion.h2
          className="remix-banner-title"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          Built for real events
        </motion.h2>
        <motion.p
          className="remix-banner-body"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        >
          Weddings, corporate offsites, campus orgs, conference dinners — anything
          too large to poll by group chat. dietre reads a diet and resolves it into
          restaurant rankings a caterer can actually act on, and safe menu items
          rather than a checkbox list that flattens allergies, religious practice,
          and preference into one category. Ask 30–300+ people what they eat, then
          let the dashboard do the rest.
        </motion.p>

        {/* ==========================================================================
            SECTION 4: THREE FEATURE CARDS & SECTION FORK
            ========================================================================== */}
        <div id="remix-features" className="remix-section-cards-bg" />
        <motion.h2
          className="remix-section-cards-title"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          Features
        </motion.h2>
        <motion.div
          className="remix-section-cards-divider"
          initial={{ opacity: 0, scaleX: 0 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.p
          className="remix-section-cards-subtitle"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          Ranked restaurant matching, live response dashboards, and automatic
          zero-match alerts — all without collecting any personal identifiers.
        </motion.p>

        {/* Lower Fork */}
        <LowerFork />

        {/* Feature Card 1 — Ranked Restaurants */}
        <motion.div
          className="remix-feature-card remix-card-col-1"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.05 }}
        />
        <motion.div
          className="remix-card-icon-container-1"
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <EnvelopeIcon size={64} color="#6B6055" />
        </motion.div>
        <motion.h3
          className="remix-card-title remix-card-title-1"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          Ranked Restaurants
        </motion.h3>
        <motion.p
          className="remix-card-text remix-card-text-1"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          Restaurants ranked by how many actual responses they safely cover, weighted
          so the most constrained guests count more than optimising for loose preferences.
        </motion.p>

        {/* Feature Card 2 — Live Dashboard */}
        <motion.div
          className="remix-feature-card remix-card-col-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        />
        <motion.div
          className="remix-card-icon-container-2"
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <ChatBubbleIcon size={56} color="#6B6055" />
        </motion.div>
        <motion.h3
          className="remix-card-title remix-card-title-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          Live Dashboard
        </motion.h3>
        <motion.p
          className="remix-card-text remix-card-text-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          Track responses, severity breakdown, and restaurant coverage in real time
          as the anonymous link gets shared and filled out by your guests.
        </motion.p>

        {/* Feature Card 3 — Zero-Match Alerts */}
        <motion.div
          className="remix-feature-card remix-card-col-3"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        />
        <motion.div
          className="remix-card-icon-container-3"
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <PieChartIcon size={58} color="#6B6055" />
        </motion.div>
        <motion.h3
          className="remix-card-title remix-card-title-3"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          Zero-Match Alerts
        </motion.h3>
        <motion.p
          className="remix-card-text remix-card-text-3"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
        >
          If nobody on the menu works for someone, the host finds out before the event —
          not from a guest going hungry at the venue. Anonymous flag, no name shown.
        </motion.p>

        {/* ==========================================================================
            SECTION 5: CALL TO ACTION CONTAINER
            ========================================================================== */}
        <motion.div
          className="remix-cta-card"
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.h2
          className="remix-cta-heading"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          Ready to stop guessing what your guests can eat?
        </motion.h2>
        <motion.p
          className="remix-cta-subheading"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        >
          Seeded on real Blacksburg kitchens for the demo — create your own event in under a minute.
        </motion.p>

        {/* CTA — Sign Up → /signup */}
        <motion.button
          id="btn-cta-signup"
          className="remix-cta-btn-signup"
          onClick={goToSignUp}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <CtaUserPlusIcon size={34} color="#2B2118" />
          <span className="remix-cta-btn-text-signup">Sign Up</span>
        </motion.button>

        {/* CTA — Log In → /login */}
        <motion.button
          id="btn-cta-login"
          className="remix-cta-btn-login"
          onClick={goToLogin}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          <CtaLogInIcon size={34} color="#2B2118" />
          <span className="remix-cta-btn-text-login">Log In</span>
        </motion.button>

        {/* ==========================================================================
            SECTION 6: FOOTER
            ========================================================================== */}
        <footer className="remix-footer">
          <div className="remix-footer-logo-box">
            <span className="remix-footer-logo-text">di</span>
            <div className="remix-footer-logo-fork">
              <ForkGraphic
                orientation="horizontal"
                color="#F1E9DC"
                dropShadow="none"
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>

          {/* Back to Top */}
          <button
            className="remix-footer-link remix-footer-link-top"
            onClick={scrollToTop}
          >
            Back to top
          </button>

          {/* Sign Up → /signup */}
          <button
            id="btn-footer-signup"
            className="remix-footer-link remix-footer-link-signup"
            onClick={goToSignUp}
          >
            Sign Up
          </button>

          {/* Log In → /login */}
          <button
            id="btn-footer-login"
            className="remix-footer-link remix-footer-link-login"
            onClick={goToLogin}
          >
            Log In
          </button>
        </footer>
      </main>
    </div>
  );
}

