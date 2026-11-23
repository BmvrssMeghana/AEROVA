import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, Bell, Check, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, Cloud, Command, Compass, Download, Droplets, FileText,
  Gauge, HardHat, Layers3, Leaf, LogOut, MapPin, Menu, Plus, Radio, Search, Settings2,
  Shield, ShieldAlert, Sparkles, Wind, X, Zap
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
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

const ZONES = [
  { id: 'Z1', name: 'Excavation & earthworks', type: 'Excavation', risk: 'high', pm10: 142, devices: 2 },
  { id: 'Z2', name: 'Haul road', type: 'Vehicle movement', risk: 'rising', pm10: 86, devices: 2 },
  { id: 'Z3', name: 'Main monitoring', type: 'General construction', risk: 'clear', pm10: 34, devices: 1 },
  { id: 'Z4', name: 'Downwind boundary', type: 'Boundary', risk: 'clear', pm10: 28, devices: 1 },
  { id: 'Z5', name: 'Worker exposure area', type: 'Exposure context', risk: 'unknown', pm10: null, devices: 0 },
];

const SAMPLE_TREND = [
  { time: '06:00', pm10: 36, pm25: 13 },
  { time: '08:00', pm10: 52, pm25: 18 },
  { time: '10:00', pm10: 44, pm25: 15 },
  { time: '12:00', pm10: 78, pm25: 29 },
  { time: '14:00', pm10: 63, pm25: 21 },
  { time: '16:00', pm10: 104, pm25: 38 },
  { time: '18:00', pm10: 86, pm25: 29 },
];

const SAMPLE_ALERTS = [
  { id: 'AL-2084', title: 'PM10 above configured threshold', zone: 'Z1 · Excavation & earthworks', time: '2 min ago', severity: 'critical', value: '142 µg/m³', status: 'ACTIVE', source: 'SIMULATION' },
  { id: 'AL-2083', title: 'Dust risk rising with vehicle activity', zone: 'Z2 · Haul road', time: '8 min ago', severity: 'warning', value: '86 µg/m³', status: 'ACTIVE', source: 'SIMULATION' },
  { id: 'AL-2082', title: 'Device data is stale', zone: 'Z5 · Exposure area', time: '17 min ago', severity: 'info', value: 'No fresh data', status: 'ACTIVE', source: 'SYSTEM' },
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

function Tag({ type = 'SIMULATION' }) {
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
  const [menu, setMenu] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');

  return (
    <div className="public-page">
      <header className="public-header">
        <Brand onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        <button className="mobile-menu" onClick={() => setMenu(!menu)}><Menu /></button>
        <nav className={menu ? 'public-nav open' : 'public-nav'}>
          <a href="#how">How it works</a>
          <a href="#solutions">Solutions</a>
          <a href="#technology">Technology</a>
          <a href="#contractors">For contractors</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="header-actions">
          <button className="plain-button" onClick={() => go('login')}>Sign in</button>
          <Button variant="dark" onClick={() => go('signup')}>Get started <ArrowRight size={15} /></Button>
        </div>
      </header>

      <main>
        <section className="public-hero">
          <div className="hero-copy">
            <Eyebrow><i /> CONSTRUCTION SITE DUST INTELLIGENCE</Eyebrow>
            <h1>Know the dust.<br /><em>Control the source.</em></h1>
            <p>Bring site conditions, risk signals and response actions together. See where dust starts, understand where it moves, and make every intervention count.</p>
            <div className="hero-buttons">
              <Button variant="coral" onClick={() => go('signup')}>Create an account <ArrowRight size={15} /></Button>
              <a className="button button-outline" href="#how"><span className="play">▶</span> Explore how it works</a>
            </div>
            <div className="trust-note">
              <span><Check size={14} /></span> Built for site teams, EHS leads, and project directors
            </div>
          </div>
          <div className="hero-dashboard">
            <div className="preview-head">
              <span><i /> DEMO SITE <b>/</b> OVERVIEW</span>
              <Tag type="ILLUSTRATIVE" />
            </div>
            <SiteIllustration compact />
            <div className="preview-foot">
              <div>
                <small>SITE DUST RISK</small>
                <b><i /> Moderate</b>
              </div>
              <span>5 zones <i /> 6 devices <i /> Illustrative</span>
              <button onClick={() => go('demo')} title="Explore illustrative demo"><ArrowUpRight size={18} /></button>
            </div>
            <div className="float-kpi">
              <span><Wind size={18} /></span>
              <div>
                <small>PM10 · ILLUSTRATIVE</small>
                <b>86 <i>µg/m³</i></b>
              </div>
              <em>↘ 12%</em>
            </div>
          </div>
        </section>

        <div className="journey-strip" id="how">
          <small>ONE CONNECTED WORKFLOW</small>
          <div>
            {['Sense', 'Map', 'Predict', 'Decide', 'Act', 'Optimize'].map((x, i) => (
              <span key={x}>
                <b>{x}</b>
                {i < 5 && <ArrowRight size={14} />}
              </span>
            ))}
          </div>
        </div>

        <section className="section-wrap public-problem">
          <Eyebrow>WHY AEROVA</Eyebrow>
          <div className="problem-intro">
            <h2>Dust changes with<br />the work on site.</h2>
            <p>A reading alone can’t tell your team what to do next. AEROVA adds location, wind, activity and equipment context to help people find the source, choose a response and record its outcome.</p>
          </div>
          <div className="outcome-row">
            {[
              ['01', 'Understand where', 'Connect measurements to zones, work areas and boundary conditions.'],
              ['02', 'Act with context', 'Use transparent risk reasoning and source-specific recommendations.'],
              ['03', 'Learn what worked', 'Keep intervention, water and follow-up evidence together.']
            ].map(([n, t, d]) => (
              <article key={n}>
                <small>{n}</small>
                <b>{t}</b>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="workflow-bg" id="solutions">
          <div className="section-wrap">
            <div className="section-title">
              <div>
                <Eyebrow>FROM SIGNAL TO ACTION</Eyebrow>
                <h2>Dust control with<br />the full picture.</h2>
              </div>
              <p>A shared workspace for site managers, operators and environmental teams.</p>
            </div>
            <div className="workflow-cards">
              {[
                ['01', 'Sense', 'Air, wind, soil and site activity', Radio],
                ['02', 'Map', 'Five configurable operational zones', MapPin],
                ['03', 'Predict', 'Explainable dust-risk signals', Sparkles],
                ['04', 'Act', 'Recommendations and approved controls', Zap],
                ['05', 'Optimize', 'Before/after and resource records', BarChart3]
              ].map(([n, t, d, Icon]) => (
                <article key={t}>
                  <span>{n}</span>
                  <i><Icon size={20} /></i>
                  <b>{t}</b>
                  <p>{d}</p>
                  <small>{t === 'Sense' ? 'PHYSICAL + SIMULATION' : t === 'Predict' ? 'RULE-BASED · ILLUSTRATIVE' : 'SITE CONTEXT'}</small>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-wrap contact-section" id="contact">
          <div>
            <Eyebrow>LET’S TALK ABOUT YOUR SITE</Eyebrow>
            <h2>See what AEROVA<br />could do for your team.</h2>
            <p>Tell us a little about your project and we’ll follow up with a walkthrough.</p>
            <span className="contact-check"><CheckCircle2 size={18} /> Site-specific walkthrough</span>
          </div>
          <form className="demo-form" onSubmit={async e => {
            e.preventDefault();
            setSending(true);
            setFormError('');
            const fd = new FormData(e.currentTarget);
            const body = {
              name: fd.get('name'),
              company: fd.get('company'),
              email: fd.get('email'),
              phone: fd.get('phone'),
              project_type: fd.get('project_type'),
              location: fd.get('location'),
              message: fd.get('message'),
              consented: fd.get('consented') === 'on'
            };
            try {
              const res = await fetch(`${API}/api/v1/demo-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.detail || 'Unable to submit the request');
              setSent(true);
            } catch (err) {
              setFormError(err.message === 'Failed to fetch' ? 'AEROVA API is offline.' : err.message);
            } finally {
              setSending(false);
            }
          }}>
            {sent ? (
              <div className="success">
                <CheckCircle2 size={32} />
                <h3>Thanks for reaching out.</h3>
                <p>Your demo request has been recorded.</p>
              </div>
            ) : (
              <>
                <div className="form-grid">
                  {[
                    ['Your name', 'text', 'name'],
                    ['Company', 'text', 'company'],
                    ['Work email', 'email', 'email'],
                    ['Phone', 'tel', 'phone']
                  ].map(([l, t, n]) => (
                    <label key={l}>
                      {l}
                      <input required={l !== 'Phone'} name={n} type={t} placeholder={l === 'Work email' ? 'you@company.com' : l} />
                    </label>
                  ))}
                  <label>
                    Project type
                    <select required name="project_type" defaultValue="">
                      <option value="" disabled>Select a project type</option>
                      {['Infrastructure', 'Residential', 'Commercial', 'Road construction', 'Industrial'].map(x => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    City / state
                    <input name="location" placeholder="Pune, Maharashtra" />
                  </label>
                  <label className="wide">
                    What would you like to improve?
                    <textarea name="message" rows={3} placeholder="Tell us about your site or goals" />
                  </label>
                </div>
                <label className="consent">
                  <input type="checkbox" name="consented" required /> I agree to be contacted about AEROVA and accept the privacy notice.
                </label>
                {formError && <div className="form-error"><AlertTriangle size={15} />{formError}</div>}
                <Button variant="primary" type="submit" disabled={sending}>
                  {sending ? 'Sending…' : 'Request a demo'} <ArrowRight size={15} />
                </Button>
              </>
            )}
          </form>
        </section>
      </main>

      <footer className="public-footer">
        <Brand onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        <span>Site-specific dust intelligence</span>
        <small>© 2026 AEROVA · PERSISTED & VERIFIED OPERATION</small>
      </footer>
    </div>
  );
}

function SiteIllustration({ compact = false, style = 'Satellite', layers = { zones: true, sensors: true, hotspots: true, wind: true, forecast: false }, coordinates }) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  const mapboxRef = useRef(null);
  const nodeRef = useRef(null);
  const useMapbox = Boolean(token && coordinates?.latitude != null && coordinates?.longitude != null);

  useEffect(() => {
    let map;
    let cancelled = false;
    if (!useMapbox || !nodeRef.current) return () => {};
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      if (cancelled || !nodeRef.current) return;
      mapboxgl.accessToken = token;
      map = new mapboxgl.Map({
        container: nodeRef.current,
        style: style === 'Street' ? 'mapbox://styles/mapbox/streets-v12' : 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [coordinates.longitude, coordinates.latitude],
        zoom: 15,
        attributionControl: true
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
      map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      mapboxRef.current = map;
    });
    return () => {
      cancelled = true;
      map?.remove();
      mapboxRef.current = null;
    };
  }, [token, style, useMapbox, coordinates?.longitude, coordinates?.latitude]);

  return (
    <div className={`site-illustration ${compact ? 'illustration-compact' : ''}`}>
      {useMapbox ? (
        <div ref={nodeRef} className="mapbox-host" />
      ) : (
        <>
          <img src="/site_aerial.jpg" alt="Illustrative construction site layout" />
          <div className="illustration-wash" />
          <svg viewBox="0 0 1000 660" className="site-vectors">
            <path className="boundary" d="M140 135L790 95L856 495L230 572Z" />
            {layers.zones !== false && (
              <>
                <path className="poly high" d="M260 180L470 163L488 345L274 366Z" />
                <path className="poly rising" d="M507 160L715 142L749 311L526 333Z" />
                <path className="poly clear" d="M280 390L489 374L513 519L299 539Z" />
                <path className="poly clear" d="M542 374L778 348L810 478L566 503Z" />
                <path className="poly unknown" d="M146 229L224 218L242 407L165 420Z" />
              </>
            )}
            {layers.wind && (
              <g className="wind-line">
                <path d="M650 550Q555 445 390 276" />
                <path d="M390 276l21 4-13 16" />
              </g>
            )}
            {layers.forecast && (
              <ellipse className="forecast" cx="400" cy="286" rx="270" ry="100" transform="rotate(-31 400 286)" />
            )}
            {layers.hotspots && <circle className="hotspot" cx="360" cy="260" r="25" />}
            {layers.sensors && (
              <g className="sensor-dots">
                <circle cx="350" cy="252" r="9" />
                <circle cx="575" cy="246" r="9" />
                <circle cx="382" cy="432" r="9" />
                <circle cx="675" cy="422" r="9" />
              </g>
            )}
          </svg>
          <span className="map-zone-name mz-1">Z1 · EXCAVATION</span>
          <span className="map-zone-name mz-2">Z2 · HAUL ROAD</span>
          <span className="map-zone-name mz-3">Z3 · MONITORING</span>
          <span className="map-north">N<br />↑</span>
          <div className="map-scale">0 ━━━━ 100 m</div>
          {!compact && <div className="map-illustrative-note">Simplified site visualization · not georeferenced</div>}
        </>
      )}
      {compact && (
        <div className="map-mini-legend">
          <span><i />Measured risk</span>
          <span><i />Predicted</span>
          <span><i />No fresh data</span>
        </div>
      )}
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
                <input required name="full_name" placeholder="Alex Morgan" autoComplete="name" />
              </label>
            )}
            <label>Work email
              <input required type="email" name="email" placeholder="you@company.com" autoComplete="email" />
            </label>
            {signup && (
              <label>Company name
                <input required name="company_name" placeholder="Your organization" />
              </label>
            )}
            <label>Password
              <input required minLength={10} type="password" name="password" placeholder="At least 10 characters" autoComplete={signup ? 'new-password' : 'current-password'} />
            </label>
            {signup && (
              <>
                <label>Role / designation
                  <input required name="designation" placeholder="Project manager" />
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
          'Start with five configurable zones, then edit to reflect your site.',
          'Provision hardware and assign site roles.',
          'Customer-configured thresholds are not official AQI values.',
          'Review setup items before launching.'
        ][step]}</p>

        {step === 0 && (
          <div className="form-grid">
            <label>Organization<input value={data.company_name || ''} onChange={e => setData({ ...data, company_name: e.target.value })} placeholder="ABC Constructions" /></label>
            <label>Industry<select value={data.industry || ''} onChange={e => setData({ ...data, industry: e.target.value })}><option value="">Select</option>{['Infrastructure', 'Real estate', 'Roads', 'Industrial', 'Other'].map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Organization type<select value={data.organization_type || ''} onChange={e => setData({ ...data, organization_type: e.target.value })}><option value="">Select</option>{['Contractor', 'Developer', 'Project owner', 'Consultant'].map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Operating location<input value={data.operating_location || ''} onChange={e => setData({ ...data, operating_location: e.target.value })} placeholder="City, state" /></label>
          </div>
        )}

        {step === 1 && (
          <div className="form-grid">
            <label>Project name<input value={data.name || ''} onChange={e => setData({ ...data, name: e.target.value })} placeholder="Northfield Redevelopment" /></label>
            <label>Project ID<input value={data.code || ''} onChange={e => setData({ ...data, code: e.target.value })} placeholder="NF-04" /></label>
            <label className="wide">Site address<input value={data.address || ''} onChange={e => setData({ ...data, address: e.target.value })} placeholder="Street, city, state" /></label>
            <label>Project type<select value={data.project_type || ''} onChange={e => setData({ ...data, project_type: e.target.value })}><option value="">Select</option>{['Residential', 'Commercial', 'Road', 'Industrial', 'Infrastructure', 'Other'].map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Site area · m²<input type="number" value={data.area || ''} onChange={e => setData({ ...data, area: e.target.value })} placeholder="25000" /></label>
            <label>Latitude<input type="number" min="-90" max="90" step="any" value={data.latitude || ''} onChange={e => setData({ ...data, latitude: e.target.value })} placeholder="18.5204" /></label>
            <label>Longitude<input type="number" min="-180" max="180" step="any" value={data.longitude || ''} onChange={e => setData({ ...data, longitude: e.target.value })} placeholder="73.8567" /></label>
            <label>Start date<input type="date" value={data.start_date || ''} onChange={e => setData({ ...data, start_date: e.target.value })} /></label>
            <label>Expected completion<input type="date" value={data.completion_date || ''} onChange={e => setData({ ...data, completion_date: e.target.value })} /></label>
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
          <div className="form-grid">
            <label>Basemap<select value={data.basemap || 'satellite'} onChange={e => setData({ ...data, basemap: e.target.value })}><option value="satellite">Satellite</option><option value="streets">Street</option></select></label>
            <label>Overlay opacity<input type="range" min="0" max="100" value={data.overlay_opacity ?? 65} onChange={e => setData({ ...data, overlay_opacity: Number(e.target.value) })} /></label>
          </div>
        )}

        {step === 4 && (
          <div className="setup-zones">
            {ZONES.map((z, i) => (
              <div key={z.id}>
                <b>{z.id}</b>
                <span>{z.name}<small>{z.type}</small></span>
                <input value={data[`activity_${i}`] ?? ['Excavation', 'Vehicle movement', 'General construction', 'Wind monitoring', 'Exposure context'][i]} onChange={e => setData({ ...data, [`activity_${i}`]: e.target.value })} aria-label={`Activity for ${z.id}`} />
              </div>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="form-grid">
            <label>Invite teammate email<input type="email" value={data.team_email || ''} onChange={e => setData({ ...data, team_email: e.target.value })} placeholder="teammate@company.com" /></label>
            <label>Site role<select value={data.team_role || 'SITE_MANAGER'} onChange={e => setData({ ...data, team_role: e.target.value })}><option value="SITE_MANAGER">Site Manager</option><option value="WATER_DRIVER">Water Driver</option></select></label>
          </div>
        )}

        {step === 6 && (
          <div className="form-grid">
            {[['PM2.5 warning', 'pm25_warning', 35], ['PM2.5 critical', 'pm25_critical', 55], ['PM10 warning', 'pm10_warning', 100], ['PM10 critical', 'pm10_critical', 150]].map(([label, key, val]) => (
              <label key={key}>{label} · µg/m³<input type="number" value={data[key] ?? val} onChange={e => setData({ ...data, [key]: Number(e.target.value) })} /></label>
            ))}
          </div>
        )}

        {step === 7 && (
          <div className="readiness">
            {[['Site location', data.latitude && data.longitude ? 'Coordinates set' : 'Needs confirmation'], ['Zones', '5 starter zones configured'], ['Thresholds', 'Customer configured']].map(([a, b], i) => (
              <div key={a}>
                <span className={i === 1 ? 'ready' : 'pending'}>{i === 1 ? <Check size={14} /> : <AlertTriangle size={14} />}</span>
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
  const [demo, setDemo] = useState(false);
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState('');
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
  const [tick, setTick] = useState(0);
  const [overview, setOverview] = useState(null);
  const [siteZones, setSiteZones] = useState([]);
  const [siteDevices, setSiteDevices] = useState([]);
  const [siteConfigId, setSiteConfigId] = useState('');
  const [workspaceError, setWorkspaceError] = useState('');
  const [selectedZone, setSelectedZone] = useState(null);
  const [onboardStep, setOnboardStep] = useState(0);
  const [form, setForm] = useState({});
  const [mapStyle, setMapStyle] = useState('Satellite');
  const [customerProject, setCustomerProject] = useState(false);
  const [layers, setLayers] = useState({ zones: true, sensors: true, hotspots: true, wind: true, forecast: false });
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
    if (!token || !site?.id || route !== 'app' || demo || user?.role === 'WATER_DRIVER') {
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
  }, [token, site?.id, route, demo, user?.role]);

  const activeSiteZones = siteConfigId === site?.id ? siteZones : EMPTY_LIST;
  const activeSiteDevices = siteConfigId === site?.id ? siteDevices : EMPTY_LIST;
  const currentOverview = overview?.site_id === site?.id ? overview : null;
  const dashboardZones = useMemo(() => {
    if (demo) return ZONES;
    return activeSiteZones.filter(zone => zone.enabled).map(zone => {
      const current = currentOverview?.zones?.find(item => item.id === zone.id);
      return {
        id: zone.id,
        code: zone.code,
        name: zone.name,
        type: zone.zone_type,
        risk: current?.risk?.level?.toLowerCase() || 'unknown',
        pm10: current?.latest?.metrics?.pm10_ug_m3 ?? null,
        pm25: current?.latest?.metrics?.pm25_ug_m3 ?? null,
        lastUpdated: current?.latest?.received_at_utc ?? null,
        devices: activeSiteDevices.filter(device => device.zone_id === zone.id).length
      };
    });
  }, [demo, activeSiteZones, activeSiteDevices, currentOverview]);
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
    if (!demo) return;
    const id = setInterval(() => setTick(n => n + 1), 2500);
    return () => clearInterval(id);
  }, [demo]);

  useEffect(() => {
    if (!token || !site?.id || route !== 'app' || demo) return;
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
        value: a.details?.value ?? 'No value',
        status: a.status,
        source: a.source_type || 'SYSTEM'
      }))))
      .catch(error => setWorkspaceError(error.message || 'Unable to load site alerts'));
  }, [token, site?.id, route, demo]);

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
    setDemo(false);
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
        createdSite = existingSites.find(item => item.organization_id === user.organization_id && item.code === form.code);
        if (!createdSite) {
          createdSite = await request('/sites', 'POST', {
            organization_id: user.organization_id,
            name: form.name,
            code: form.code,
            address: form.address || null,
            project_type: form.project_type || null,
            area: form.area ? Number(form.area) : null,
            start_date: form.start_date || null,
            completion_date: form.completion_date || null,
            latitude: form.latitude ? Number(form.latitude) : null,
            longitude: form.longitude ? Number(form.longitude) : null
          });
        }
        setForm(current => ({ ...current, created_site_id: createdSite.id }));
      }

      const thresholds = {
        pm25_warning: Number(form.pm25_warning ?? 35),
        pm25_critical: Number(form.pm25_critical ?? 55),
        pm10_warning: Number(form.pm10_warning ?? 100),
        pm10_critical: Number(form.pm10_critical ?? 150),
        source: 'CUSTOMER_CONFIGURED'
      };
      await request(`/sites/${createdSite.id}`, 'PATCH', { thresholds });
      await request(`/sites/${createdSite.id}/map`, 'PUT', { basemap: form.basemap || 'satellite' });

      const configuredZones = await request(`/sites/${createdSite.id}/zones`, 'GET');
      for (let index = 0; index < configuredZones.length; index++) {
        const activity = form[`activity_${index}`];
        if (activity) {
          await request(`/zones/${configuredZones[index].id}`, 'PATCH', {
            configuration: { ...(configuredZones[index].configuration || {}), activity }
          });
        }
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
    if (demo) {
      setNotice('Demo export is illustrative. Connect persisted data to generate a production report.');
      return;
    }
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
      link.download = `aerova-report-${site.code || 'export'}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice(`Report downloaded successfully`);
    } catch (error) {
      setNotice(error.message || 'Unable to generate report.');
    }
  }

  async function alertAction(id, action) {
    if (token) {
      try {
        await fetch(`${API}/api/v1/alerts/${id}/${action}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: '{}'
        });
      } catch {
        setNotice('Alert state could not be updated.');
        return;
      }
    }
    setAlerts(rows => rows.map(a => a.id === id ? { ...a, status: action === 'resolve' ? 'RESOLVED' : 'ACKNOWLEDGED' } : a));
    setNotice(`Alert ${action === 'resolve' ? 'resolved' : 'acknowledged'}`);
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
  if (route === 'public') return <PublicSite go={x => { if (x === 'demo') { setDemo(true); setAlerts(SAMPLE_ALERTS); go('app'); } else go(x); }} />;
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
              <b>{user?.full_name || 'Site Lead'}</b>
              <small>{user?.role?.replaceAll('_', ' ') || 'Site Manager'}</small>
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
            <span>{user?.company_name || 'Northfield'}</span>
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

        {demo && (
          <div className="demo-ribbon">
            <Sparkles size={16} />
            <b>ILLUSTRATIVE SIMULATION MODE</b>
            <span>Example values for evaluation · Persisted live sensors separated</span>
            <button onClick={() => { setDemo(false); setAlerts([]); setCustomerProject(false); go('public'); }}>
              Exit demo <X size={14} />
            </button>
          </div>
        )}

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
              demo={demo}
              tick={tick}
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
              demo={demo}
              selected={selectedDashboardZone}
              setSelected={setSelectedZone}
              style={mapStyle}
              setStyle={setMapStyle}
              layers={layers}
              setLayers={setLayers}
              zones={dashboardZones}
              site={site}
              source={currentOverview?.source || 'NO DATA'}
            />
          )}

          {active === 'monitoring' && (
            <Monitoring
              demo={demo}
              token={token}
              site={site}
              range={range}
              setRange={setRange}
              sourceFilter={sourceFilter}
              zoneFilter={zoneFilter}
              deviceFilter={deviceFilter}
              zones={dashboardZones}
              onIntervention={() => setDialog('intervention')}
            />
          )}

          {active === 'interventions' && (
            <Interventions
              demo={demo}
              token={token}
              site={site}
              create={() => setDialog('intervention')}
            />
          )}

          {active === 'resources' && (
            <Resources
              demo={demo}
              token={token}
              site={site}
              user={user}
              vendor={() => setDialog('vendor')}
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
              demo={demo}
              token={token}
              saveDevice={saveDevice}
              add={() => setOnboardStep(1)}
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
          demo={demo}
          site={site}
          sites={sites}
          onSelectSite={selectSite}
          zones={dashboardZones}
          token={token}
          user={user}
          notify={setNotice}
        />
      )}
    </div>
  );
}

function Overview({
  live, demo, tick, range, setRange, sourceFilter, setSourceFilter,
  zoneFilter, setZoneFilter, deviceFilter, setDeviceFilter, zones, devices, alerts, setActive, setSelected, intervention
}) {
  const availableDevices = demo ? [
    { device_uid: 'PMS5003-01', name: 'PMS5003 · Excavation' },
    { device_uid: 'PMS5003-02', name: 'PMS5003 · Haul road' },
    { device_uid: 'DHT22-01', name: 'DHT22 · Weather' }
  ] : devices;
  const filteredZones = useMemo(() => {
    if (!zoneFilter) return zones;
    return zones.filter(z => z.id === zoneFilter);
  }, [zones, zoneFilter]);

  const series = useMemo(() => {
    if (demo) {
      return SAMPLE_TREND.map((x, i) => {
        const factor = zoneFilter === 'Z1' ? 1.4 : zoneFilter === 'Z2' ? 1.1 : 0.8;
        return {
          ...x,
          pm10: Math.round((x.pm10 + Math.sin(tick / 4 + i) * 8) * factor),
          pm25: Math.round((x.pm25 + Math.cos(tick / 4 + i) * 3) * factor)
        };
      });
    }
    return live?.series || [];
  }, [demo, tick, zoneFilter, live?.series]);

  const k = live?.kpis || {};
  const vals = demo ? {
    pm25: zoneFilter === 'Z1' ? 42 : 29 + Math.round(Math.sin(tick / 4) * 4),
    pm10: zoneFilter === 'Z1' ? 142 : 86 + Math.round(Math.sin(tick / 3) * 9),
    risk: zoneFilter === 'Z1' ? 'HIGH' : 'MODERATE',
    alerts: 3
  } : k;

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
              {zones.map(z => <option key={z.id} value={z.id}>{z.code || z.id} · {z.name}</option>)}
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
          <Tag type={demo ? 'SIMULATION' : live ? (live.source || 'PHYSICAL') : 'NO DATA'} />
        </div>
      </div>

      <div className="kpi-grid">
        {[
          ['PM2.5', demo ? vals.pm25 : k.pm25, 'µg/m³', Wind, 'teal'],
          ['PM10', demo ? vals.pm10 : k.pm10, 'µg/m³', Cloud, 'coral'],
          ['Site dust risk', demo ? vals.risk : k.risk_level, '', Gauge, 'amber'],
          ['Active alerts', demo ? '03' : k.active_alerts, '', Bell, 'rose']
        ].map(([name, val, unit, Icon, color]) => (
          <article className="kpi-card" key={name}>
            <div>
              <span>{name}</span>
              <i className={`kpi-icon icon-${color}`}><Icon size={18} /></i>
            </div>
            <b>{val ?? 'No data'}<small>{unit}</small></b>
            <footer>
              <Tag type={demo ? 'SIMULATION' : live ? 'PHYSICAL' : 'NO DATA'} />
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
                <i className={`zone-dot dot-${demo ? z.risk : 'unknown'}`} />
                <span>
                  <b>{z.name}</b>
                  <small>{z.id} · {z.devices ? `${z.devices} devices assigned` : 'No device assigned'}</small>
                </span>
                <strong>{demo ? (z.pm10 ?? '—') : '—'}<small>{demo ? 'µg/m³' : ''}</small></strong>
                <Risk value={demo ? z.risk : 'unknown'} />
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
                <b>{demo ? '42%' : 'No data'}</b>
              </span>
              <i><b style={{ width: demo ? '42%' : '0%' }} /></i>
            </div>
            <div>
              <Activity size={22} />
              <span>
                <small>Connected sensors</small>
                <b>{demo ? '2 connected' : 'Awaiting data'}</b>
              </span>
              <Tag type={demo ? 'SIMULATION' : 'NO DATA'} />
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

function MapPage({ demo, selected, setSelected, style, setStyle, layers, setLayers, zones, site, source }) {
  const activeZone = selected || (demo ? ZONES[0] : null);
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
            <i className={`zone-dot dot-${demo ? z.risk : 'unknown'}`} />
            <span>
              <b>{z.code || z.id} · {z.name}</b>
              <small>{z.type}</small>
            </span>
            <ChevronRight size={15} />
          </button>
        ))}
        {!zones.length && <p className="role-muted">No zones configured for this site.</p>}

        <div className="map-layers">
          <b>Visible layers</b>
          {[
            ['zones', 'Zone boundaries'],
            ['sensors', 'Device markers'],
            ['hotspots', 'Measured hotspots'],
            ['wind', 'Wind direction'],
            ['forecast', 'Predicted plume'],
            ['equipment', 'Equipment & tankers']
          ].map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={layers[key] !== false}
                onChange={e => setLayers({ ...layers, [key]: e.target.checked })}
              />
              {label}
              {key === 'forecast' && <small>Prediction</small>}
            </label>
          ))}
        </div>
      </aside>

      <section className="map-column">
        <div className="map-controls">
          <div>
            <button className={style === 'Satellite' ? 'selected' : ''} onClick={() => setStyle('Satellite')}>Satellite</button>
            <button className={style === 'Street' ? 'selected' : ''} onClick={() => setStyle('Street')}>Street</button>
          </div>
          <span><MapPin size={15} /> {demo ? 'Illustrative site · Pune, Maharashtra' : site?.address || 'Site coordinates not configured'}</span>
          <Tag type={demo ? 'SIMULATION' : source} />
        </div>

        <SiteIllustration
          layers={layers}
          style={style}
          coordinates={site ? { latitude: site.latitude, longitude: site.longitude } : null}
        />

        {activeZone ? <div className="zone-drawer">
          <div className="zone-drawer-title">
            <span className={`zone-dot dot-${demo ? activeZone.risk : 'unknown'}`} />
            <span>
              <small>{activeZone.code || activeZone.id} · {activeZone.type}</small>
              <b>{activeZone.name}</b>
            </span>
            <Risk value={activeZone.risk} />
          </div>
          <p>{demo ? 'Illustrative site activity · readings are not field measurements.' : activeZone.lastUpdated ? `Last reading: ${new Date(activeZone.lastUpdated).toLocaleString()}` : 'No recent readings assigned to this zone.'}</p>
          <div className="zone-readings">
            {[
              ['PM10 concentration', demo ? `${activeZone.pm10} µg/m³` : activeZone.pm10 == null ? 'No data' : `${activeZone.pm10} µg/m³`],
              ['PM2.5 concentration', demo ? '29 µg/m³' : activeZone.pm25 == null ? 'No data' : `${activeZone.pm25} µg/m³`],
              ['Assigned devices', `${activeZone.devices} devices`],
              ['Freshness', demo ? 'Just now' : activeZone.lastUpdated ? new Date(activeZone.lastUpdated).toLocaleString() : 'No fresh reading']
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

function Monitoring({ demo, token, site, range, setRange, sourceFilter, zoneFilter, deviceFilter, zones, onIntervention }) {
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
    if (demo || !token || !site?.id) return;

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
  }, [demo, token, site?.id, range, sourceFilter, zoneFilter, deviceFilter, requestKey]);

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

  const demoValues = {
    PM10: '86',
    'PM2.5': '29',
    Temperature: '28.4',
    Humidity: '61',
    'Wind speed': '12',
    'Wind direction': '225',
    'Soil moisture': '31',
    Activity: 'Vehicle movement',
    'Worker presence': 'Active',
    'Tank level': '42',
    'Water flow': '0.0',
    'Vehicle movement': 'Elevated',
    'Equipment state': 'Sprinkler idle',
    'Rain detection': 'No rain'
  };
  const sensorRows = sensorDefinitions.map(sensor => {
    if (demo) {
      const value = demoValues[sensor.name];
      return { ...sensor, value: value ?? null, source: value === undefined ? 'NO DATA' : 'SIMULATION', updated: value === undefined ? null : 'Illustrative' };
    }
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
                <span>{s.category}{s.updated ? ` · ${s.updated === 'Illustrative' ? 'Illustrative' : new Date(s.updated).toLocaleString()}` : ''}</span>
                <Tag type={s.source} />
              </footer>
            </article>
          ))}
          </div>
        </>
      )}

      {subtab === 'trends' && (
        <Panel title="Historical dust concentration" kicker="TREND ANALYSIS">
          {(demo ? SAMPLE_TREND : trend).length ? (
            <div className="chart big-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={demo ? SAMPLE_TREND : trend}>
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
              <small>{demo ? 'ILLUSTRATIVE FORECAST' : 'CURRENT RULE-BASED RISK'}</small>
              <h2>{demo ? 'Moderate site dust risk' : activeRiskData?.level ? `${activeRiskData.level} site risk` : 'Risk unavailable'}</h2>
              <p>{demo ? 'Potential dust rise near Z2 as vehicle movement continues under dry ground conditions.' : 'Forecasting is unavailable; this assessment reflects configured rules and recent readings only.'}</p>
              <Tag type={demo ? 'PREDICTED' : activeRiskData?.level ? 'DERIVED' : 'NO DATA'} />
            </div>
            <strong>{demo ? '58' : activeRiskData?.overall ?? '—'}<small>Risk score</small></strong>
          </div>

          <div className="split-panels">
            <Panel title={demo ? 'Predicted risk by zone' : 'Current risk by zone'} kicker={demo ? 'SIMULATION' : 'DERIVED FROM TELEMETRY'}>
              {(demo ? ZONES : activeRiskData?.zones || []).map((z, i) => {
                const level = z.level || z.risk?.level || z.risk || 'UNKNOWN';
                const score = z.score ?? z.risk?.score;
                return (
                <div className="risk-meter-row" key={z.id || z.zone_id}>
                  <b>{z.code || z.zone_code || z.id}</b>
                  <span>{z.name || z.zone_name}</span>
                  <i><b style={{ width: `${demo ? [78, 61, 32, 24, 0][i] : score ?? 0}%` }} /></i>
                  <Risk value={level} />
                </div>
                );
              })}
              {!demo && !activeRiskData?.zones?.length && <p className="role-muted">No risk assessment is available for this site.</p>}
            </Panel>

            <Panel title="Risk explanation factors" kicker="TRANSPARENT REASONING">
              <div className="factor-list">
                {(demo ? [
                  ['Vehicle movement', 'Elevated in Zone Z2', Command],
                  ['Surface dryness', 'Contributing factor (31% moisture)', Wind],
                  ['Wind heading', 'SW (225°) toward boundary', Compass],
                  ['Rainfall factor', 'No rain detected in last 24h', Cloud]
                ] : (activeRiskData?.zones || []).flatMap(zone => (zone.reasons || []).map(reason => [zone.zone_name, reason, Activity]).slice(0, 4))
                ).slice(0, 4).map(([a, b, Icon]) => (
                  <div key={a}>
                    <Icon size={16} />
                    <span>
                      <b>{a}</b>
                      <small>{b}</small>
                    </span>
                  </div>
                ))}
              </div>
              {demo && <Button variant="primary" onClick={onIntervention}>Review recommended intervention <ArrowRight size={15} /></Button>}
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
              {demo ? [
                ['PMS5003-01', 'PM Particulate', 'Z1 · Excavation', 'Just now', 'Nominal (< 2%)', 'SIMULATION'],
                ['PMS5003-02', 'PM Particulate', 'Z2 · Haul road', 'Just now', 'Nominal (< 2%)', 'SIMULATION'],
                ['DHT22-01', 'Temp / Humidity', 'Z3 · Monitoring', 'Just now', 'Nominal', 'SIMULATION']
              ].map(r => (
                <tr key={r[0]}>
                  <td><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td>{r[4]}</td><td><Tag type={r[5]} /></td>
                </tr>
              )) : activeDevices.map(device => (
                <tr key={device.id}>
                  <td><b>{device.device_uid}</b></td>
                  <td>{device.device_type}</td>
                  <td>{zones.find(zone => zone.id === device.zone_id)?.name || 'Unassigned'}</td>
                  <td>{device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : 'No data'}</td>
                  <td>Not recorded</td>
                  <td><Tag type={device.source_type} /></td>
                </tr>
              ))}
              {!demo && !activeDevices.length && <tr><td colSpan={6} className="role-empty">No devices registered for this site.</td></tr>}
            </tbody>
          </table>
        </Panel>
      )}

      {subtab === 'thresholds' && (
        <Panel title="Configured site thresholds" kicker="CUSTOMER CONFIGURATION">
          <div className="thresholds">
            <span>PM2.5 warning: <b>{demo ? 35 : site?.thresholds?.pm25_warning ?? 'Not configured'} µg/m³</b></span>
            <span>PM2.5 critical: <b>{demo ? 55 : site?.thresholds?.pm25_critical ?? 'Not configured'} µg/m³</b></span>
            <span>PM10 warning: <b>{demo ? 100 : site?.thresholds?.pm10_warning ?? 'Not configured'} µg/m³</b></span>
            <span>PM10 critical: <b>{demo ? 150 : site?.thresholds?.pm10_critical ?? 'Not configured'} µg/m³</b></span>
            <small>Customer thresholds for proactive response · not regulatory legal limits</small>
          </div>
        </Panel>
      )}
    </>
  );
}

function Interventions({ demo, token, site, create }) {
  const [subtab, setSubtab] = useState('recommendations');
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!token || !site?.id || demo) return;
    fetch(`${API}/api/v1/sites/${site.id}/interventions`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : [])
      .then(setItems)
      .catch(() => setItems([]));
  }, [token, site?.id, demo]);

  return (
    <>
      <div className="subtabs">
        <button className={subtab === 'recommendations' ? 'on' : ''} onClick={() => setSubtab('recommendations')}>Recommendations</button>
        <button className={subtab === 'workflows' ? 'on' : ''} onClick={() => setSubtab('workflows')}>Active workflows</button>
        <button className={subtab === 'history' ? 'on' : ''} onClick={() => setSubtab('history')}>Execution history</button>
        <span />
        <Button variant="primary" onClick={create}><Plus size={15} /> Create intervention</Button>
      </div>

      {subtab === 'recommendations' && (
        <Panel title="Targeted haul road dust control" kicker="RECOMMENDED ACTION" action={<Risk value={demo ? 'rising' : 'unknown'} />}>
          <div className="recommendation">
            <div>
              <small>AFFECTED ZONE</small>
              <b>Z2 · Haul road</b>
              <p>Likely source: Vehicle movement on dry surface</p>
            </div>
            <div>
              <small>WHY THIS IS SUGGESTED</small>
              <p>{demo ? 'PM10 elevation detected alongside vehicle activity and surface dryness. Confirm surface condition before suppression.' : 'Recommendations require fresh telemetry and activity context.'}</p>
            </div>
            <div>
              <small>RECOMMENDED SUPPRESSION</small>
              <b>Targeted tanker spraying</b>
              <p>Dispatch active water driver to Z2</p>
            </div>
          </div>
          <footer className="recommendation-foot">
            <span><Shield size={15} /> High dust alert alone does not trigger automatic spraying. Safety check required.</span>
            <Button onClick={create}>Review & dispatch <ArrowRight size={15} /></Button>
          </footer>
        </Panel>
      )}

      {subtab === 'workflows' && (
        <Panel title="Active intervention workflows" kicker="LIFECYCLE TRACKING">
          <div className="lifecycle">
            {['Draft', 'Pending approval', 'Approved', 'Task offered', 'In progress', 'Completed'].map((x, i) => (
              <span className={i === 2 ? 'current' : ''} key={x}><i>{i + 1}</i>{x}</span>
            ))}
          </div>
          <p className="plain-note">Dashboard commands require local hardware acknowledgement and safety interlocks.</p>
        </Panel>
      )}

      {subtab === 'history' && (
        <Panel title="Intervention history & verification" kicker="COMPLIANCE EVIDENCE">
          {items.length ? (
            <div className="intervention-list">
              {items.map(it => (
                <div key={it.id} className="intervention-card">
                  <div>
                    <b>{it.intervention_type}</b>
                    <p>{it.rationale}</p>
                    <small>Status: {it.status} · Source: {it.source_type}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon={Zap} title="No past interventions recorded" body="Interventions executed on site appear here with outcome verification." />
          )}
        </Panel>
      )}
    </>
  );
}

function Resources({ demo, token, site, user, vendor }) {
  const [subtab, setSubtab] = useState('water');

  return (
    <>
      <div className="subtabs">
        <button className={subtab === 'water' ? 'on' : ''} onClick={() => setSubtab('water')}>Water & Tanker Operations</button>
        <button className={subtab === 'workforce' ? 'on' : ''} onClick={() => setSubtab('workforce')}>Workforce & Equipment</button>
        <button className={subtab === 'replenish' ? 'on' : ''} onClick={() => setSubtab('replenish')}>Water Replenishment</button>
      </div>

      {subtab === 'water' && (
        <>
          <div className="resource-grid">
            <article className="panel">
              <div>
                <Droplets size={18} />
                <small>TANK WATER LEVEL</small>
                <Tag type={demo ? 'SIMULATION' : 'NO DATA'} />
              </div>
              <strong>{demo ? '42%' : 'No data'}</strong>
              <p>{demo ? 'Tank 1 · Ultrasonic sensor' : 'No fresh transmitter reading'}</p>
            </article>

            <article className="panel">
              <div>
                <Activity size={18} />
                <small>WATER FLOW RATE</small>
                <Tag type={demo ? 'SIMULATION' : 'NO DATA'} />
              </div>
              <strong>{demo ? '0.0 L/min' : 'No data'}</strong>
              <p>{demo ? 'Pulse flow meter · simulated, not verified' : 'No fresh flow reading'}</p>
            </article>

            <article className="panel">
              <div>
                <Leaf size={18} />
                <small>RESOURCE EFFICIENCY</small>
                <Tag type="DERIVED" />
              </div>
              <strong>{demo ? '18 L/m²' : '—'}</strong>
              <p>Water applied vs dust suppression outcome</p>
            </article>
          </div>

          <SiteWaterOperations token={token} site={site} user={user || { role: 'SITE_MANAGER' }} />
        </>
      )}

      {subtab === 'workforce' && (
        <>
          <div className="privacy-banner">
            <Shield size={18} />
            <span>
              <b>Source-aware workforce & equipment view</b>
              <small>Presence events do not establish worker identity, precise GPS or individual exposure.</small>
            </span>
          </div>

          <div className="workforce-cards">
            {[
              ['Workers present', demo ? '1' : '0', 'Zone access sensors', HardHat],
              ['Vehicles active', demo ? '1' : '0', 'Haul road speed detector', Command],
              ['Machinery', '0 registered', 'Heavy machinery telematics', Settings2],
              ['Sprinklers', demo ? '1 connected' : 'No equipment', 'Actuator relay state', Activity]
            ].map(([a, b, c, Icon]) => (
              <article className="panel" key={a}>
                <Icon size={20} />
                <span>{a}</span>
                <b>{b}</b>
                <small>{c}</small>
              </article>
            ))}
          </div>

          <Panel title="Recent presence events" kicker="SITE ACTIVITY">
            {demo ? (
              <div className="activity-row">
                <HardHat size={20} />
                <span>
                  <b>Worker presence event</b>
                  <small>Zone Z1 · SIMULATION · identity protected</small>
                </span>
                <time>Just now</time>
              </div>
            ) : (
              <Empty icon={HardHat} title="No presence events recorded" />
            )}
          </Panel>
        </>
      )}

      {subtab === 'replenish' && (
        <Panel title="Water replenishment & vendor management" kicker="APPROVED VENDORS" action={<Button onClick={vendor}>Manage vendors</Button>}>
          <div className="vendor-flow">
            {['Low tank alert', 'Draft request', 'Approval required', 'Delivery evidence'].map((x, i) => (
              <span key={x}>
                <i>{i + 1}</i>
                <b>{x}</b>
                <small>{['Configured threshold', 'Review volume & type', 'No order before approval', 'Verify source and volume'][i]}</small>
              </span>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}

function Reports({ generate }) {
  const [reportType, setReportType] = useState('DAILY');
  const [range, setRange] = useState('Today');
  const [source, setSource] = useState('PHYSICAL');

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

function Management({ site, zones, devices, demo, saveDevice, add }) {
  const [subtab, setSubtab] = useState('details');
  const [deviceDrafts, setDeviceDrafts] = useState({});
  const connectedCount = devices.filter(device => device.status === 'CONNECTED').length;
  const staleCount = devices.filter(device => device.status === 'OFFLINE' && device.last_seen_at).length;
  const offlineCount = devices.filter(device => device.status === 'NO DATA').length;

  return (
    <>
      <div className="subtabs">
        <button className={subtab === 'details' ? 'on' : ''} onClick={() => setSubtab('details')}>Site details</button>
        <button className={subtab === 'layout' ? 'on' : ''} onClick={() => setSubtab('layout')}>Layout & Map</button>
        <button className={subtab === 'zones' ? 'on' : ''} onClick={() => setSubtab('zones')}>Zones</button>
        <button className={subtab === 'devices' ? 'on' : ''} onClick={() => setSubtab('devices')}>Devices & Sensors</button>
        <button className={subtab === 'schedule' ? 'on' : ''} onClick={() => setSubtab('schedule')}>Schedule</button>
      </div>

      {subtab === 'details' && (
        <Panel title="Project details" kicker="SITE PROFILE">
          <div className="site-details">
            {[
              ['Project name', site?.name || 'Not set'],
              ['Project ID', site?.code || 'Not set'],
              ['Address / Location', site?.address || 'Needs confirmation'],
              ['Project type', site?.project_type || 'Not set'],
              ['Site area', site?.area ? `${site.area} m²` : 'Not set'],
              ['Start date', site?.start_date || 'Not set'],
              ['Completion date', site?.completion_date || 'Not set']
            ].map(([a, b]) => (
              <div key={a}>
                <small>{a}</small>
                <b>{b}</b>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {subtab === 'layout' && (
        <Panel title="Site layout & georeferencing" kicker="SPATIAL ASSETS">
          <div className="layout-empty">
            <MapPin size={32} />
            <b>Site plan asset</b>
            <small>Uploaded site plans are aligned to real coordinates before spatial rendering.</small>
            <Button onClick={add}>Resume site setup</Button>
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
            <span><b>{demo ? 2 : connectedCount}</b> Connected</span>
            <span><b>{demo ? 0 : staleCount}</b> Stale</span>
            <span><b>{demo ? 1 : offlineCount}</b> Offline / no data</span>
            <span>Site Manager can edit zone assignments and metadata. Security credential rotation remains restricted.</span>
          </div>

          <table className="role-table">
            <thead>
              <tr><th>Device UID</th><th>Name</th><th>Type</th><th>Source</th><th>Assigned Zone</th><th>Status</th><th>Last seen</th><th /></tr>
            </thead>
            <tbody>
              {demo ? [
                ['SIM-WOKWI-01', 'ESP32 Main Node', 'ESP32', 'SIMULATION', 'Z1', 'Connected', 'Just now'],
                ['SIM-PMS-02', 'PMS5003 Dust', 'PMS5003', 'SIMULATION', 'Z2', 'Connected', 'Just now'],
                ['PHYS-ESP32-01', 'Physical chamber', 'ESP32', 'PHYSICAL', 'Unassigned', 'Offline', 'No data']
              ].map(d => (
                <tr key={d[0]}>
                  <td><b>{d[0]}</b></td><td>{d[1]}</td><td>{d[2]}</td><td><Tag type={d[3]} /></td><td>{d[4]}</td><td><Risk value={d[5]} /></td><td>{d[6]}</td><td>—</td>
                </tr>
              )) : (
                devices.map(device => {
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
                          {zones.map(zone => <option key={zone.id} value={zone.id}>{zone.code || zone.id} · {zone.name}</option>)}
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
                })
              )}
              {!demo && !devices.length && <tr><td colSpan={8} className="role-empty">No devices registered for this site.</td></tr>}
            </tbody>
          </table>
        </Panel>
      )}

      {subtab === 'schedule' && (
        <Panel title="Site operating hours" kicker="WORKING SCHEDULE">
          <p>Working hours: 07:00 – 18:00 (Asia/Kolkata)</p>
          <p className="role-muted">Alerts outside working hours generate summary notices rather than operational dispatches.</p>
        </Panel>
      )}
    </>
  );
}

function Dialog({ type, close, demo, site, sites, zones, token, user, notify, onSelectSite }) {
  const titles = {
    intervention: 'Create intervention draft',
    device: 'Provision device',
    vendor: 'Approved water vendors',
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
      if (demo) {
        setError('Illustrative demo mode. Connect an authorized site to persist interventions.');
        return;
      }
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
            rationale: fd.get('rationale'),
            payload: { duration_minutes: Number(fd.get('duration') || 15) }
          })
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.detail);
        notify(`Draft intervention created (${body.id.slice(0, 8)})`);
        close();
      } catch (err) {
        setError(err.message === 'Failed to fetch' ? 'API is offline.' : err.message);
      }
      return;
    }

    notify(`${titles[type]} saved.`);
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
              <label>Duration · minutes
                <input name="duration" type="number" min="1" max="120" defaultValue="15" />
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

          {type === 'vendor' && (
            <div className="profile-details-view">
              <p><b>Approved suppliers:</b> Municipal Water Authority, Verified Treated Effluent Vendor</p>
              <p className="role-muted">Potable and recycled water volumes must have quality test certificates.</p>
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
