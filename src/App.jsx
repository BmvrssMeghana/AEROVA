import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, Bell, Check, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, Cloud, Download, Droplets, FileText,
  Gauge, Layers3, LogOut, MapPin, Menu, Plus, Search, Settings2,
  Shield, ShieldAlert, Wind, X, Zap
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
import './stitch-landing.css';
import { AdminConsole, CustomerConsole, DriverApp, InvitationActivation, SiteWaterOperations } from './RoleDashboards.jsx';

const API = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');
const EMPTY_LIST = [];

const SITE_MANAGER_NAV = [
  ['overview', 'Overview', Gauge],
  ['map', 'Site map', MapPin],
  ['monitoring', 'Monitoring', Activity],
  ['interventions', 'Interventions', Zap],
  ['resources', 'Resources', Droplets],
  ['management', 'Site management', Layers3],
  ['reports', 'Reports', FileText],
];

const TITLES = {
  overview: 'Site Overview',
  map: 'Live Site Map',
  monitoring: 'Air Quality Monitoring & Predictions',
  interventions: 'Interventions & Control Workflows',
  resources: 'Water & Resources Management',
  reports: 'Reports & Compliance Documentation',
  management: 'Site Management & Device Provisioning',
};

function Brand({ onClick, inverse = false }) {
  return (
    <button className={`brand ${inverse ? 'brand-inverse' : ''}`} onClick={onClick}>
      <span><Wind size={18} /></span>AEROVA
    </button>
  );
}

function Button({ children, variant = 'outline', className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

function Tag({ type = 'NO DATA' }) {
  return <span className={`source-tag tag-${type.toLowerCase()}`}><i />{type}</span>;
}

function Risk({ value }) {
  const text = {
    high: 'High risk', rising: 'Rising', clear: 'Clear', unknown: 'Unknown',
    active: 'Active', acknowledged: 'Acknowledged', resolved: 'Resolved'
  }[String(value).toLowerCase()] || value;
  return <span className={`risk risk-${String(value).toLowerCase()}`}><i />{text}</span>;
}

function Eyebrow({ children }) {
  return <div className="eyebrow">{children}</div>;
}

function Panel({ title, kicker, action, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div>
          {kicker && <small>{kicker}</small>}
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ icon: Icon = Activity, title = 'No data available', body = 'Connect an authorized source to see persisted site records.', action, onClick }) {
  return (
    <div className="empty">
      <span><Icon size={24} /></span>
      <b>{title}</b>
      <p>{body}</p>
      {action && <button className="text-link" onClick={onClick}>{action} <ArrowRight size={14} /></button>}
    </div>
  );
}

function PublicSite({ go }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const solutions = [
    ['air', 'Real-Time Dust Monitoring', 'Tracks PM2.5 and PM10, along with temperature, humidity, wind speed and direction, soil moisture, and other environmental parameters.', '10s Micro-Intervals', 'orange'],
    ['layers', 'Smart Site Mapping', 'Uses a site layout and map to show construction zones, sensor locations, dust hotspots, workers, equipment, and affected areas.', 'CAD & GIS Overlay', 'teal'],
    ['travel_explore', 'Dust Source Identification', 'Helps identify potential sources such as excavation, demolition, material handling, cutting, and heavy vehicle movement.', 'Activity Correlation', 'orange'],
    ['trending_up', 'Risk Prediction', 'Estimates how dust risk may change and spread based on pollution levels, wind conditions, site activity, and environmental factors.', 'Downwind Forecast', 'teal'],
    ['crisis_alert', 'Targeted Interventions', 'Recommends appropriate actions such as localized misting, road sweeping, and source-level dust suppression.', 'Automated Dispatch', 'orange'],
    ['water_drop', 'Water & Tanker Optimization', 'Considers soil moisture, dust levels, rainfall, and tank levels to avoid unnecessary watering, coordinating replenishment and drivers.', 'Resource Conservation', 'teal'],
    ['engineering', 'Worker & Equipment Awareness', 'Tracks relevant worker presence, vehicle movement, and equipment activity to support comprehensive site-level monitoring.', 'Fleet & Crew Safety', 'orange'],
    ['assignment_turned_in', 'Alerts & Reports', 'Provides notifications, historical trends, intervention records, and reports to support operational decisions and environmental compliance.', 'Audited Compliance', 'teal'],
  ];

  async function submitPilotRequest(event) {
    event.preventDefault();
    setSending(true);
    setFormError('');
    const formData = new FormData(event.currentTarget);
    const body = {
      name: formData.get('name'),
      email: formData.get('email'),
      location: formData.get('location'),
      message: formData.get('message'),
      consented: formData.get('consented') === 'on',
    };
    try {
      const response = await fetch(`${API}/api/v1/demo-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Unable to submit the site assessment request');
      setSent(true);
    } catch (error) {
      setFormError(error.message === 'Failed to fetch' ? 'AEROVA API is offline.' : error.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="aerova-stitch-page min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased">
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-gutter">
          <a className="group flex items-center gap-space-sm" href="#home">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container font-headline-sm text-headline-sm font-bold text-on-primary shadow-sm">
              <span className="material-symbols-outlined text-[20px] text-on-primary">cyclone</span>
            </div>
            <span className="font-headline-sm text-headline-sm font-bold uppercase tracking-tight text-on-surface">AEROVA</span>
          </a>
          <nav className="hidden items-center gap-space-lg lg:flex">
            <a aria-current="page" className="font-title-md text-title-md text-on-surface transition-colors" href="#home">Home</a>
            <a className="font-body-md text-body-md text-on-surface-variant transition-colors hover:text-on-surface" href="#platform">Platform</a>
            <a className="font-body-md text-body-md text-on-surface-variant transition-colors hover:text-on-surface" href="#solutions">Solutions</a>
            <a className="font-body-md text-body-md text-on-surface-variant transition-colors hover:text-on-surface" href="#platform">Technology</a>
            <a className="font-body-md text-body-md text-on-surface-variant transition-colors hover:text-on-surface" href="#about">About</a>
          </nav>
          <div className="flex items-center gap-space-md">
            <a className="hidden items-center justify-center px-space-md py-space-sm font-title-md text-title-md text-on-surface transition-colors hover:text-primary sm:inline-flex" href="#login" onClick={event => { event.preventDefault(); go('login'); }}>Sign In</a>
            <a className="inline-flex items-center justify-center rounded-lg bg-primary-container px-space-lg py-space-sm font-title-md text-title-md text-on-primary shadow-[0_2px_8px_rgba(255,104,69,0.25)] transition-all hover:bg-primary" href="#contact">Request Demo</a>
          </div>
        </div>
      </header>

      <main className="w-full bg-surface pt-20">
        <div className="flex w-full flex-col bg-surface text-on-surface">
          <div className="relative mx-auto w-full max-w-7xl px-gutter pb-space-2xl pt-space-xl">
            <section className="grid grid-cols-1 items-center gap-gutter-lg lg:grid-cols-12">
              <div className="flex flex-col items-start pr-0 lg:col-span-6 lg:pr-space-md">
                <h1 className="mb-space-md font-headline-xl text-headline-xl-mobile leading-[1.12] tracking-tight text-on-surface sm:text-headline-xl">
                  Smarter Dust Control.<span className="text-primary-container">Cleaner Construction.</span>
                </h1>
                <p className="mb-space-xl max-w-xl font-body-lg text-body-lg text-on-surface-variant">
                  A smart construction site air quality and dust management platform. We connect sensing, site mapping, risk prediction, intervention, and resource optimization into one system protecting workforce health while cutting water usage and operational costs.
                </p>
                <div className="flex w-full flex-wrap items-center gap-space-md sm:w-auto">
                  <a className="inline-flex items-center justify-center rounded-xl bg-primary-container px-7 py-3.5 font-title-md text-title-md text-on-primary shadow-[0_8px_20px_rgba(255,104,69,0.28)] transition-all hover:bg-primary" href="#contact">Request a Quote</a>
                  <a className="inline-flex items-center justify-center rounded-xl bg-surface-container-highest px-7 py-3.5 font-title-md text-title-md text-on-surface transition-all hover:bg-surface-dim" href="#solutions">Our Services</a>
                </div>
                <div className="mt-space-xl flex items-center gap-space-xl pt-space-md">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 animate-pulse rounded-full bg-secondary" />
                    <div>
                      <div className="font-label-badge text-label-badge uppercase text-secondary">Grid Active</div>
                      <div className="font-label-telemetry text-label-telemetry text-on-surface-variant">842 Nodes Syncing</div>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-outline-variant/40" />
                  <div>
                    <div className="font-label-badge text-label-badge uppercase text-on-surface">ISO 14001</div>
                    <div className="font-label-telemetry text-label-telemetry text-on-surface-variant">Audited Telemetry</div>
                  </div>
                </div>
              </div>
              <div className="relative grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:col-span-6">
                <div className="group relative h-[380px] overflow-hidden rounded-3xl bg-surface-container shadow-lg transition-transform sm:h-[440px]" style={{ borderRadius: '36px 120px 36px 36px', clipPath: 'polygon(0px 0px, 80% 0px, 100% 28%, 100% 100%, 0px 100%)' }}>
                  <img className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" alt="High-angle shot of a sprawling urban civil construction site with tower cranes, reinforced concrete framing, and soft atmospheric misting spray against a clean pale blue sky with warm sunlight." src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9WiNzK35WsWBAceDDzxvIZWopFNgO7c-otnFEaS5s1nTdjTP6kqd7EIoIRzDOjmEyQt0Q-5jgklvtW-Vah_mp1l0ZqtInjNUgfg33LkW9UsZaE7DJi-2Bfo918y90OyB_HqamMuBsCyA3Zt-7GK4yaIu2-EuatH25lvDeplbaa7_Zi2mSt13wre2h6kCHsTjjPmcdvmTgNwu4Wh6V81x0uZOQVCWeEjCL3XYpSc" />
                  <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 via-transparent to-black/10" />
                  <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-surface-container-lowest/90 px-3.5 py-1.5 shadow-md backdrop-blur-md">
                    <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
                    <span className="font-label-badge text-label-badge text-on-surface">Zone North · 18 µg/m³ PM2.5</span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="font-label-telemetry text-label-telemetry uppercase tracking-wider text-secondary-fixed">Civil Foundation</span>
                    <p className="font-headline-sm text-headline-sm font-bold text-on-primary">Harbor Spine Metro</p>
                  </div>
                </div>
                <div className="group relative h-[380px] overflow-hidden rounded-3xl bg-surface-container shadow-lg transition-transform sm:h-[440px] sm:translate-y-8" style={{ borderRadius: '36px 36px 120px', clipPath: 'polygon(0px 0px, 100% 0px, 100% 100%, 20% 100%, 0px 80%)' }}>
                  <img className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Three site safety directors and project engineers wearing white and orange hardhats reviewing structural tablet telemetry data on a high-rise construction deck overlooking city infrastructure." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxnM4T5fLF8mwTr_7udbQ0qXZarie_LvkRzAkruceopI2HMrm1J1_MWI8PLXxAG75D_MCdD7FlnrO1BFT48OmYsiLwtg9rLuueQ7x0IH8C8LN8I2XT8zUezk1BsaKi7K9N0hL8rGqPdNUFQvKzRRObwSXymKMKhcSGEJgTJkkTZdbu2qZHhPlFZlzLmiO9HJiISIvTAsUVEtUn4L2w63cZYrmIBIwi5p6lNks1o2Y" />
                  <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 via-transparent to-black/10" />
                  <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-primary-container px-3.5 py-1.5 text-on-primary shadow-md">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                    <span className="font-label-badge text-label-badge">Field Ops · Active</span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="font-label-telemetry text-label-telemetry uppercase tracking-wider text-secondary-fixed">Targeted Suppression</span>
                    <p className="font-headline-sm text-headline-sm font-bold text-on-primary">Automated Mist Mesh</p>
                  </div>
                </div>
              </div>
            </section>

            <section id="about" className="mt-space-xl pt-space-xl">
              <div className="mx-auto mb-space-xl max-w-3xl text-center">
                <h2 className="mt-2 font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">Built on Experience. Driven by Quality.</h2>
              </div>
              <div className="grid grid-cols-1 gap-space-md md:grid-cols-2 lg:grid-cols-12">
                <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-surface-container p-space-xl shadow-sm lg:col-span-5" style={{ background: 'rgb(255, 255, 255)', border: '1px solid rgb(232, 229, 227)', borderRadius: '48px 18px', clipPath: 'polygon(24px 0px, 100% 0px, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0px 100%, 0px 24px)' }}>
                  <div className="pointer-events-none absolute right-4 top-4 flex gap-2 opacity-20">
                    {[58, 76].map(height => <div key={height} style={{ width: 26, height, border: '2px solid rgb(225, 222, 220)', borderRadius: 9999 }} />)}
                  </div>
                  <div>
                    <div className="mb-space-lg flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-container font-bold text-on-primary">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                      </div>
                      <span className="font-headline-sm text-headline-sm font-bold uppercase tracking-tight">AEROVA GRID</span>
                    </div>
                    <div className="mb-1 font-stat-display text-stat-display font-extrabold tracking-tight">1600k+</div>
                    <p className="max-w-sm font-body-md text-body-md text-on-surface-variant">Proven sensor hours monitored across residential, commercial, mining, and highway infrastructure sectors.</p>
                  </div>
                  <div className="mt-space-xl flex items-center gap-space-md pt-space-md">
                    <div className="flex -space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-xs font-bold text-on-secondary-container ring-2 ring-surface">JD</div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary ring-2 ring-surface">RM</div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-dim text-xs font-bold text-on-surface ring-2 ring-surface">SK</div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-inverse-surface text-xs font-bold text-inverse-on-surface ring-2 ring-surface">+48</div>
                    </div>
                    <div>
                      <div className="font-title-md text-title-md text-on-surface">Trusted by Tier 1 Builders</div>
                      <div className="font-label-telemetry text-label-telemetry text-on-surface-variant">Civil Contractors Worldwide</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:col-span-7">
                  <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-surface-container p-space-lg shadow-sm" style={{ background: 'rgb(255, 255, 255)', border: '1px solid rgb(232, 229, 227)', borderRadius: '36px 14px', clipPath: 'polygon(18px 0px, 100% 0px, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0px 100%, 0px 18px)' }}>
                    <div className="mb-space-md flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-container-lowest text-primary-container shadow-sm">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><rect height="16" rx="2" width="16" x="4" y="4" /><path d="M9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" /></svg>
                      </div>
                      <span className="rounded-full bg-secondary-fixed/50 px-2.5 py-0.5 font-label-badge text-label-badge text-secondary">&lt;10s Latency</span>
                    </div>
                    <div>
                      <div className="mb-1 font-headline-md text-headline-md font-bold text-on-surface">Autonomous Grid</div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">We integrate dual-laser optical scattering to identify hazardous plumes within seconds.</p>
                    </div>
                    <div className="pointer-events-none absolute -right-2 -top-3 flex gap-1 opacity-10">
                      {[50, 64].map(height => <div key={height} style={{ width: 24, height, border: '2px solid rgb(226, 222, 218)', borderRadius: 9999 }} />)}
                    </div>
                  </div>
                  <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-surface-container p-space-lg shadow-sm" style={{ background: 'rgb(255, 255, 255)', border: '1px solid rgb(232, 229, 227)', borderRadius: '36px 14px', clipPath: 'polygon(18px 0px, 100% 0px, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0px 100%, 0px 18px)' }}>
                    <div className="mb-space-md flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-container-lowest text-secondary shadow-sm">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
                      </div>
                      <span className="rounded-full bg-primary-fixed px-2.5 py-0.5 font-label-badge text-label-badge text-primary-container">Zero Halts</span>
                    </div>
                    <div>
                      <div className="mb-1 font-stat-display text-[44px] font-extrabold leading-tight text-on-surface">98%</div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">Project EPA compliance score sustained throughout multi-year demolition phases.</p>
                    </div>
                    <div className="pointer-events-none absolute -right-2 -top-3 flex gap-1 opacity-10">
                      {[42, 56, 68].map(height => <div key={height} style={{ width: 20, height, border: '2px solid rgb(226, 222, 218)', borderRadius: 9999 }} />)}
                    </div>
                  </div>
                  <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-surface-container p-space-lg shadow-sm" style={{ background: 'rgb(255, 255, 255)', border: '1px solid rgb(232, 229, 227)', borderRadius: '36px 14px', clipPath: 'polygon(18px 0px, 100% 0px, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0px 100%, 0px 18px)' }}>
                    <div className="mb-space-md flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-container-lowest text-secondary shadow-sm">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>
                      </div>
                      <span className="rounded-full bg-secondary-fixed/50 px-2.5 py-0.5 font-label-badge text-label-badge text-secondary">Conservation</span>
                    </div>
                    <div>
                      <div className="mb-1 font-stat-display text-[44px] font-extrabold leading-tight text-on-surface">25M+ gal</div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">Gallons of site water preserved via targeted micro-droplet misting vs blanket hosing.</p>
                    </div>
                    <div className="pointer-events-none absolute -right-2 -top-3 flex gap-1 opacity-10">
                      {[50, 64].map(height => <div key={height} style={{ width: 24, height, border: '2px solid rgb(226, 222, 218)', borderRadius: 9999 }} />)}
                    </div>
                  </div>
                  <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-surface-container p-space-lg shadow-sm" style={{ background: 'rgb(255, 255, 255)', border: '1px solid rgb(232, 229, 227)', borderRadius: '36px 14px', clipPath: 'polygon(18px 0px, 100% 0px, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0px 100%, 0px 18px)' }}>
                    <div className="mb-space-md flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-container-lowest text-primary-container shadow-sm">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                      </div>
                      <span className="rounded-full bg-surface-container-highest px-2.5 py-0.5 font-label-badge text-label-badge text-on-surface-variant">Field Certified</span>
                    </div>
                    <div>
                      <div className="mb-1 font-headline-md text-headline-md font-bold text-on-surface">Expert Support</div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">Our team of certified environmental safety engineers delivers turnkey calibration.</p>
                    </div>
                    <div className="pointer-events-none absolute -right-2 -top-3 flex gap-1 opacity-10">
                      {[50, 64].map(height => <div key={height} style={{ width: 24, height, border: '2px solid rgb(226, 222, 218)', borderRadius: 9999 }} />)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-space-xl text-center">
                <a className="inline-flex items-center gap-2 rounded-full bg-surface-container-high px-6 py-3 font-title-md text-title-md text-on-surface transition-all hover:bg-surface-dim" href="#solutions">
                  <span>Exlore all services</span>
                  <svg className="h-4 w-4 text-primary-container" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </a>
              </div>
            </section>

            <section id="platform" className="mt-space-xl pt-space-xl">
              <div className="mb-space-xl flex flex-col justify-between gap-space-md md:flex-row md:items-end">
                <h2 className="mt-1 font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">End-to-End Construction Solutions You Can Rely On.</h2>
              </div>
              <div id="solutions" className="grid grid-cols-1 gap-space-md md:grid-cols-2 lg:grid-cols-4">
                {solutions.map(([icon, title, description, label, tone]) => (
                  <article key={title} className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-surface-container p-space-lg transition-all hover:shadow-md" style={{ background: 'rgb(255, 255, 255)', border: '1px solid rgb(232, 229, 227)', borderRadius: '36px 14px', clipPath: 'polygon(18px 0px, 100% 0px, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0px 100%, 0px 18px)' }}>
                    <div className="pointer-events-none absolute -right-2 -top-3 flex gap-1 opacity-20">
                      {[48, 62].map(height => <div key={height} style={{ width: 20, height, border: '2px solid rgb(226, 222, 218)', borderRadius: 9999 }} />)}
                    </div>
                    <div>
                      <div className={`mb-space-md flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm ${tone === 'orange' ? 'bg-primary-container text-primary' : 'bg-secondary-container text-secondary'}`} style={{ background: tone === 'orange' ? 'rgb(255, 239, 232)' : 'rgb(230, 246, 244)', borderRadius: '50%' }}>
                        <span className="material-symbols-outlined text-[20px]">{icon}</span>
                      </div>
                      <h3 className="mb-2 font-headline-sm text-headline-sm font-bold text-on-surface">{title}</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">{description}</p>
                    </div>
                    <div className="pt-space-md">
                      <span className={`font-label-telemetry text-label-telemetry font-semibold ${tone === 'orange' ? 'text-primary-container' : 'text-secondary'}`}>{label}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section id="contact" className="mt-space-xl pt-space-xl">
              <div className="grid grid-cols-1 items-center gap-space-xl lg:grid-cols-12">
                <div className="relative h-[460px] overflow-hidden rounded-3xl shadow-md lg:col-span-6" style={{ borderRadius: '130px 28px 28px', clipPath: 'polygon(0px 22%, 26% 0px, 100% 0px, 100% 100%, 0px 100%)' }}>
                  <img className="h-full w-full object-cover" alt="Construction worker in high-visibility safety vest standing atop heavy yellow formwork guiding a large crane precast panel lift during early morning golden hour." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAj7Y9AALksEOqkrr-ooAjniJvKk6G8vd_MlIfzfwBH93NRcTpoPnN4b1yPGvvca5KZI0Mcm3OXVh4kBbL5J41vd04cIjo7wQtQH_OhUt6t34_7pPNRDHi-Hv-6-L_TCnT7ZjSVyT_Jte6lRHRdPJeHE5vWkD2-ZL4a8I_NhhLC1mYyvMcha-3gR2BoNvQZ7Jl_XRreinq0KhLvHPkKc-dtXFgUR6yfpTonCuZ4FUI" />
                  <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 text-on-primary">
                    <span className="font-label-badge text-label-badge uppercase tracking-wider text-secondary-fixed">Site Deployment Team</span>
                    <p className="mt-1 font-headline-md text-headline-md font-bold text-on-primary">Autonomous mist cannons deployed within 48 hours of site survey.</p>
                  </div>
                </div>
                <div className="rounded-3xl bg-surface-container p-space-xl shadow-sm lg:col-span-6" style={{ background: 'rgb(255, 255, 255)', border: '1px solid rgb(234, 231, 228)', borderRadius: '48px 18px', clipPath: 'polygon(28px 0px, 100% 0px, 100% calc(100% - 28px), calc(100% - 28px) 100%, 0px 100%, 0px 28px)' }}>
                  <div className="mb-space-md">
                    <span className="font-label-badge text-label-badge uppercase tracking-wider text-primary-container">Fast Telemetry Setup</span>
                    <h3 className="mt-1 font-headline-md text-headline-md font-bold text-on-surface">Start Your Project With Us</h3>
                    <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Connect with our environmental engineering leads to get site calibration parameters and deployment quotes.</p>
                  </div>
                  {sent ? (
                    <div className="py-7 text-center text-secondary">
                      <span className="material-symbols-outlined text-[32px]" aria-hidden="true">check_circle</span>
                      <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Pilot request submitted!</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">An Aerova engineer will contact you shortly.</p>
                    </div>
                  ) : (
                    <form className="space-y-space-md" onSubmit={submitPilotRequest}>
                      <div>
                        <label className="mb-1 block font-title-md text-title-md text-on-surface" htmlFor="pilot-name">Full Name</label>
                        <input className="w-full rounded-xl bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container" id="pilot-name" name="name" placeholder="e.g. Marcus Vance" required type="text" />
                      </div>
                      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block font-title-md text-title-md text-on-surface" htmlFor="pilot-email">Work Email</label>
                          <input className="w-full rounded-xl bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container" id="pilot-email" name="email" placeholder="engineer@contractor.com" required type="email" />
                        </div>
                        <div>
                          <label className="mb-1 block font-title-md text-title-md text-on-surface" htmlFor="pilot-location">Site Location / City</label>
                          <input className="w-full rounded-xl bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container" id="pilot-location" name="location" placeholder="Denver, CO" required type="text" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block font-title-md text-title-md text-on-surface" htmlFor="pilot-message">Project Scope &amp; Particulate Challenges</label>
                        <textarea className="w-full rounded-xl bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container" id="pilot-message" name="message" placeholder="Describe excavation acreage, proximity to residential borders, or silica concerns..." rows={3} />
                      </div>
                      <div className="flex items-center gap-2">
                        <input className="cursor-pointer rounded text-primary-container focus:ring-0" id="pilot-terms" name="consented" required type="checkbox" />
                        <label className="cursor-pointer font-body-sm text-body-sm text-on-surface-variant" htmlFor="pilot-terms">I agree to telemetry privacy guidelines &amp; environmental assessment terms.</label>
                      </div>
                      {formError && <div className="flex items-center gap-2 font-body-sm text-body-sm text-error"><AlertTriangle size={15} />{formError}</div>}
                      <button className="w-full rounded-xl bg-primary-container py-3.5 font-title-md text-title-md text-on-primary shadow-md transition-all hover:bg-primary" disabled={sending} type="submit">
                        {sending ? 'Submitting…' : 'Request Site Assessment'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-space-xl pt-space-xl">
              <div className="relative overflow-hidden rounded-3xl bg-surface-container p-space-2xl text-center shadow-sm" style={{ background: 'rgb(246, 243, 240)', border: '1px solid rgb(238, 234, 231)', borderRadius: 44 }}>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-8 opacity-10">
                  {[56, 72, 56].map((height, index) => <div key={index} style={{ width: 32, height, border: '2px solid rgba(0, 0, 0, 0.08)', borderRadius: 9999 }} />)}
                </div>
                <div className="relative z-10 mx-auto max-w-2xl">
                  <h2 className="mb-space-sm font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">Ready to Build Your Clean Site?</h2>
                  <p className="mb-space-xl font-body-md text-body-md text-on-surface-variant">Let's bring real-time intelligence to your next heavy civil, aggregate, or high-rise project. Protect your workforce, avoid penalties, and conserve water.</p>
                  <div className="flex flex-wrap items-center justify-center gap-space-md">
                    <a className="inline-flex items-center justify-center rounded-xl bg-primary-container px-8 py-3.5 font-title-md text-title-md text-on-primary shadow-md transition-all hover:bg-primary" href="#contact">Request a Site Pilot</a>
                    <a className="inline-flex items-center justify-center rounded-xl bg-surface-container-highest px-8 py-3.5 font-title-md text-title-md text-on-surface transition-all hover:bg-surface-dim" href="#contact">Talk to an Engineer</a>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="w-full bg-inverse-surface pb-space-xl pt-space-2xl text-inverse-on-surface">
        <div className="mx-auto max-w-7xl px-gutter">
          <div className="flex flex-col justify-between gap-space-xl pb-space-2xl lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <span className="mb-space-xs block font-label-telemetry text-label-telemetry uppercase tracking-wider text-secondary-fixed">Next-Gen ConTech Telemetry</span>
              <h2 className="font-headline-lg text-headline-lg font-bold tracking-tight text-inverse-on-surface">Have a Project in Mind? Let's Build It.</h2>
              <p className="mt-space-sm font-body-md text-body-md text-tertiary-fixed">Deploy high-precision climate control, automated misting nodes, and real-time environmental compliance across civil jobsites.</p>
            </div>
            <div className="flex w-full flex-col items-stretch gap-space-sm sm:flex-row sm:items-center lg:w-auto">
              <div className="relative min-w-[280px]">
                <input className="w-full rounded-lg border-0 bg-surface/10 px-space-md py-space-sm font-body-md text-body-md text-inverse-on-surface transition-colors placeholder:text-tertiary-fixed-dim focus:bg-surface/20 focus:outline-none" aria-label="Project engineer email" placeholder="Enter project engineer email" type="email" />
              </div>
              <button className="inline-flex items-center justify-center rounded-lg bg-primary-container px-space-lg py-space-sm font-title-md text-title-md text-on-primary transition-colors hover:bg-primary" onClick={() => go('signup')} type="button">Get Started</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-space-xl py-space-xl md:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2">
              <a className="mb-space-md flex items-center gap-space-sm" href="#home">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-container font-bold text-on-primary">
                  <span className="material-symbols-outlined text-[18px] text-on-primary">cyclone</span>
                </div>
                <span className="font-headline-sm text-headline-sm font-bold uppercase tracking-tight text-inverse-on-surface">AEROVA</span>
              </a>
              <p className="mb-space-md max-w-sm font-body-sm text-body-sm text-tertiary-fixed">Autonomous industrial dust suppression, PM2.5/PM10 air quality telemetry, and intelligent site water grid orchestration.</p>
              <div className="flex items-center gap-space-md font-body-sm text-body-sm text-tertiary-fixed">
                <span className="material-symbols-outlined text-[18px] text-secondary-fixed">verified</span>
                <span>ISO 14001 &amp; OSHA Compliant Telemetry</span>
              </div>
            </div>
            <div>
              <h3 className="mb-space-md font-title-md text-title-md font-bold text-inverse-on-surface">Platform</h3>
              <ul className="space-y-space-sm font-body-sm text-body-sm text-tertiary-fixed">
                <li><a className="transition-colors hover:text-inverse-on-surface" href="#platform">Sensor Array Grid</a></li>
                <li><a className="transition-colors hover:text-inverse-on-surface" href="#platform">Smart Mist Cannons</a></li>
                <li><a className="transition-colors hover:text-inverse-on-surface" href="#platform">Automated Compliance</a></li>
                <li><a className="transition-colors hover:text-inverse-on-surface" href="#platform">Telemetry API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-space-md font-title-md text-title-md font-bold text-inverse-on-surface">Solutions</h3>
              <ul className="space-y-space-sm font-body-sm text-body-sm text-tertiary-fixed">
                <li><a className="transition-colors hover:text-inverse-on-surface" href="#solutions">Heavy Civil Works</a></li>
                <li><a className="transition-colors hover:text-inverse-on-surface" href="#solutions">Mining &amp; Aggregates</a></li>
                <li><a className="transition-colors hover:text-inverse-on-surface" href="#solutions">Urban Infrastructure</a></li>
                <li><a className="transition-colors hover:text-inverse-on-surface" href="#solutions">Demolition Operations</a></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-space-md font-title-md text-title-md font-bold text-inverse-on-surface">Company</h3>
              <ul className="space-y-space-sm font-body-sm text-body-sm text-tertiary-fixed">
                <li><a className="transition-colors hover:text-inverse-on-surface" href="#about">About Aerova</a></li>
                <li><a className="transition-colors hover:text-inverse-on-surface" href="#platform">Proprietary Tech</a></li>
                <li><a className="transition-colors hover:text-inverse-on-surface" href="#about">Safety Certifications</a></li>
                <li><a className="transition-colors hover:text-inverse-on-surface" href="#contact">Contact Engineering</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-space-md border-t border-surface/10 pt-space-xl font-body-sm text-body-sm text-tertiary-container md:flex-row">
            <p>© 2025 AEROVA Systems Inc. Heavy-duty environmental telemetry. All rights reserved.</p>
            <div className="flex items-center gap-space-lg">
              <a className="transition-colors hover:text-inverse-on-surface" href="#privacy">Privacy Policy</a>
              <a className="transition-colors hover:text-inverse-on-surface" href="#terms">Terms of Service</a>
              <a className="transition-colors hover:text-inverse-on-surface" href="#security">Security &amp; Calibration</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AuthPage({ mode, go, onAuth }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    data.terms_accepted = data.terms_accepted === 'true';
    try {
      const res = await fetch(`${API}/api/v1/auth/${signup ? 'signup' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || 'Unable to sign in');
      onAuth(body);
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'AEROVA API is offline.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <aside>
        <Brand onClick={() => go('public')} />
        <div>
          <Eyebrow>YOUR SITE, IN CONTEXT</Eyebrow>
          <h1>Make dust<br />actionable.</h1>
          <p>See the full journey from site conditions to outcome evidence.</p>
        </div>
        <div className="auth-art-note">
          <Wind size={18} />
          <b>Wind shifts the picture.</b>
          <small>Understand where dust may move next.</small>
        </div>
        <small className="auth-copyright">AEROVA · SITE DUST INTELLIGENCE</small>
      </aside>
      <main>
        <button className="back-link" onClick={() => go('public')}>
          <ChevronLeft size={16} /> Back to website
        </button>
        <div className="auth-form">
          <Eyebrow>{signup ? 'GET STARTED' : 'WELCOME BACK'}</Eyebrow>
          <h2>{signup ? 'Create your account' : 'Sign in to AEROVA'}</h2>
          <p>{signup ? 'Create an organization workspace for your construction team.' : 'Continue to your authorized organization and sites.'}</p>
          <form onSubmit={submit}>
            {signup && (
              <label>Full name
                <input required name="full_name" autoComplete="name" />
              </label>
            )}
            <label>Work email
              <input required type="email" name="email" autoComplete="email" />
            </label>
            {signup && (
              <label>Company name
                <input required name="company_name" />
              </label>
            )}
            <label>Password
              <input required minLength={10} type="password" name="password" autoComplete={signup ? 'new-password' : 'current-password'} />
            </label>
            {signup && (
              <>
                <label>Role / designation
                  <input required name="designation" />
                </label>
                <label className="consent">
                  <input required type="checkbox" name="terms_accepted" value="true" /> I accept the terms and privacy policy.
                </label>
              </>
            )}
            {error && <div className="form-error"><AlertTriangle size={15} />{error}</div>}
            <Button variant="primary" className="auth-submit" disabled={busy}>
              {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'} <ArrowRight size={15} />
            </Button>
          </form>
          <div className="switch-auth">
            {signup ? 'Already have an account?' : 'New to AEROVA?'}{' '}
            <button onClick={() => go(signup ? 'login' : 'signup')}>
              {signup ? 'Sign in' : 'Create an account'}
            </button>
          </div>
          <div className="auth-security">
            <Shield size={15} /> Workspace data is private to your authorized organization.
          </div>
        </div>
      </main>
    </div>
  );
}

function SetupPage({ data, setData, step, setStep, save, skip, saving, error }) {
  const names = ['Organization', 'Site details', 'Layout', 'Map configuration', 'Zones & activities', 'Devices & team', 'Thresholds', 'Readiness'];
  const zones = Array.isArray(data.zones) ? data.zones : [];
  const updateZone = (index, changes) => setData({
    ...data,
    zones: zones.map((zone, zoneIndex) => zoneIndex === index ? { ...zone, ...changes } : zone)
  });
  return (
    <div className="setup-page">
      <header>
        <Brand onClick={skip} />
        <button className="plain-button" onClick={skip}>Exit setup</button>
      </header>
      <div className="setup-progress">
        <small>SETUP <b>{String(step + 1).padStart(2, '0')}</b> / 08</small>
        <div><i style={{ width: `${(step + 1) / 8 * 100}%` }} /></div>
        <span>{names[step]}</span>
      </div>
      <section className="setup-card">
        <Eyebrow>SITE SETUP · STEP {step + 1} OF 8</Eyebrow>
        <h1>{[
          'Set up your organization', 'Create your construction site', 'Add a site layout',
          'Configure the site map', 'Configure zones & activities', 'Connect devices & team',
          'Set site thresholds', 'Review site readiness'
        ][step]}</h1>
        <p>{[
          'Company workspace and organization profile.',
          'Create the project that will hold site records and monitoring data.',
          'Images are not spatially accurate until aligned to control points.',
          'Mapbox uses confirmed site coordinates.',
          'Add the zones that are recorded for this site.',
          'Provision hardware and assign site roles.',
          'Customer-configured thresholds are not official AQI values.',
          'Review setup items before launching.'
        ][step]}</p>

        {step === 0 && (
          <div className="form-grid">
            <label>Organization<input value={data.company_name || ''} onChange={e => setData({ ...data, company_name: e.target.value })} /></label>
            <label>Industry<select value={data.industry || ''} onChange={e => setData({ ...data, industry: e.target.value })}><option value="">Select</option>{['Infrastructure', 'Real estate', 'Roads', 'Industrial', 'Other'].map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Organization type<select value={data.organization_type || ''} onChange={e => setData({ ...data, organization_type: e.target.value })}><option value="">Select</option>{['Contractor', 'Developer', 'Project owner', 'Consultant'].map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Operating location<input value={data.operating_location || ''} onChange={e => setData({ ...data, operating_location: e.target.value })} /></label>
          </div>
        )}

        {step === 1 && (
          <div className="form-grid">
            <label>Project name<input value={data.name || ''} onChange={e => setData({ ...data, name: e.target.value })} /></label>
            <label>Project code<input value={data.project_code || ''} onChange={e => setData({ ...data, project_code: e.target.value })} /></label>
            <label className="wide">Site address<input value={data.address || ''} onChange={e => setData({ ...data, address: e.target.value })} /></label>
            <label>Project type<select value={data.project_type || ''} onChange={e => setData({ ...data, project_type: e.target.value })}><option value="">Select</option>{['Residential', 'Commercial', 'Road', 'Industrial', 'Infrastructure', 'Other'].map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Site area · acres<input type="number" min="0" step="any" value={data.area_acres || ''} onChange={e => setData({ ...data, area_acres: e.target.value })} /></label>
            <label>Latitude<input type="number" min="-90" max="90" step="any" value={data.latitude || ''} onChange={e => setData({ ...data, latitude: e.target.value })} /></label>
            <label>Longitude<input type="number" min="-180" max="180" step="any" value={data.longitude || ''} onChange={e => setData({ ...data, longitude: e.target.value })} /></label>
            <label>Start date<input type="date" value={data.start_date || ''} onChange={e => setData({ ...data, start_date: e.target.value })} /></label>
            <label>Expected completion<input type="date" value={data.expected_end_date || ''} onChange={e => setData({ ...data, expected_end_date: e.target.value })} /></label>
          </div>
        )}

        {step === 2 && (
          <label className="upload-box">
            <input type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={e => setData({ ...data, file: e.target.files?.[0] })} />
            <Cloud size={28} />
            <b>{data.file?.name || 'Choose a site plan or aerial image'}</b>
            <small>PNG, JPG or PDF · private site asset</small>
          </label>
        )}

        {step === 3 && (
          <label>Site boundary · GeoJSON Polygon
            <textarea rows={5} value={data.boundary_geojson || ''} onChange={e => setData({ ...data, boundary_geojson: e.target.value })} />
          </label>
        )}

        {step === 4 && (
          <div className="setup-zones">
            {zones.map((zone, index) => (
              <div key={`${zone.zone_code}-${index}`}>
                <label>Zone code<input value={zone.zone_code} onChange={e => updateZone(index, { zone_code: e.target.value })} /></label>
                <label>Zone name<input value={zone.name} onChange={e => updateZone(index, { name: e.target.value })} /></label>
                <label>Zone type<input value={zone.zone_type} onChange={e => updateZone(index, { zone_type: e.target.value })} /></label>
                <button type="button" className="plain-button" onClick={() => setData({ ...data, zones: zones.filter((_, zoneIndex) => zoneIndex !== index) })}>Remove</button>
              </div>
            ))}
            <Button type="button" onClick={() => setData({ ...data, zones: [...zones, { zone_code: '', name: '', zone_type: '' }] })}>Add zone <Plus size={14} /></Button>
          </div>
        )}

        {step === 5 && (
          <div className="form-grid">
            <label>Invite teammate email<input type="email" value={data.team_email || ''} onChange={e => setData({ ...data, team_email: e.target.value })} /></label>
            <label>Site role<select value={data.team_role || 'SITE_MANAGER'} onChange={e => setData({ ...data, team_role: e.target.value })}><option value="SITE_MANAGER">Site Manager</option><option value="WATER_DRIVER">Water Driver</option></select></label>
          </div>
        )}

        {step === 6 && (
          <div className="form-grid">
            {[['PM2.5 warning', 'pm25_warning'], ['PM2.5 critical', 'pm25_critical'], ['PM10 warning', 'pm10_warning'], ['PM10 critical', 'pm10_critical']].map(([label, key]) => (
              <label key={key}>{label} · µg/m³<input type="number" value={data[key] ?? ''} onChange={e => setData({ ...data, [key]: e.target.value === '' ? '' : Number(e.target.value) })} /></label>
            ))}
          </div>
        )}

        {step === 7 && (
          <div className="readiness">
            {[['Site location', data.latitude && data.longitude ? 'Coordinates set' : 'Not configured'], ['Zones', `${zones.length} configured`], ['Thresholds', Object.keys(data).some(key => key.includes('_warning') || key.includes('_critical')) ? 'Configured' : 'Not configured']].map(([a, b]) => (
              <div key={a}>
                <span className={b === 'Not configured' ? 'pending' : 'ready'}>{b === 'Not configured' ? <AlertTriangle size={14} /> : <Check size={14} />}</span>
                <b>{a}</b>
                <small>{b}</small>
              </div>
            ))}
          </div>
        )}

        <footer>
          <Button onClick={() => setStep(Math.max(0, step - 1))} disabled={!step}><ChevronLeft size={16} /> Back</Button>
          {step < 7 ? (
            <Button variant="primary" onClick={() => setStep(step + 1)}>Continue <ArrowRight size={16} /></Button>
          ) : (
            <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving setup…' : 'Launch site workspace'} <ArrowRight size={16} /></Button>
          )}
        </footer>
        {error && <div className="form-error" role="alert">{error}</div>}
      </section>
    </div>
  );
}

export default function App() {
  const hasInvitation = () => Boolean(new URLSearchParams(window.location.search).get('invite'));
  const [token, setToken] = useState(() => sessionStorage.getItem('aerova_token') || '');
  const [route, setRoute] = useState(() => sessionStorage.getItem('aerova_token') ? 'loading' : hasInvitation() ? 'accept_invite' : 'public');
  const [user, setUser] = useState(null);
  const [sites, setSites] = useState([]);
  const [site, setSite] = useState(null);
  const [active, setActive] = useState('overview');
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState('');
  const [interventionsReload, setInterventionsReload] = useState(0);
  const [setupBusy, setSetupBusy] = useState(false);
  const [dialog, setDialog] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [alertFilter, setAlertFilter] = useState('ACTIVE');
  const [range, setRange] = useState('24 hours');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [zoneFilter, setZoneFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState([]);
  const [searchState, setSearchState] = useState('');
  const [overview, setOverview] = useState(null);
  const [siteZones, setSiteZones] = useState([]);
  const [siteDevices, setSiteDevices] = useState([]);
  const [siteConfigId, setSiteConfigId] = useState('');
  const [workspaceError, setWorkspaceError] = useState('');
  const [selectedZone, setSelectedZone] = useState(null);
  const [onboardStep, setOnboardStep] = useState(0);
  const [form, setForm] = useState({});
  const [customerProject, setCustomerProject] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const profileRef = useRef(null);

  useEffect(() => {
    if (!profileOpen) return;
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);

  useEffect(() => {
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    fetch(`${API}/api/v1/me`, { headers: h })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setUser(data);
        setSites(data.sites || []);
        if (data.sites?.[0]) setSite(data.sites[0]);
        if (data.role === 'CUSTOMER_MANAGER' && !data.sites?.length) {
          setForm(current => ({
            company_name: data.company_name,
            organization_id: data.organization_id,
            ...current
          }));
          setRoute(current => current === 'setup' ? current : 'setup');
        } else {
          setRoute('app');
        }
      })
      .catch(() => {
        sessionStorage.removeItem('aerova_token');
        setToken('');
        setRoute('login');
      });
  }, [token]);

  useEffect(() => {
    if (!token || !site?.id || route !== 'app') return;
    const ctrl = new AbortController();
    const params = new URLSearchParams({ range });
    if (sourceFilter && sourceFilter !== 'ALL') params.set('source', sourceFilter);
    if (zoneFilter) params.set('zone_id', zoneFilter);
    if (deviceFilter !== 'ALL') params.set('device_uid', deviceFilter);

    fetch(`${API}/api/v1/sites/${site.id}/overview?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal
    })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Unable to load site overview');
        return data;
      })
      .then(data => {
        setOverview(data);
        setWorkspaceError('');
      })
      .catch(error => {
        if (!ctrl.signal.aborted) {
          setOverview(null);
          setWorkspaceError(error.message || 'Unable to load site overview');
        }
      });

    return () => ctrl.abort();
  }, [token, site?.id, route, range, sourceFilter, zoneFilter, deviceFilter]);

  useEffect(() => {
    if (!token || !site?.id || route !== 'app' || user?.role === 'WATER_DRIVER') {
      return;
    }
    const ctrl = new AbortController();
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/api/v1/sites/${site.id}/zones`, { headers, signal: ctrl.signal }),
      fetch(`${API}/api/v1/sites/${site.id}/devices`, { headers, signal: ctrl.signal })
    ])
      .then(async ([zoneResponse, deviceResponse]) => {
        const [zoneData, deviceData] = await Promise.all([zoneResponse.json(), deviceResponse.json()]);
        if (!zoneResponse.ok) throw new Error(zoneData.detail || 'Unable to load site zones');
        if (!deviceResponse.ok) throw new Error(deviceData.detail || 'Unable to load site devices');
        setSiteZones(zoneData);
        setSiteDevices(deviceData);
        setSiteConfigId(site.id);
        setWorkspaceError('');
      })
      .catch(error => {
        if (!ctrl.signal.aborted) setWorkspaceError(error.message || 'Unable to load site configuration');
      });
    return () => ctrl.abort();
  }, [token, site?.id, route, user?.role]);

  const activeSiteZones = siteConfigId === site?.id ? siteZones : EMPTY_LIST;
  const activeSiteDevices = siteConfigId === site?.id ? siteDevices : EMPTY_LIST;
  const currentOverview = overview?.site_id === site?.id ? overview : null;
  const dashboardZones = useMemo(() => {
    return activeSiteZones.map(zone => {
      const current = currentOverview?.zones?.find(item => item.id === zone.id);
      return {
        id: zone.id,
        zone_code: zone.zone_code,
        name: zone.name,
        type: zone.zone_type,
        risk: current?.risk?.level?.toLowerCase() || 'unknown',
        pm10: current?.latest?.metrics?.pm10_ug_m3 ?? null,
        pm25: current?.latest?.metrics?.pm25_ug_m3 ?? null,
        lastUpdated: current?.latest?.received_at_utc ?? null,
        devices: activeSiteDevices.filter(device => device.zone_id === zone.id).length
      };
    });
  }, [activeSiteZones, activeSiteDevices, currentOverview]);
  const selectedDashboardZone = dashboardZones.find(zone => zone.id === selectedZone?.id) || dashboardZones[0] || null;

  useEffect(() => {
    if (!token || query.trim().length < 2) {
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`${API}/api/v1/search?q=${encodeURIComponent(query.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: ctrl.signal
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(d => {
          setHits(d.results || []);
          setSearchState((d.results || []).length ? 'ready' : 'empty');
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setSearchState('error');
        });
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, token]);

  useEffect(() => {
    if (!token || !site?.id || route !== 'app') return;
    fetch(`${API}/api/v1/sites/${site.id}/alerts`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(rows => setAlerts(rows.map(a => ({
        id: a.id,
        title: a.title,
        zone: a.zone_id || 'Site',
        time: new Date(a.created_at).toLocaleString(),
        severity: a.severity.toLowerCase(),
        value: a.details?.measured_value ?? 'No value',
        status: a.status,
        source: a.source_type || 'SYSTEM'
      }))))
      .catch(error => setWorkspaceError(error.message || 'Unable to load site alerts'));
  }, [token, site?.id, route]);

  const go = next => {
    setRoute(next);
    setMenu(false);
  };

  function authDone(data) {
    sessionStorage.setItem('aerova_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    setAlerts([]);
    setSites(data.sites || []);
    if (data.sites?.[0]) setSite(data.sites[0]);
    if (data.next_step === 'site_setup') {
      setForm({ company_name: data.user?.company_name, organization_id: data.user?.organization_id });
      go('setup');
    } else {
      go('app');
    }
  }

  function logout() {
    sessionStorage.removeItem('aerova_token');
    setToken('');
    setUser(null);
    setAlerts([]);
    setSite(null);
    setOverview(null);
    setSiteZones([]);
    setSiteDevices([]);
    setSiteConfigId('');
    setSelectedZone(null);
    setCustomerProject(false);
    go('public');
  }

  function selectSite(nextSite) {
    setSite(nextSite);
    setZoneFilter('');
    setDeviceFilter('ALL');
    setSelectedZone(null);
    setWorkspaceError('');
    setOverview(null);
  }

  async function saveSiteSetup() {
    if (!token || !user?.organization_id) {
      setWorkspaceError('Sign in as a Customer Manager to create a project.');
      return;
    }

    setSetupBusy(true);
    setWorkspaceError('');
    const request = async (path, method, body) => {
      const response = await fetch(`${API}/api/v1${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Unable to save site setup');
      return result;
    };

    try {
      await request(`/organizations/${user.organization_id}`, 'PATCH', {
        name: form.company_name,
        industry: form.industry,
        organization_type: form.organization_type,
        operating_location: form.operating_location
      });

      let createdSite;
      if (form.created_site_id) {
        createdSite = await request(`/sites/${form.created_site_id}`, 'GET');
      } else {
        const existingSites = await request('/sites', 'GET');
        createdSite = existingSites.find(item => item.organization_id === user.organization_id && item.project_code === form.project_code);
        if (!createdSite) {
          createdSite = await request('/sites', 'POST', {
            organization_id: user.organization_id,
            name: form.name,
            project_code: form.project_code,
            address: form.address || null,
            project_type: form.project_type || null,
            area_acres: form.area_acres ? Number(form.area_acres) : null,
            start_date: form.start_date || null,
            expected_end_date: form.expected_end_date || null,
            latitude: form.latitude ? Number(form.latitude) : null,
            longitude: form.longitude ? Number(form.longitude) : null
          });
        }
        setForm(current => ({ ...current, created_site_id: createdSite.id }));
      }

      const configuredZones = await request(`/sites/${createdSite.id}/zones`, 'GET');
      for (const zone of form.zones || []) {
        if (!zone.zone_code?.trim() || !zone.name?.trim() || !zone.zone_type?.trim()) continue;
        if (!configuredZones.some(item => item.zone_code === zone.zone_code.trim())) {
          await request(`/sites/${createdSite.id}/zones`, 'POST', {
            zone_code: zone.zone_code.trim(),
            name: zone.name.trim(),
            zone_type: zone.zone_type.trim()
          });
        }
      }

      const thresholds = Object.fromEntries(
        ['pm25_warning', 'pm25_critical', 'pm10_warning', 'pm10_critical']
          .filter(key => form[key] !== '' && form[key] != null)
          .map(key => [key, Number(form[key])])
      );
      if (Object.keys(thresholds).length) {
        await request(`/sites/${createdSite.id}`, 'PATCH', { thresholds });
      }

      if (form.boundary_geojson?.trim()) {
        let boundary;
        try {
          boundary = JSON.parse(form.boundary_geojson);
        } catch {
          throw new Error('Site boundary must be valid GeoJSON.');
        }
        await request(`/sites/${createdSite.id}/map`, 'PUT', { boundary_geojson: boundary });
      }

      if (form.file && !form.site_plan_uploaded) {
        const upload = new FormData();
        upload.append('file', form.file);
        const response = await fetch(`${API}/api/v1/sites/${createdSite.id}/assets?asset_type=SITE_PLAN`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: upload
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Unable to upload the site plan');
        setForm(current => ({ ...current, site_plan_uploaded: true }));
      }

      let inviteMessage = '';
      if (form.team_email && !form.team_invited) {
        const invite = await request('/invitations', 'POST', {
          email: form.team_email,
          role: form.team_role || 'SITE_MANAGER',
          site_id: createdSite.id
        });
        inviteMessage = invite.development_token
          ? ` Invitation link: ${window.location.origin}/?invite=${encodeURIComponent(invite.development_token)}`
          : ' Invitation email delivery is not configured.';
        setForm(current => ({ ...current, team_invited: true }));
      }

      const updatedUser = { ...user, company_name: form.company_name || user.company_name };
      setUser(updatedUser);
      setSites(current => [createdSite, ...current.filter(item => item.id !== createdSite.id)]);
      selectSite(createdSite);
      setCustomerProject(false);
      setNotice(`Project setup saved.${inviteMessage}`);
      go('app');
    } catch (error) {
      setWorkspaceError(error.message || 'Unable to save site setup');
    } finally {
      setSetupBusy(false);
    }
  }

  async function generateReport(options = {}) {
    if (!token || !site?.id) {
      setNotice('Select an authorized site to generate a report.');
      return;
    }
    try {
      const response = await fetch(`${API}/api/v1/sites/${site.id}/reports`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: options.reportType || 'DAILY',
          range: options.range || '24 hours',
          source: options.source || 'PHYSICAL'
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Unable to generate report');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aerova-report-${site.project_code || 'export'}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice(`Report downloaded successfully`);
    } catch (error) {
      setNotice(error.message || 'Unable to generate report.');
    }
  }

  async function alertAction(id, action) {
    try {
      const response = await fetch(`${API}/api/v1/alerts/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{}'
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || 'Alert state could not be updated');
      setAlerts(rows => rows.map(alert => alert.id === id ? { ...alert, status: body.status } : alert));
      setNotice(`Alert ${action === 'resolve' ? 'resolved' : 'acknowledged'}`);
    } catch (error) {
      setWorkspaceError(error.message || 'Alert state could not be updated.');
    }
  }

  async function saveDevice(deviceId, changes) {
    try {
      const response = await fetch(`${API}/api/v1/devices/${deviceId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Unable to save device changes');
      setSiteDevices(current => current.map(device => device.id === deviceId ? { ...device, ...result } : device));
      setWorkspaceError('');
      setNotice('Device details saved.');
      return true;
    } catch (error) {
      setWorkspaceError(error.message || 'Unable to save device changes');
      return false;
    }
  }

  if (route === 'loading') return <div className="invite-activation"><b>Loading your AEROVA workspace…</b></div>;
  if (route === 'public') return <PublicSite go={go} />;
  if (route === 'login' || route === 'signup') return <AuthPage mode={route} go={go} onAuth={authDone} />;
  if (route === 'accept_invite') return <InvitationActivation onAuth={authDone} />;
  if (route === 'setup') return <SetupPage step={onboardStep} setStep={setOnboardStep} data={form} setData={setForm} saving={setupBusy} error={workspaceError} save={saveSiteSetup} skip={() => go('app')} />;

  if (route === 'app' && user?.role === 'AEROVA_ADMIN') return <AdminConsole token={token} user={user} onLogout={logout} />;
  if (route === 'app' && user?.role === 'WATER_DRIVER') return <DriverApp token={token} user={user} onLogout={logout} />;
  if (route === 'app' && user?.role === 'CUSTOMER_MANAGER' && !customerProject) {
    return (
      <CustomerConsole
        token={token}
        user={user}
        sites={sites}
        onLogout={logout}
        onOpenSite={(s, tab) => {
          selectSite(s);
          setActive(tab && SITE_MANAGER_NAV.some(x => x[0] === tab) ? tab : 'overview');
          setCustomerProject(true);
        }}
        onCreateProject={() => {
          setForm({ company_name: user?.company_name, organization_id: user?.organization_id });
          setOnboardStep(0);
          go('setup');
        }}
      />
    );
  }

  const activeAlertsCount = alerts.filter(a => a.status === 'ACTIVE').length;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? 'sidebar-open' : ''}`}>
        <div className="side-top">
          <Brand inverse onClick={() => go('public')} />
          <button className="close-nav" onClick={() => setMenu(false)}><X size={18} /></button>
        </div>

        <button className="org-choice" onClick={() => setDialog('organization')}>
          <span>{(user?.company_name || 'NF').slice(0, 2).toUpperCase()}</span>
          <div>
            <b>{user?.company_name || 'Organization workspace'}</b>
            <small>Organization</small>
          </div>
          <ChevronDown size={14} />
        </button>

        <nav>
          {SITE_MANAGER_NAV.map(([id, label, Icon]) => (
            <button
              key={id}
              className={active === id ? 'nav-link nav-on' : 'nav-link'}
              onClick={() => { setActive(id); setMenu(false); }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="side-bottom">
          <button className="user-row" onClick={() => setDialog('profile')}>
            <span>{user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || 'SM'}</span>
            <div>
              <b>{user?.full_name || 'Account'}</b>
              <small>{user?.role?.replaceAll('_', ' ') || 'Role unavailable'}</small>
            </div>
          </button>
          <button className="logout-link" onClick={logout}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>

      <div className="side-scrim" onClick={() => setMenu(false)} />

      <main className="app-main">
        <header className="app-topbar">
          <button className="open-nav" onClick={() => setMenu(true)}><Menu size={20} /></button>
          <div className="crumb">
            {customerProject && (
              <button className="org-return" onClick={() => setCustomerProject(false)}>
                <ArrowLeft size={14} /> Organization
              </button>
            )}
            <span>{user?.company_name || 'Organization'}</span>
            <ChevronRight size={14} />
            <button onClick={() => setDialog('site')}>
              {site?.name || 'Select site'} <ChevronDown size={14} />
            </button>
          </div>

          <div className="topbar-right">
            <div className="topbar-search">
              <label className="search-box">
                <Search size={16} />
                <input
                  value={query}
                  placeholder="Universal search..."
                  onChange={e => {
                    const val = e.target.value;
                    setQuery(val);
                    if (val.trim().length < 2) {
                      setHits([]);
                      setSearchState('');
                    } else {
                      setSearchState('loading');
                    }
                  }}
                />
                {query && <button onClick={() => { setQuery(''); setHits([]); }}>Clear</button>}
              </label>
              {query.trim().length >= 2 && (
                <div className="search-pop">
                  {searchState === 'loading' && <p>Searching…</p>}
                  {searchState === 'empty' && <p>No matches found.</p>}
                  {searchState === 'error' && <p>Search error.</p>}
                  {hits.map(h => (
                    <button
                      key={`${h.type}-${h.id}`}
                      onClick={() => {
                        const next = sites.find(s => s.id === h.site_id);
                        if (next) selectSite(next);
                        if (h.target === 'alerts') setAlertsOpen(true);
                        else if (SITE_MANAGER_NAV.some(x => x[0] === h.target)) setActive(h.target);
                        setQuery('');
                        setHits([]);
                      }}
                    >
                      <b>{h.title}</b>
                      <small>{h.type.toUpperCase()} · {h.subtitle}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className="bell"
              onClick={() => setAlertsOpen(true)}
              title="Site Alert Centre"
              style={{ position: 'relative' }}
            >
              <Bell size={18} />
              {activeAlertsCount > 0 && <i className="bell-badge">{activeAlertsCount}</i>}
            </button>

            <div style={{ position: 'relative' }} ref={profileRef}>
              <button className="avatar" onClick={() => setProfileOpen(!profileOpen)}>
                {user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || 'SM'}
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <div className="profile-menu-header">
                    <div className="profile-name">{user?.full_name}</div>
                    <div className="profile-email">{user?.email}</div>
                    <div className="profile-role">{user?.role?.replaceAll('_', ' ')}</div>
                  </div>
                  <button onClick={() => { setProfileOpen(false); setDialog('profile'); }}>
                    <Settings2 size={16} /> Account & profile
                  </button>
                  <button onClick={() => { setProfileOpen(false); setDialog('organization'); }}>
                    <Layers3 size={16} /> Organization settings
                  </button>
                  <button className="profile-logout-btn" onClick={() => { setProfileOpen(false); logout(); }}>
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {notice && (
          <div className="toast">
            <CheckCircle2 size={16} />{notice}
            <button onClick={() => setNotice('')}><X size={14} /></button>
          </div>
        )}
        {workspaceError && <div className="toast" role="alert">{workspaceError}</div>}

        {alertsOpen && (
          <div className="dialog-overlay" onClick={() => setAlertsOpen(false)}>
            <section className="dialog alert-center-dialog" onClick={e => e.stopPropagation()}>
              <header>
                <div>
                  <Eyebrow>SITE ALERT CENTRE</Eyebrow>
                  <h2>Active alerts ({activeAlertsCount})</h2>
                </div>
                <button onClick={() => setAlertsOpen(false)}><X size={18} /></button>
              </header>
              <div className="alert-filter-bar">
                {['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'ALL'].map(st => (
                  <button
                    key={st}
                    className={alertFilter === st ? 'filter-active' : ''}
                    onClick={() => setAlertFilter(st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <div className="alert-list-drawer">
                {alerts.filter(x => alertFilter === 'ALL' || x.status === alertFilter).map(a => (
                  <article key={a.id} className="alert-entry-card">
                    <div className="alert-meta">
                      <span className={`severity-tag severity-${a.severity}`}>{a.severity}</span>
                      <b>{a.title}</b>
                      <small>{a.zone} · {a.time}</small>
                    </div>
                    <div className="alert-status-actions">
                      <Tag type={a.source} />
                      <Risk value={a.status} />
                      {a.status === 'ACTIVE' && (
                        <button className="role-secondary" onClick={() => alertAction(a.id, 'acknowledge')}>
                          Acknowledge
                        </button>
                      )}
                      {a.status !== 'RESOLVED' && (
                        <button className="role-primary" onClick={() => alertAction(a.id, 'resolve')}>
                          Resolve
                        </button>
                      )}
                    </div>
                  </article>
                ))}
                {!alerts.length && <p className="role-muted">No alerts in this view.</p>}
              </div>
            </section>
          </div>
        )}

        <div className="page-body">
          <div className="page-title">
            <div>
              <Eyebrow>OPERATIONAL WORKSPACE</Eyebrow>
              <h1>{TITLES[active] || 'Workspace'}</h1>
            </div>
            {active === 'overview' && (
              <div className="title-actions">
                <Button onClick={() => generateReport()}><Download size={15} /> Export report</Button>
                <Button variant="primary" onClick={() => setDialog('intervention')}><Plus size={16} /> New intervention</Button>
              </div>
            )}
          </div>

          {active === 'overview' && (
            <Overview
              live={currentOverview}
              range={range}
              setRange={setRange}
              sourceFilter={sourceFilter}
              setSourceFilter={setSourceFilter}
              zoneFilter={zoneFilter}
              setZoneFilter={setZoneFilter}
              deviceFilter={deviceFilter}
              setDeviceFilter={setDeviceFilter}
              zones={dashboardZones}
              devices={activeSiteDevices}
              alerts={alerts}
              setActive={setActive}
              setSelected={setSelectedZone}
              intervention={() => setDialog('intervention')}
            />
          )}

          {active === 'map' && (
            <MapPage
              selected={selectedDashboardZone}
              setSelected={setSelectedZone}
              zones={dashboardZones}
              site={site}
              source={currentOverview?.source || 'NO DATA'}
            />
          )}

          {active === 'monitoring' && (
            <Monitoring
              token={token}
              site={site}
              range={range}
              setRange={setRange}
              sourceFilter={sourceFilter}
              zoneFilter={zoneFilter}
              deviceFilter={deviceFilter}
              zones={dashboardZones}
            />
          )}

          {active === 'interventions' && (
            <Interventions
              token={token}
              site={site}
              reloadKey={interventionsReload}
              create={() => setDialog('intervention')}
            />
          )}

          {active === 'resources' && (
            <Resources
              token={token}
              site={site}
              user={user}
            />
          )}

          {active === 'reports' && (
            <Reports generate={generateReport} />
          )}

          {active === 'management' && (
            <Management
              site={site}
              zones={dashboardZones}
              devices={activeSiteDevices}
              token={token}
              saveDevice={saveDevice}
            />
          )}
        </div>

        <footer className="app-footer">
          <span>© 2026 AEROVA Platform</span>
          <span>Source provenance, quality and timestamps are preserved on all operational measurements.</span>
        </footer>
      </main>

      {dialog && (
        <Dialog
          type={dialog}
          close={() => setDialog('')}
          site={site}
          sites={sites}
          onSelectSite={selectSite}
          zones={dashboardZones}
          token={token}
          user={user}
          notify={setNotice}
          onInterventionCreated={() => setInterventionsReload(value => value + 1)}
        />
      )}
    </div>
  );
}

function Overview({
  live, range, setRange, sourceFilter, setSourceFilter,
  zoneFilter, setZoneFilter, deviceFilter, setDeviceFilter, zones, devices, alerts, setActive, setSelected, intervention
}) {
  const availableDevices = devices;
  const filteredZones = useMemo(() => {
    if (!zoneFilter) return zones;
    return zones.filter(z => z.id === zoneFilter);
  }, [zones, zoneFilter]);

  const series = live?.series || [];

  const k = live?.kpis || {};

  return (
    <>
      <div className="filter-controls-row">
        <div className="filter-group">
          <label>Range:
            <select value={range} onChange={e => setRange(e.target.value)}>
              <option>Today</option>
              <option>24 hours</option>
              <option>7 days</option>
              <option>30 days</option>
            </select>
          </label>

          <label>Zone:
            <select value={zoneFilter} onChange={e => setZoneFilter(e.target.value)}>
              <option value="">All zones</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.zone_code || z.id} · {z.name}</option>)}
            </select>
          </label>

          <label>Source:
            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
              <option value="ALL">All sources</option>
              <option value="PHYSICAL">Physical only</option>
              <option value="SIMULATION">Simulation only</option>
            </select>
          </label>

          <label>Device:
            <select value={deviceFilter} onChange={e => setDeviceFilter(e.target.value)}>
              <option value="ALL">All devices</option>
              {availableDevices.map(device => (
                <option key={device.device_uid} value={device.device_uid}>{device.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="filter-status-tag">
          <Tag type={live ? (live.source || 'NO DATA') : 'NO DATA'} />
        </div>
      </div>

      <div className="kpi-grid">
        {[
          ['PM2.5', k.pm25, 'µg/m³', Wind, 'teal'],
          ['PM10', k.pm10, 'µg/m³', Cloud, 'coral'],
          ['Site dust risk', k.risk_level, '', Gauge, 'amber'],
          ['Active alerts', k.active_alerts, '', Bell, 'rose']
        ].map(([name, val, unit, Icon, color]) => (
          <article className="kpi-card" key={name}>
            <div>
              <span>{name}</span>
              <i className={`kpi-icon icon-${color}`}><Icon size={18} /></i>
            </div>
            <b>{val ?? 'No data'}<small>{unit}</small></b>
            <footer>
              <Tag type={live ? (live.source || 'NO DATA') : 'NO DATA'} />
              <span>{name === 'Site dust risk' ? 'Configured risk assessment' : 'Continuous measurement'}</span>
            </footer>
          </article>
        ))}
      </div>

      <div className="overview-grid">
        <Panel
          title="Dust concentration trend"
          kicker="MEASUREMENTS OVER TIME"
          action={<button className="text-link" onClick={() => setActive('monitoring')}>View monitoring <ArrowUpRight size={14} /></button>}
        >
          <div className="chart-legend">
            <span><i style={{ background: '#ff6845' }} /> PM10</span>
            <span><i style={{ background: '#17645f' }} /> PM2.5</span>
            <small>µg/m³ · {range}</small>
          </div>
          {series.length ? (
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fill10" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff6845" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#ff6845" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fill25" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#17645f" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#17645f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#ece9e2" strokeDasharray="3 3" />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#89918b' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#89918b' }} />
                  <Tooltip contentStyle={{ border: '1px solid #e5e0d8', borderRadius: 8, fontSize: 13 }} />
                  <Area dataKey="pm10" name="PM10" type="monotone" stroke="#ff6845" strokeWidth={2.4} fill="url(#fill10)" />
                  <Area dataKey="pm25" name="PM2.5" type="monotone" stroke="#17645f" strokeWidth={2.4} fill="url(#fill25)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty icon={Activity} title="No stored readings yet" body="Connect a sensor to build an operational trend." action="Review devices" onClick={() => setActive('management')} />
          )}
        </Panel>

        <Panel
          title="Zone conditions"
          kicker="OPERATIONAL ZONES"
          action={<button className="icon-only" onClick={() => setActive('map')}><ArrowUpRight size={16} /></button>}
        >
          <div className="zone-list">
            {filteredZones.map(z => (
              <button key={z.id} onClick={() => { setSelected(z); setActive('map'); }}>
                <i className={`zone-dot dot-${z.risk || 'unknown'}`} />
                <span>
                  <b>{z.name}</b>
                  <small>{z.zone_code || z.id} · {z.devices ? `${z.devices} devices assigned` : 'No device assigned'}</small>
                </span>
                <strong>{z.pm10 ?? '—'}<small>{z.pm10 != null ? 'µg/m³' : ''}</small></strong>
                <Risk value={z.risk || 'unknown'} />
              </button>
            ))}
            {!filteredZones.length && <p className="role-muted">No zones configured for this site.</p>}
          </div>
          <button className="panel-link" onClick={() => setActive('map')}>
            Open live site map <ArrowRight size={15} />
          </button>
        </Panel>
      </div>

      <div className="overview-bottom">
        <Panel title="Recent alerts" kicker="NEEDS ATTENTION" action={<button className="text-link" onClick={() => setActive('reports')}>Reports <ArrowRight size={14} /></button>}>
          {alerts.filter(a => a.status === 'ACTIVE').slice(0, 3).map(a => (
            <div className="alert-preview-row" key={a.id}>
              <i className={`alert-indicator severity-${a.severity}`} />
              <span>
                <b>{a.title}</b>
                <small>{a.zone} · {a.time}</small>
              </span>
              <Risk value={a.severity} />
            </div>
          ))}
          {!alerts.filter(a => a.status === 'ACTIVE').length && (
            <p className="role-muted">No active alerts requiring attention.</p>
          )}
        </Panel>

        <Panel title="Resources overview" kicker="WATER & EQUIPMENT">
          <div className="resource-mini">
            <div>
              <Droplets size={22} />
              <span>
                <small>Tank water level</small>
                <b>{k.water_level_pct ?? 'No data'}{k.water_level_pct != null ? '%' : ''}</b>
              </span>
              {k.water_level_pct != null && <i><b style={{ width: `${k.water_level_pct}%` }} /></i>}
            </div>
            <div>
              <Activity size={22} />
              <span>
                <small>Connected sensors</small>
                <b>{k.connected_devices ?? 'No data'}</b>
              </span>
              <Tag type={live ? (live.source || 'NO DATA') : 'NO DATA'} />
            </div>
          </div>
        </Panel>

        <Panel title="Quick actions" kicker="WORKFLOW SHORTCUTS" className="quick-panel">
          <button onClick={() => setActive('reports')}><FileText size={18} /><span>Generate report</span><ArrowRight size={14} /></button>
          <button onClick={intervention}><Zap size={18} /><span>Draft intervention</span><ArrowRight size={14} /></button>
          <button onClick={() => setActive('resources')}><Droplets size={18} /><span>Review water tasks</span><ArrowRight size={14} /></button>
        </Panel>
      </div>
    </>
  );
}

function MapPage({ selected, setSelected, zones, site, source }) {
  const activeZone = selected || zones[0] || null;
  return (
    <div className="map-layout">
      <aside className="map-side">
        <div className="map-side-head">
          <b>Site operational zones</b>
        </div>
        {zones.map(z => (
          <button
            className={`map-zone ${activeZone?.id === z.id ? 'chosen' : ''}`}
            key={z.id}
            onClick={() => setSelected(z)}
          >
            <i className={`zone-dot dot-${z.risk || 'unknown'}`} />
            <span>
              <b>{z.zone_code || z.id} · {z.name}</b>
              <small>{z.type}</small>
            </span>
            <ChevronRight size={15} />
          </button>
        ))}
        {!zones.length && <p className="role-muted">No zones configured for this site.</p>}

      </aside>

      <section className="map-column">
        <div className="map-controls">
          <span><MapPin size={15} /> {site?.address || site?.project_code || 'Site address not configured'}</span>
          <Tag type={source} />
        </div>

        {activeZone ? <div className="zone-drawer">
          <div className="zone-drawer-title">
            <span className={`zone-dot dot-${activeZone.risk || 'unknown'}`} />
            <span>
              <small>{activeZone.zone_code || activeZone.id} · {activeZone.type}</small>
              <b>{activeZone.name}</b>
            </span>
            <Risk value={activeZone.risk} />
          </div>
          <p>{activeZone.lastUpdated ? `Last reading: ${new Date(activeZone.lastUpdated).toLocaleString()}` : 'No recent readings assigned to this zone.'}</p>
          <div className="zone-readings">
            {[
              ['PM10 concentration', activeZone.pm10 == null ? 'No data' : `${activeZone.pm10} µg/m³`],
              ['PM2.5 concentration', activeZone.pm25 == null ? 'No data' : `${activeZone.pm25} µg/m³`],
              ['Assigned devices', `${activeZone.devices} devices`],
              ['Freshness', activeZone.lastUpdated ? new Date(activeZone.lastUpdated).toLocaleString() : 'No fresh reading']
            ].map(([a, b]) => (
              <div key={a}>
                <small>{a}</small>
                <b>{b}</b>
              </div>
            ))}
          </div>
        </div> : <div className="zone-drawer"><p>Select a configured zone to view its data.</p></div>}
      </section>
    </div>
  );
}

function Monitoring({ token, site, range, setRange, sourceFilter, zoneFilter, deviceFilter, zones }) {
  const [subtab, setSubtab] = useState('readings');
  const [telemetry, setTelemetry] = useState([]);
  const [devices, setDevices] = useState([]);
  const [riskData, setRiskData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loadedKey, setLoadedKey] = useState('');
  const requestKey = [site?.id, range, sourceFilter, zoneFilter, deviceFilter].join('|');
  const activeTelemetry = loadedKey === requestKey ? telemetry : [];
  const activeDevices = loadedKey === requestKey ? devices : [];
  const activeRiskData = loadedKey === requestKey ? riskData : null;

  useEffect(() => {
    if (!token || !site?.id) return;

    const ctrl = new AbortController();
    const params = new URLSearchParams({ limit: '1000', range });
    if (sourceFilter !== 'ALL') params.set('source_type', sourceFilter);
    if (zoneFilter) params.set('zone_id', zoneFilter);
    if (deviceFilter !== 'ALL') params.set('device_uid', deviceFilter);
    const headers = { Authorization: `Bearer ${token}` };
    const read = async path => {
      const response = await fetch(`${API}/api/v1${path}`, { headers, signal: ctrl.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || 'Unable to load monitoring data');
      return body;
    };

    Promise.all([
      read(`/sites/${site.id}/telemetry?${params}`),
      read(`/sites/${site.id}/devices`),
      read(`/sites/${site.id}/risk`)
    ])
      .then(([history, deviceRows, risks]) => {
        setTelemetry(history.items || []);
        setDevices(deviceRows);
        setRiskData(risks);
        setLoadedKey(requestKey);
        setLoadError('');
      })
      .catch(error => {
        if (!ctrl.signal.aborted) setLoadError(error.message || 'Unable to load monitoring data');
      });
    return () => ctrl.abort();
  }, [token, site?.id, range, sourceFilter, zoneFilter, deviceFilter, requestKey]);

  const sensorDefinitions = [
    { name: 'PM10', keys: ['pm10_ug_m3'], unit: 'µg/m³', category: 'Air quality' },
    { name: 'PM2.5', keys: ['pm25_ug_m3'], unit: 'µg/m³', category: 'Air quality' },
    { name: 'Temperature', keys: ['temperature_c'], unit: '°C', category: 'Environment' },
    { name: 'Humidity', keys: ['humidity_pct'], unit: '%', category: 'Environment' },
    { name: 'Wind speed', keys: ['wind_speed_kmh'], unit: 'km/h', category: 'Weather' },
    { name: 'Wind direction', keys: ['wind_direction_sector', 'wind_direction_deg'], unit: '', category: 'Weather' },
    { name: 'Soil moisture', keys: ['soil_moisture_pct'], unit: '%', category: 'Soil' },
    { name: 'Activity', keys: ['activity_type'], unit: '', category: 'Operations' },
    { name: 'Worker presence', keys: ['worker_presence', 'worker_count', 'worker_present'], unit: '', category: 'Workforce' },
    { name: 'Tank level', keys: ['tank_level_pct'], unit: '%', category: 'Water' },
    { name: 'Water flow', keys: ['water_flow_lpm'], unit: 'L/min', category: 'Water' },
    { name: 'Vehicle movement', keys: ['vehicle_count', 'vehicle_detected', 'vehicle_movement'], unit: '', category: 'Vehicle' },
    { name: 'Equipment state', keys: ['equipment_state'], unit: '', category: 'Equipment' },
    { name: 'Rain detection', keys: ['rain_mm_h', 'rain_detected'], unit: '', category: 'Weather' },
    { name: 'Vibration', keys: ['vibration_g', 'vibration_mm_s', 'vibration_level'], units: { vibration_g: 'g', vibration_mm_s: 'mm/s' }, unit: '', category: 'Equipment' },
    { name: 'Gas', keys: ['gas_raw_pct', 'gas_ppm'], units: { gas_raw_pct: '%', gas_ppm: 'ppm' }, unit: '', category: 'Gas' }
  ];

  const sensorRows = sensorDefinitions.map(sensor => {
    for (let i = activeTelemetry.length - 1; i >= 0; i--) {
      const event = activeTelemetry[i];
      const metricKey = sensor.keys.find(key => event.metrics?.[key] != null || event.states?.[key] != null);
      const value = metricKey ? event.metrics?.[metricKey] ?? event.states?.[metricKey] : null;
      if (metricKey) {
        const displayValue = typeof value === 'boolean' ? (value ? 'Detected' : 'Not detected') : String(value);
        return { ...sensor, value: displayValue, unit: sensor.units?.[metricKey] ?? sensor.unit, source: event.source_type || 'NO DATA', updated: event.received_at_utc };
      }
    }
    return { ...sensor, value: null, source: 'NO DATA', updated: null };
  });

  const trend = activeTelemetry
    .filter(event => event.metrics?.pm10_ug_m3 != null || event.metrics?.pm25_ug_m3 != null)
    .map(event => ({
      time: new Date(event.received_at_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pm10: event.metrics?.pm10_ug_m3 ?? null,
      pm25: event.metrics?.pm25_ug_m3 ?? null
    }));

  return (
    <>
      {loadError && <div className="role-message" role="alert">{loadError}</div>}
      <div className="subtabs">
        <button className={subtab === 'readings' ? 'on' : ''} onClick={() => setSubtab('readings')}>Live readings</button>
        <button className={subtab === 'trends' ? 'on' : ''} onClick={() => setSubtab('trends')}>Historical trends</button>
        <button className={subtab === 'predictions' ? 'on' : ''} onClick={() => setSubtab('predictions')}>Risk & Predictions</button>
        <button className={subtab === 'comparison' ? 'on' : ''} onClick={() => setSubtab('comparison')}>Sensor comparison</button>
        <button className={subtab === 'thresholds' ? 'on' : ''} onClick={() => setSubtab('thresholds')}>Thresholds</button>
        <span />
        <select value={range} onChange={e => setRange(e.target.value)}>
          <option>Today</option>
          <option>24 hours</option>
          <option>7 days</option>
          <option>30 days</option>
        </select>
      </div>

      {subtab === 'readings' && (
        <>
          <div className="reading-grid">
          {sensorRows.map(s => (
            <article key={s.name} className="sensor-card">
              <small>{s.name}</small>
              <b>
                {s.value !== null ? `${s.value} ` : 'No fresh reading'}
                {s.value !== null && <i>{s.unit}</i>}
              </b>
              <footer>
                <span>{s.category}{s.updated ? ` · ${new Date(s.updated).toLocaleString()}` : ''}</span>
                <Tag type={s.source} />
              </footer>
            </article>
          ))}
          </div>
        </>
      )}

      {subtab === 'trends' && (
        <Panel title="Historical dust concentration" kicker="TREND ANALYSIS">
          {trend.length ? (
            <div className="chart big-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <CartesianGrid vertical={false} stroke="#ece9e2" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Area dataKey="pm10" stroke="#ff6845" fill="#ff684522" name="PM10" />
                  <Area dataKey="pm25" stroke="#17645f" fill="#17645f22" name="PM2.5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty icon={Activity} title="No readings in this range" body="Stored particulate readings will appear here when available." />
          )}
        </Panel>
      )}

      {subtab === 'predictions' && (
        <div className="prediction-integrated-view">
          <div className="prediction-banner">
            <div>
              <small>CURRENT RULE-BASED RISK</small>
              <h2>{activeRiskData?.level ? `${activeRiskData.level} site risk` : 'Risk unavailable'}</h2>
              <p>Forecasting is unavailable; this assessment reflects configured rules and recent readings only.</p>
              <Tag type={activeRiskData?.level ? 'DERIVED' : 'NO DATA'} />
            </div>
            <strong>{activeRiskData?.overall ?? '—'}<small>Risk score</small></strong>
          </div>

          <div className="split-panels">
            <Panel title="Current risk by zone" kicker="DERIVED FROM TELEMETRY">
              {(activeRiskData?.zones || []).map(z => {
                const level = z.level || z.risk?.level || z.risk || 'UNKNOWN';
                const score = z.score ?? z.risk?.score;
                return (
                <div className="risk-meter-row" key={z.id || z.zone_id}>
                  <b>{z.code || z.zone_code || z.id}</b>
                  <span>{z.name || z.zone_name}</span>
                  <i><b style={{ width: `${score ?? 0}%` }} /></i>
                  <Risk value={level} />
                </div>
                );
              })}
              {!activeRiskData?.zones?.length && <p className="role-muted">No risk assessment is available for this site.</p>}
            </Panel>

            <Panel title="Risk explanation factors" kicker="TRANSPARENT REASONING">
              <div className="factor-list">
                {(activeRiskData?.zones || []).flatMap(zone => (zone.reasons || []).map(reason => [zone.zone_name, reason, Activity]).slice(0, 4))
                .slice(0, 4).map(([a, b, Icon]) => (
                  <div key={a}>
                    <Icon size={16} />
                    <span>
                      <b>{a}</b>
                      <small>{b}</small>
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
          <p className="plain-note"><Shield size={15} /> Risk scores are derived assessments, not measured concentrations or proof of cause. Forecasts are not configured for live data.</p>
        </div>
      )}

      {subtab === 'comparison' && (
        <Panel title="Sensor comparison & data quality" kicker="CALIBRATION & DRIFT">
          <table className="role-table">
            <thead>
              <tr><th>Sensor UID</th><th>Type</th><th>Assigned Zone</th><th>Freshness</th><th>Calibration drift</th><th>Source</th></tr>
            </thead>
            <tbody>
              {activeDevices.map(device => (
                <tr key={device.id}>
                  <td><b>{device.device_uid}</b></td>
                  <td>{device.device_type}</td>
                  <td>{zones.find(zone => zone.id === device.zone_id)?.name || 'Unassigned'}</td>
                  <td>{device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : 'No data'}</td>
                  <td>Not recorded</td>
                  <td><Tag type={device.source_type} /></td>
                </tr>
              ))}
              {!activeDevices.length && <tr><td colSpan={6} className="role-empty">No devices registered for this site.</td></tr>}
            </tbody>
          </table>
        </Panel>
      )}

      {subtab === 'thresholds' && (
        <Panel title="Configured site thresholds" kicker="CUSTOMER CONFIGURATION">
          <div className="thresholds">
            {Object.entries(site?.thresholds || {}).flatMap(([metric, entries]) =>
              entries.map(entry => (
                <span key={`${entry.zone_id}-${metric}`}>
                  {metric} · {zones.find(zone => zone.id === entry.zone_id)?.name || entry.zone_id}:
                  <b> {entry.warning_value ?? '—'} / {entry.critical_value ?? '—'} {entry.unit}</b>
                </span>
              ))
            )}
            {!Object.values(site?.thresholds || {}).some(entries => entries.length) && <p className="role-muted">No thresholds are configured in the database.</p>}
          </div>
        </Panel>
      )}
    </>
  );
}

function Interventions({ token, site, create, reloadKey }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !site?.id) return;
    const controller = new AbortController();
    fetch(`${API}/api/v1/sites/${site.id}/interventions`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.detail || 'Unable to load interventions');
        setItems(body);
        setError('');
      })
      .catch(error => {
        if (!controller.signal.aborted) setError(error.message || 'Unable to load interventions');
      });
    return () => controller.abort();
  }, [token, site?.id, reloadKey]);

  return (
    <>
      <div className="subtabs">
        <span>Persisted interventions</span>
        <span />
        <Button variant="primary" onClick={create}><Plus size={15} /> Create intervention</Button>
      </div>
      {error && <div className="role-message" role="alert">{error}</div>}
      <Panel title="Persisted intervention records" kicker="DATABASE RECORDS">
        {items.map(item => (
          <div key={item.id} className="management-zone">
            <b>{item.intervention_type}</b>
            <span>{item.reason}</span>
            <small>{item.status} · {new Date(item.created_at).toLocaleString()}</small>
            <Risk value={item.status} />
          </div>
        ))}
        {!error && !items.length && <Empty icon={ClipboardList} title="No intervention records" />}
      </Panel>
    </>
  );
}

function Resources({ token, site, user }) {
  const [subtab, setSubtab] = useState('water');
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !site?.id) return;
    const controller = new AbortController();
    fetch(`${API}/api/v1/sites/${site.id}/telemetry?limit=300`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.detail || 'Unable to load site activity');
        setEvents(body.items || []);
        setError('');
      })
      .catch(error => {
        if (!controller.signal.aborted) setError(error.message || 'Unable to load site activity');
      });
    return () => controller.abort();
  }, [token, site?.id]);

  return (
    <>
      <div className="subtabs">
        <button className={subtab === 'water' ? 'on' : ''} onClick={() => setSubtab('water')}>Water task records</button>
        <button className={subtab === 'workforce' ? 'on' : ''} onClick={() => setSubtab('workforce')}>Recorded site activity</button>
      </div>
      {subtab === 'water' && <SiteWaterOperations token={token} site={site} user={user} />}
      {subtab === 'workforce' && (
        <Panel title="Recorded telemetry activity" kicker="DATABASE RECORDS">
          {error && <div className="role-message" role="alert">{error}</div>}
          {events.map(event => (
            <div className="management-zone" key={event.event_id}>
              <b>{event.states?.activity_type || event.metrics?.activity_type || 'Telemetry event'}</b>
              <span>{event.zone_id || 'No zone assigned'}</span>
              <small>{event.source_type} · {event.received_at_utc ? new Date(event.received_at_utc).toLocaleString() : ''}</small>
              <small>{JSON.stringify({ ...event.metrics, ...event.states })}</small>
            </div>
          ))}
          {!error && !events.length && <Empty icon={Activity} title="No telemetry activity recorded" />}
        </Panel>
      )}
    </>
  );
}

function Reports({ generate }) {
  const [reportType, setReportType] = useState('DAILY');
  const [range, setRange] = useState('Today');
  const [source, setSource] = useState('ALL');

  return (
    <>
      <Panel title="Generate operational compliance report" kicker="REPORT BUILDER">
        <div className="report-options">
          <label>Report type
            <select value={reportType} onChange={e => setReportType(e.target.value)}>
              <option value="DAILY">Daily site summary</option>
              <option value="WEEKLY">Weekly operational report</option>
              <option value="MONTHLY">Monthly site report</option>
            </select>
          </label>
          <label>Date range
            <select value={range} onChange={e => setRange(e.target.value)}>
              <option value="Today">Today</option>
              <option value="7 days">Last 7 days</option>
              <option value="30 days">Last 30 days</option>
            </select>
          </label>
          <label>Source
            <select value={source} onChange={e => setSource(e.target.value)}>
              <option value="ALL">All sources</option>
              <option value="PHYSICAL">Physical only</option>
              <option value="SIMULATION">Simulation only</option>
            </select>
          </label>
        </div>

        <div className="report-foot">
          <span><Shield size={16} /> Reports support operational records and documentation.</span>
          <Button variant="primary" onClick={() => generate({ reportType, range, source })}>
            <Download size={16} /> Download CSV report
          </Button>
        </div>
      </Panel>
    </>
  );
}

function Management({ site, zones, devices, saveDevice }) {
  const [subtab, setSubtab] = useState('details');
  const [deviceDrafts, setDeviceDrafts] = useState({});
  const connectedCount = devices.filter(device => device.status === 'CONNECTED').length;
  const staleCount = devices.filter(device => device.status === 'OFFLINE' && device.last_seen_at).length;
  const offlineCount = devices.filter(device => device.status === 'NO DATA').length;

  return (
    <>
      <div className="subtabs">
        <button className={subtab === 'details' ? 'on' : ''} onClick={() => setSubtab('details')}>Site details</button>
        <button className={subtab === 'zones' ? 'on' : ''} onClick={() => setSubtab('zones')}>Zones</button>
        <button className={subtab === 'devices' ? 'on' : ''} onClick={() => setSubtab('devices')}>Devices & Sensors</button>
      </div>

      {subtab === 'details' && (
        <Panel title="Project details" kicker="SITE PROFILE">
          <div className="site-details">
            {[
              ['Project name', site?.name || 'Not set'],
              ['Project ID', site?.project_code || 'Not set'],
              ['Address / Location', site?.address || 'Not set'],
              ['Project type', site?.project_type || 'Not set'],
              ['Site area', site?.area_acres != null ? `${site.area_acres} acres` : 'Not set'],
              ['Start date', site?.start_date || 'Not set'],
              ['Expected end date', site?.expected_end_date || 'Not set']
            ].map(([a, b]) => (
              <div key={a}>
                <small>{a}</small>
                <b>{b}</b>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {subtab === 'zones' && (
        <Panel title="Operational zones" kicker="CONFIGURED ZONES">
          {zones.map(z => (
            <div className="management-zone" key={z.id}>
              <b>{z.id}</b>
              <span>{z.name}</span>
              <small>{z.type}</small>
              <span>{z.devices} devices</span>
              <Risk value={z.risk} />
            </div>
          ))}
        </Panel>
      )}

      {subtab === 'devices' && (
        <Panel title="Device inventory & assignments" kicker="SENSOR HARDWARE">
          <div className="device-stats">
            <span><b>{connectedCount}</b> Connected</span>
            <span><b>{staleCount}</b> Stale</span>
            <span><b>{offlineCount}</b> Offline / no data</span>
            <span>Site Manager can edit zone assignments and metadata. Security credential rotation remains restricted.</span>
          </div>

          <table className="role-table">
            <thead>
              <tr><th>Device UID</th><th>Name</th><th>Type</th><th>Source</th><th>Assigned Zone</th><th>Status</th><th>Last seen</th><th /></tr>
            </thead>
            <tbody>
              {devices.map(device => {
                  const draft = deviceDrafts[device.id] || {};
                  const changed = Object.keys(draft).length > 0;
                  return (
                    <tr key={device.id}>
                      <td><b>{device.device_uid}</b></td>
                      <td><input aria-label={`Device name for ${device.device_uid}`} value={draft.name ?? device.name} onChange={e => setDeviceDrafts(current => ({ ...current, [device.id]: { ...current[device.id], name: e.target.value } }))} /></td>
                      <td><input aria-label={`Device type for ${device.device_uid}`} value={draft.device_type ?? device.device_type} onChange={e => setDeviceDrafts(current => ({ ...current, [device.id]: { ...current[device.id], device_type: e.target.value } }))} /></td>
                      <td><Tag type={device.source_type} /></td>
                      <td>
                        <select
                          aria-label={`Zone assignment for ${device.device_uid}`}
                          value={draft.zone_id ?? device.zone_id ?? ''}
                          onChange={e => setDeviceDrafts(current => ({ ...current, [device.id]: { ...current[device.id], zone_id: e.target.value || null } }))}
                        >
                          <option value="">Unassigned</option>
                          {zones.map(zone => <option key={zone.id} value={zone.id}>{zone.zone_code || zone.id} · {zone.name}</option>)}
                        </select>
                      </td>
                      <td><Risk value={device.status} /></td>
                      <td>{device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : 'No data'}</td>
                      <td><button className="role-link" disabled={!changed} onClick={async () => {
                        if (await saveDevice(device.id, draft)) {
                          setDeviceDrafts(current => ({ ...current, [device.id]: {} }));
                        }
                      }}>Save</button></td>
                    </tr>
                  );
                })}
              {!devices.length && <tr><td colSpan={8} className="role-empty">No devices registered for this site.</td></tr>}
            </tbody>
          </table>
        </Panel>
      )}

    </>
  );
}

function Dialog({ type, close, site, sites, zones, token, user, notify, onSelectSite, onInterventionCreated }) {
  const titles = {
    intervention: 'Create intervention draft',
    organization: 'Organization settings',
    site: 'Switch site',
    profile: 'Account & profile'
  };

  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (type === 'site') {
      const selected = sites.find(item => item.id === new FormData(e.currentTarget).get('site_id'));
      if (!selected) {
        setError('Select an authorized site.');
        return;
      }
      onSelectSite(selected);
      close();
      return;
    }
    if (type === 'intervention') {
      if (!token || !site?.id) {
        setError('Select an authorized site first.');
        return;
      }
      const fd = new FormData(e.currentTarget);
      try {
        const res = await fetch(`${API}/api/v1/sites/${site.id}/interventions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site_id: site.id,
            zone_id: fd.get('zone_id'),
            intervention_type: fd.get('intervention_type'),
            rationale: fd.get('rationale')
          })
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.detail);
        notify(`Draft intervention created (${body.id.slice(0, 8)})`);
        onInterventionCreated();
        close();
      } catch (err) {
        setError(err.message === 'Failed to fetch' ? 'API is offline.' : err.message);
      }
      return;
    }

    close();
  }

  return (
    <div className="dialog-overlay" onClick={close}>
      <section className="dialog" onClick={e => e.stopPropagation()}>
        <header>
          <div>
            <Eyebrow>SITE WORKSPACE</Eyebrow>
            <h2>{titles[type]}</h2>
          </div>
          <button onClick={close}><X size={18} /></button>
        </header>

        <form onSubmit={submit}>
          {type === 'intervention' && (
            <>
              <label>Target zone
                <select name="zone_id">
                  {zones.map(z => <option key={z.id} value={z.id}>{z.id} · {z.name}</option>)}
                </select>
              </label>
              <label>Action type
                <select name="intervention_type">
                  <option>Targeted tanker misting</option>
                  <option>Dry-first vacuum sweeping</option>
                  <option>Surface mulch & binding</option>
                  <option>Wheel wash station activation</option>
                </select>
              </label>
              <label>Operational rationale
                <textarea name="rationale" required minLength={5} placeholder="Describe the condition and reason for intervention..." />
              </label>
              <div className="safety-box">
                <ShieldAlert size={18} />
                <span><b>Safety interlocks authoritative</b> — Local emergency stops and low water interlocks remain active on equipment.</span>
              </div>
            </>
          )}

          {type === 'profile' && (
            <div className="profile-details-view">
              <p><b>Name:</b> {user?.full_name}</p>
              <p><b>Email:</b> {user?.email}</p>
              <p><b>Role:</b> {user?.role?.replaceAll('_', ' ')}</p>
              <p><b>Organization:</b> {user?.company_name || 'N/A'}</p>
            </div>
          )}

          {type === 'organization' && (
            <div className="profile-details-view">
              <p><b>Company:</b> {user?.company_name || 'Organization'}</p>
              <p><b>Workspace ID:</b> {user?.organization_id || 'Primary'}</p>
              <p className="role-muted">Organization administrators can edit organization name and invite teammates.</p>
            </div>
          )}

          {type === 'site' && (
            <div className="profile-details-view">
              <label>Authorized site
                <select name="site_id" defaultValue={site?.id || ''} required>
                  {sites.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            </div>
          )}

          {error && <div className="form-error"><AlertTriangle size={15} />{error}</div>}

          <footer>
            <Button onClick={close}>Cancel</Button>
            <Button variant="primary" type="submit">
              {type === 'intervention' ? 'Save draft intervention' : 'Done'} <ArrowRight size={15} />
            </Button>
          </footer>
        </form>
      </section>
    </div>
  );
}
