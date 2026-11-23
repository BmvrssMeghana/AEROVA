import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, ArrowLeft, ArrowRight, Bell, Building2, CheckCircle2,
  ClipboardList, Droplets, FileText, Gauge, LogOut, MapPin, Plus, Radio,
  Search, Users, Waves, Eye, ShieldAlert, Settings2
} from 'lucide-react';
import './RoleDashboards.css';

const API = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');
const headers = token => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

async function request(path, token, options = {}) {
  const r = await fetch(`${API}/api/v1${path}`, {
    ...options,
    headers: { ...headers(token), ...options.headers }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.detail || `Request failed (${r.status})`);
  return data;
}

function UniversalSearchBox({ token, onPick }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);
  const [state, setState] = useState('');

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      setState('');
      return;
    }
    setState('loading');
    const t = setTimeout(() => {
      request(`/search?q=${encodeURIComponent(q.trim())}`, token)
        .then(d => {
          setHits(d.results || []);
          setState((d.results || []).length ? '' : 'empty');
        })
        .catch(() => setState('error'));
    }, 300);
    return () => clearTimeout(t);
  }, [q, token]);

  return (
    <div className="universal-search">
      <label>
        <Search size={16} />
        <input
          value={q}
          placeholder="Search projects, zones, devices, alerts, tasks..."
          onChange={e => setQ(e.target.value)}
        />
        {q && (
          <button type="button" onClick={() => { setQ(''); setHits([]); }}>
            Clear
          </button>
        )}
      </label>
      {q.trim().length >= 2 && (
        <div className="search-results">
          {state === 'loading' && <p>Searching…</p>}
          {state === 'error' && <p>Search failed.</p>}
          {state === 'empty' && <p>No matches found.</p>}
          {hits.map(h => (
            <button
              key={`${h.type}-${h.id}`}
              onClick={() => {
                setQ('');
                setHits([]);
                onPick(h);
              }}
            >
              <b>{h.title}</b>
              <small>{h.type.toUpperCase()} · {h.subtitle}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleShell({
  title, user, nav, active, setActive, onLogout, children, back, token, onResult, alerts, onAlerts
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const activeAlertsCount = (alerts || []).filter(a => a.status === 'ACTIVE').length;

  return (
    <div className="role-shell">
      <aside className="role-sidebar">
        <a className="role-brand" href="#home">
          <span>A</span>AEROVA
        </a>
        {back && (
          <button className="role-back" onClick={back}>
            <ArrowLeft size={15} /> Back
          </button>
        )}
        <div className="role-identity">
          <b>{user.full_name}</b>
          <span>{user.role.replaceAll('_', ' ')}</span>
        </div>
        <nav>
          {nav.map(([key, label, Icon]) => (
            <button
              key={key}
              className={active === key ? 'active' : ''}
              onClick={() => setActive(key)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <button className="role-logout" onClick={onLogout}>
          <LogOut size={16} /> Sign out
        </button>
      </aside>

      <main className="role-main">
        <header className="role-header">
          <b>{title}</b>
          {token && <UniversalSearchBox token={token} onPick={onResult || (() => {})} />}
          <div className="role-header-right">
            {onAlerts && (
              <button className="role-bell" onClick={onAlerts} title="Alert Centre">
                <Bell size={18} />
                {activeAlertsCount > 0 && <i>{activeAlertsCount}</i>}
              </button>
            )}
            <div className="role-user-menu-wrap">
              <button
                className="role-user-chip"
                onClick={() => setProfileOpen(!profileOpen)}
                title={user.full_name}
              >
                {user.full_name?.slice(0, 1) || 'A'}
              </button>
              {profileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-head">
                    <b>{user.full_name}</b>
                    <small>{user.email}</small>
                    <span className="profile-role-tag">{user.role.replaceAll('_', ' ')}</span>
                  </div>
                  <button onClick={() => { setProfileOpen(false); alert(`Account: ${user.email}\nRole: ${user.role}\nOrganization: ${user.company_name || 'N/A'}`); }}>
                    <Settings2 size={15} /> Account details
                  </button>
                  <button className="logout-btn" onClick={() => { setProfileOpen(false); onLogout(); }}>
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="role-content">
          {children}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, icon: Icon, foot }) {
  return (
    <article className="role-stat">
      <span>
        <small>{label}</small>
        <i><Icon size={18} /></i>
      </span>
      <b>{value ?? '—'}</b>
      {foot && <em>{foot}</em>}
    </article>
  );
}

function Table({ columns, rows, empty = 'No records found' }) {
  return (
    <div className="role-table-wrap">
      <table className="role-table">
        <thead>
          <tr>
            {columns.map(x => <th key={x}>{x}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, i) => (
              <tr key={row.id || i}>
                {row.cells.map((c, j) => <td key={j}>{c}</td>)}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="role-empty">{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Status({ children }) {
  return (
    <span className={`role-status status-${String(children).toLowerCase()}`}>
      {String(children || 'UNKNOWN').replaceAll('_', ' ')}
    </span>
  );
}

export function AdminConsole({ token, user, onLogout }) {
  const nav = [
    ['overview', 'Overview', Gauge],
    ['customers', 'Customers', Building2],
    ['projects', 'Projects', ClipboardList],
    ['users', 'People', Users],
    ['health', 'Platform health', Activity]
  ];

  const [active, setActive] = useState('overview');
  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [readOnlyProject, setReadOnlyProject] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      if (active === 'overview') setData(await request('/platform/overview', token));
      else if (active === 'customers') setRows(await request('/platform/customers', token));
      else if (active === 'projects') setRows(await request('/platform/projects', token));
      else if (active === 'users') setRows(await request('/platform/users', token));
      else if (active === 'health') setData(await request('/platform/health', token));
    } catch (e) {
      setError(e.message);
    }
  }, [active, token]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => (
    rows.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
  ), [rows, search]);

  async function changeUserStatus(row, status) {
    const reason = window.prompt(`Reason for setting ${row.name} to ${status.toLowerCase()}:`);
    if (!reason) return;
    try {
      await request(`/platform/users/${row.id}/status`, token, {
        method: 'POST',
        body: JSON.stringify({ status, reason })
      });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function changeCustomerStatus(row, status) {
    const reason = window.prompt(`Reason for setting ${row.name} to ${status.toLowerCase()}:`);
    if (!reason) return;
    try {
      await request(`/platform/customers/${row.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason })
      });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function openReadOnlyProject(row) {
    const reason = window.prompt(
      `Support access reason to view project "${row.name}" in read-only mode (audit logged):`,
      'Administrative diagnostic review'
    );
    if (!reason) return;
    setBusy(true);
    try {
      const proj = await request(`/platform/projects/${row.id}/read-only`, token, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      setReadOnlyProject(proj);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function createCustomer(e) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const result = await request('/platform/customers', token, {
        method: 'POST',
        body: JSON.stringify({
          name: f.get('name'),
          industry: f.get('industry'),
          operating_location: f.get('location'),
          contact_name: f.get('contact_name'),
          contact_email: f.get('contact_email'),
          contact_phone: f.get('contact_phone'),
          status: 'ACTIVE',
          reason: f.get('reason')
        })
      });
      setError(
        result.invitation.development_token
          ? `Customer created. Manager activation link: ${window.location.origin}/?invite=${encodeURIComponent(result.invitation.development_token)}`
          : 'Customer created. Email invitation delivery is not configured.'
      );
      setShowAddCustomer(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const customerRows = filtered.map(r => ({
    id: r.id,
    cells: [
      <b key="name">{r.name}</b>,
      r.contact_name || '—',
      r.contact_email || '—',
      r.created_at?.slice(0, 10),
      r.active_projects,
      r.site_managers,
      r.water_drivers,
      <Status key="status">{r.status}</Status>,
      <div key="actions" className="table-actions">
        <button className="role-link" onClick={() => setViewCustomer(r)}>
          <Eye size={14} /> View
        </button>
        <select
          value={r.status}
          onChange={e => changeCustomerStatus(r, e.target.value)}
        >
          <option>ACTIVE</option>
          <option>INACTIVE</option>
          <option>SUSPENDED</option>
        </select>
      </div>
    ]
  }));

  const projectRows = filtered.map(r => ({
    id: r.id,
    cells: [
      <b key="name">{r.name}</b>,
      r.customer,
      r.location || '—',
      r.site_manager || 'Unassigned',
      <Status key="status">{r.status}</Status>,
      r.created_at?.slice(0, 10),
      <button key="view" className="role-link" onClick={() => openReadOnlyProject(r)}>
        <Eye size={14} /> Read-only view
      </button>
    ]
  }));

  const userRows = filtered.map(r => ({
    id: `${r.id}-${r.customer}`,
    cells: [
      <b key="name">{r.name}</b>,
      r.email,
      r.customer,
      r.role.replaceAll('_', ' '),
      <Status key="status">{r.status}</Status>,
      r.last_login_at ? new Date(r.last_login_at).toLocaleString() : 'Never',
      <select
        key="account"
        value={r.status}
        onChange={e => changeUserStatus(r, e.target.value)}
      >
        <option>ACTIVE</option>
        <option>DISABLED</option>
      </select>
    ]
  }));

  return (
    <RoleShell
      title="AEROVA Admin · Platform Console"
      user={user}
      nav={nav}
      active={active}
      setActive={setActive}
      onLogout={onLogout}
      token={token}
      onResult={hit => {
        if (hit.target === 'users') setActive('users');
        else if (hit.target === 'customers') setActive('customers');
        else if (hit.target === 'projects') setActive('projects');
        else setActive('overview');
      }}
    >
      <div className="role-actions">
        {['customers', 'projects', 'users'].includes(active) && (
          <label className="role-search">
            <Search size={16} />
            <input
              placeholder={`Filter ${active}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
        )}
        {active === 'customers' && (
          <button className="role-primary" onClick={() => setShowAddCustomer(true)}>
            <Plus size={16} /> Add customer
          </button>
        )}
        {active === 'health' && (
          <button className="role-secondary" onClick={load}>
            Refresh status
          </button>
        )}
      </div>

      {error && <div className="role-message"><AlertCircle size={16} />{error}</div>}

      {active === 'overview' && (
        <>
          <div className="role-stats">
            <Stat label="Customer businesses" value={data?.total_customers} icon={Building2} />
            <Stat label="Active projects" value={data?.active_projects} icon={ClipboardList} />
            <Stat label="Customer Managers" value={data?.customer_managers} icon={Users} />
            <Stat label="Site Managers" value={data?.site_managers} icon={Users} />
            <Stat label="Water Drivers" value={data?.water_drivers} icon={Droplets} />
            <Stat label="Active drivers" value={data?.active_water_drivers} icon={CheckCircle2} />
            <Stat label="Critical projects" value={data?.critical_alert_sites} icon={AlertCircle} />
          </div>

          <section className="role-panel">
            <h2>Audited platform activity</h2>
            <div className="role-activity-list">
              {data?.recent_activity?.length ? (
                data.recent_activity.map((a, i) => (
                  <div className="role-activity" key={i}>
                    <i />
                    <span>
                      <b>{a.action.replaceAll('_', ' ')}</b>
                      <small>{a.object_type} · {new Date(a.created_at).toLocaleString()}</small>
                    </span>
                  </div>
                ))
              ) : (
                <p className="role-muted">No audited platform actions recorded yet.</p>
              )}
            </div>
          </section>
        </>
      )}

      {active === 'customers' && (
        <section className="role-panel">
          <h2>Customer organizations</h2>
          <Table
            columns={['Customer', 'Contact person', 'Email', 'Registered', 'Projects', 'Managers', 'Drivers', 'Status', 'Actions']}
            rows={customerRows}
            empty="No customer accounts found."
          />
        </section>
      )}

      {active === 'projects' && (
        <section className="role-panel">
          <h2>Cross-customer projects</h2>
          <Table
            columns={['Project', 'Customer', 'Location', 'Assigned Site Manager', 'Status', 'Created', 'Administrative Access']}
            rows={projectRows}
            empty="No projects found across organizations."
          />
        </section>
      )}

      {active === 'users' && (
        <section className="role-panel">
          <h2>Platform directory (People)</h2>
          <Table
            columns={['Name', 'Email', 'Customer organization', 'Role', 'Status', 'Last sign-in', 'Account state']}
            rows={userRows}
            empty="No users match this search."
          />
        </section>
      )}

      {active === 'health' && (
        <>
          <div className="role-stats">
            <Stat label="Connected devices" value={data?.connected_devices} icon={Radio} />
            <Stat label="Offline devices" value={data?.offline_devices} icon={AlertCircle} />
            <Stat label="Telemetry in last minute" value={data?.telemetry_last_minute} icon={Activity} />
          </div>

          <section className="role-panel">
            <h2>Platform service status</h2>
            <div className="role-health-list">
              {[
                ['Core API service', data?.api || 'operational'],
                ['PostgreSQL database', data?.database || 'connected'],
                ['Background jobs / workers', data?.background_jobs || 'not configured'],
                ['Availability monitoring', data?.system_availability || 'not configured'],
                ['Platform error monitoring', data?.platform_errors || 'not configured']
              ].map(([service, status]) => (
                <div className="role-health-row" key={service}>
                  <span>{service}</span>
                  <Status>{status}</Status>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {viewCustomer && (
        <div className="role-modal-backdrop">
          <section className="role-modal">
            <header>
              <h2>Customer details · {viewCustomer.name}</h2>
              <button type="button" onClick={() => setViewCustomer(null)}>×</button>
            </header>
            <div className="modal-content-grid">
              <div><small>Status</small><b><Status>{viewCustomer.status}</Status></b></div>
              <div><small>Industry</small><b>{viewCustomer.industry || 'Not specified'}</b></div>
              <div><small>Location</small><b>{viewCustomer.operating_location || 'Not specified'}</b></div>
              <div><small>Contact Person</small><b>{viewCustomer.contact_name}</b></div>
              <div><small>Contact Email</small><b>{viewCustomer.contact_email}</b></div>
              <div><small>Contact Phone</small><b>{viewCustomer.contact_phone || '—'}</b></div>
              <div><small>Active Projects</small><b>{viewCustomer.active_projects}</b></div>
              <div><small>Site Managers</small><b>{viewCustomer.site_managers}</b></div>
              <div><small>Water Drivers</small><b>{viewCustomer.water_drivers}</b></div>
            </div>
            <footer>
              <button className="role-primary" type="button" onClick={() => setViewCustomer(null)}>
                Close
              </button>
            </footer>
          </section>
        </div>
      )}

      {readOnlyProject && (
        <div className="role-modal-backdrop">
          <section className="role-modal read-only-modal">
            <header>
              <h2>Project details (Read-Only)</h2>
              <button type="button" onClick={() => setReadOnlyProject(null)}>×</button>
            </header>
            <div className="read-only-banner">
              <ShieldAlert size={16} />
              <span><b>Administrative Read-Only View</b> — Reason recorded: {readOnlyProject.access_reason}</span>
            </div>
            <div className="modal-content-grid">
              <div><small>Project Name</small><b>{readOnlyProject.name}</b></div>
              <div><small>Project Code</small><b>{readOnlyProject.code || '—'}</b></div>
              <div><small>Customer</small><b>{readOnlyProject.customer}</b></div>
              <div><small>Assigned Site Manager</small><b>{readOnlyProject.site_manager}</b></div>
              <div><small>Location / Address</small><b>{readOnlyProject.address || '—'}</b></div>
              <div><small>Coordinates</small><b>{readOnlyProject.latitude && readOnlyProject.longitude ? `${readOnlyProject.latitude}, ${readOnlyProject.longitude}` : 'Not configured'}</b></div>
              <div><small>Site Area</small><b>{readOnlyProject.area ? `${readOnlyProject.area} m²` : '—'}</b></div>
              <div><small>Status</small><b><Status>{readOnlyProject.status}</Status></b></div>
              <div><small>Start Date</small><b>{readOnlyProject.start_date || '—'}</b></div>
              <div><small>Completion Date</small><b>{readOnlyProject.completion_date || '—'}</b></div>
            </div>
            <p className="role-muted">Operational controls, actuator triggering and water spraying commands are strictly disabled in platform admin mode.</p>
            <footer>
              <button className="role-primary" type="button" onClick={() => setReadOnlyProject(null)}>
                Close view
              </button>
            </footer>
          </section>
        </div>
      )}

      {showAddCustomer && (
        <div className="role-modal-backdrop">
          <form className="role-modal" onSubmit={createCustomer}>
            <header>
              <h2>Add customer business</h2>
              <button type="button" onClick={() => setShowAddCustomer(false)}>×</button>
            </header>
            <label>Company name<input name="name" required minLength="2" placeholder="Acme Construction Ltd" /></label>
            <label>Contact person name<input name="contact_name" required placeholder="Jane Doe" /></label>
            <label>Contact email<input name="contact_email" type="email" required placeholder="jane@acme.com" /></label>
            <label>Mobile number<input name="contact_phone" type="tel" placeholder="+91 9876543210" /></label>
            <label>Industry<input name="industry" placeholder="Infrastructure, Commercial..." /></label>
            <label>Operating location<input name="location" placeholder="Pune, Maharashtra" /></label>
            <label>Reason for account creation<input name="reason" required minLength="3" placeholder="Contract execution..." /></label>
            <footer>
              <button type="button" className="role-secondary" onClick={() => setShowAddCustomer(false)}>
                Cancel
              </button>
              <button className="role-primary" disabled={busy}>
                {busy ? 'Creating…' : 'Create customer & invite manager'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </RoleShell>
  );
}

export function CustomerConsole({ token, user, sites, onLogout, onOpenSite, onCreateProject }) {
  const nav = [
    ['overview', 'Overview', Gauge],
    ['projects', 'Projects', ClipboardList],
    ['site_managers', 'Site Managers', Users],
    ['water_drivers', 'Water Drivers', Droplets],
    ['monitoring', 'Monitoring', Activity],
    ['interventions', 'Interventions', ClipboardList],
    ['resources', 'Resources', Waves],
    ['reports', 'Reports', FileText]
  ];

  const [active, setActive] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [inviteModal, setInviteModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState(sites[0]?.id || '');
  const [dateRange, setDateRange] = useState('24 hours');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [monitor, setMonitor] = useState(null);
  const [interventions, setInterventions] = useState([]);
  const [orgAlerts, setOrgAlerts] = useState([]);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const orgId = user.organization_id;

  const load = useCallback(async () => {
    try {
      const [s, m, a] = await Promise.all([
        request(`/organizations/${orgId}/summary`, token),
        request(`/organizations/${orgId}/members`, token),
        request(`/organizations/${orgId}/alerts`, token)
      ]);
      setSummary(s);
      setMembers(m);
      setOrgAlerts(a);
    } catch (e) {
      setError(e.message);
    }
  }, [orgId, token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!projectId || !['monitoring', 'interventions'].includes(active)) return;
    let stop = false;
    const params = new URLSearchParams({ range: dateRange });
    if (sourceFilter !== 'ALL') params.set('source', sourceFilter);
    const telemetryParams = new URLSearchParams({ limit: '1000', range: dateRange });
    if (sourceFilter !== 'ALL') telemetryParams.set('source_type', sourceFilter);

    Promise.all([
      request(`/sites/${projectId}/overview?${params}`, token),
      request(`/sites/${projectId}/risk`, token).catch(() => null),
      request(`/sites/${projectId}/interventions`, token),
      request(`/sites/${projectId}/telemetry?${telemetryParams}`, token),
      request(`/sites/${projectId}/devices`, token)
    ])
      .then(([ov, risk, items, history, deviceRows]) => {
        if (!stop) {
          setMonitor({ ...ov, risk, history: history.items || [], devices: deviceRows });
          setInterventions(items);
        }
      })
      .catch(e => setError(e.message));

    return () => { stop = true; };
  }, [active, projectId, dateRange, sourceFilter, token]);

  const filteredSites = useMemo(() => (
    sites.filter(s => JSON.stringify(s).toLowerCase().includes(search.toLowerCase()))
  ), [sites, search]);

  const drivers = useMemo(() => members.filter(x => x.role === 'WATER_DRIVER'), [members]);
  const managers = useMemo(() => members.filter(x => x.role === 'SITE_MANAGER'), [members]);

  const people = useMemo(() => {
    const list = active === 'site_managers' ? managers : drivers;
    return list.filter(x => JSON.stringify(x).toLowerCase().includes(search.toLowerCase()));
  }, [active, managers, drivers, search]);

  async function sendInvite(e) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const result = await request('/invitations', token, {
        method: 'POST',
        body: JSON.stringify({
          email: f.get('email'),
          role: active === 'water_drivers' ? 'WATER_DRIVER' : 'SITE_MANAGER',
          site_id: f.get('site_id')
        })
      });
      setError(
        result.development_token
          ? `Invitation created. Activation link: ${window.location.origin}/?invite=${encodeURIComponent(result.development_token)}`
          : 'Invitation created; email delivery is not configured.'
      );
      setInviteModal(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function approveIntervention(item) {
    try {
      await request(`/interventions/${item.id}/approve`, token, { method: 'POST', body: '{}' });
      const updated = await request(`/sites/${projectId}/interventions`, token);
      setInterventions(updated);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleAlertAction(alertId, action) {
    try {
      await request(`/alerts/${alertId}/${action}`, token, { method: 'POST', body: '{}' });
      setOrgAlerts(curr => curr.map(a => a.id === alertId ? { ...a, status: action === 'resolve' ? 'RESOLVED' : 'ACKNOWLEDGED' } : a));
    } catch (e) {
      setError(e.message);
    }
  }

  const projectRows = filteredSites.map(s => ({
    id: s.id,
    cells: [
      <b key="name">{s.name}</b>,
      s.code || '—',
      s.address || 'Location not set',
      <Status key="status">{s.status}</Status>,
      <button key="open" className="role-link" onClick={() => onOpenSite(s)}>
        Open project <ArrowRight size={14} />
      </button>
    ]
  }));

  const peopleRows = people.map(m => ({
    id: m.user_id,
    cells: [
      <b key="name">{m.full_name}</b>,
      m.email,
      m.phone || '—',
      m.site_ids?.length || 0,
      <Status key="status">{m.status}</Status>,
      m.availability ? <Status key="avail">{m.availability}</Status> : '—'
    ]
  }));

  return (
    <RoleShell
      title={`${user.company_name || 'Organization'} · Customer Console`}
      user={user}
      nav={nav}
      active={active}
      setActive={v => { setActive(v); setSearch(''); }}
      onLogout={onLogout}
      token={token}
      alerts={orgAlerts}
      onAlerts={() => setAlertsOpen(true)}
      onResult={hit => {
        if (hit.type === 'project') {
          const s = sites.find(x => x.id === hit.id);
          if (s) onOpenSite(s, hit.target || 'overview');
        } else if (hit.target === 'alerts') {
          setAlertsOpen(true);
        } else if (nav.some(n => n[0] === hit.target)) {
          setActive(hit.target);
        }
      }}
    >
      <div className="role-actions">
        {['projects', 'site_managers', 'water_drivers', 'interventions'].includes(active) && (
          <label className="role-search">
            <Search size={16} />
            <input
              placeholder={`Filter ${active.replaceAll('_', ' ')}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
        )}

        {active === 'monitoring' && (
          <div className="filter-controls-bar">
            <select
              className="role-select"
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              aria-label="Select Project"
            >
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              {!sites.length && <option value="">No projects</option>}
            </select>

            <select
              className="role-select"
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              aria-label="Filter Date Range"
            >
              <option value="Today">Today</option>
              <option value="24 hours">24 hours</option>
              <option value="7 days">7 days</option>
              <option value="30 days">30 days</option>
            </select>

            <select
              className="role-select"
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              aria-label="Filter Source"
            >
              <option value="ALL">All Sources</option>
              <option value="PHYSICAL">Physical only</option>
              <option value="SIMULATION">Simulation only</option>
            </select>
          </div>
        )}

        {active === 'projects' && (
          <button className="role-primary" onClick={onCreateProject}>
            <Plus size={16} /> New project
          </button>
        )}

        {['site_managers', 'water_drivers'].includes(active) && (
          <button className="role-primary" onClick={() => setInviteModal(true)}>
            <Plus size={16} /> Invite {active === 'site_managers' ? 'Site Manager' : 'Water Driver'}
          </button>
        )}
      </div>

      {error && <div className="role-message"><AlertCircle size={16} />{error}</div>}

      {alertsOpen && (
        <div className="role-modal-backdrop">
          <section className="role-modal alert-modal">
            <header>
              <h2>Organization Alerts ({orgAlerts.filter(a => a.status === 'ACTIVE').length} active)</h2>
              <button type="button" onClick={() => setAlertsOpen(false)}>×</button>
            </header>
            <div className="alert-list-container">
              {orgAlerts.length ? (
                orgAlerts.map(a => (
                  <div className="alert-card-row" key={a.id}>
                    <div className="alert-info">
                      <span className={`alert-severity-badge severity-${a.severity?.toLowerCase()}`}>
                        {a.severity}
                      </span>
                      <b>{a.title}</b>
                      <small>{a.site_name} · {new Date(a.created_at).toLocaleString()}</small>
                    </div>
                    <div className="alert-actions">
                      <Status>{a.status}</Status>
                      {a.status === 'ACTIVE' && (
                        <button className="role-secondary" onClick={() => handleAlertAction(a.id, 'acknowledge')}>
                          Acknowledge
                        </button>
                      )}
                      {a.status !== 'RESOLVED' && (
                        <button className="role-primary" onClick={() => handleAlertAction(a.id, 'resolve')}>
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="role-muted">No alerts across projects.</p>
              )}
            </div>
            <footer>
              <button className="role-secondary" type="button" onClick={() => setAlertsOpen(false)}>
                Close
              </button>
            </footer>
          </section>
        </div>
      )}

      {active === 'overview' && (
        <>
          <div className="role-stats">
            <Stat label="Total projects" value={summary?.projects} icon={ClipboardList} />
            <Stat label="Active projects" value={summary?.active_projects} icon={Building2} />
            <Stat label="Critical alert projects" value={summary?.critical_projects} icon={AlertCircle} />
            <Stat label="Site Managers" value={summary?.site_managers} icon={Users} />
            <Stat label="Water Drivers" value={summary?.water_drivers} icon={Droplets} />
            <Stat label="Active drivers" value={summary?.active_drivers} icon={CheckCircle2} />
            <Stat label="Water usage today" value="No data" icon={Waves} foot={summary?.water_usage_source} />
            <Stat label="Active interventions" value={summary?.active_interventions} icon={Activity} />
          </div>

          <section className="role-panel">
            <h2>Organization Projects</h2>
            <Table
              columns={['Project', 'Code', 'Location', 'Status', 'Launch Workspace']}
              rows={projectRows}
              empty="No projects found."
            />
          </section>
        </>
      )}

      {active === 'projects' && (
        <section className="role-panel">
          <h2>Project directory & site onboarding</h2>
          <Table
            columns={['Project Name', 'Project ID', 'Site Location', 'Lifecycle Status', 'Operational View']}
            rows={projectRows}
            empty="No projects match this search."
          />
        </section>
      )}

      {['site_managers', 'water_drivers'].includes(active) && (
        <section className="role-panel">
          <h2>{active === 'site_managers' ? 'Site Managers' : 'Water Drivers'}</h2>
          <Table
            columns={['Name', 'Email', 'Mobile', 'Assigned sites count', 'Account status', 'Availability']}
            rows={peopleRows}
            empty={`No ${active.replaceAll('_', ' ')} found.`}
          />
        </section>
      )}

      {active === 'monitoring' && (
        <section className="role-panel">
          <h2>Sensor monitoring & integrated predictions</h2>
          <div className="role-stats">
            <Stat label="PM2.5" value={monitor?.kpis?.pm25 ?? 'No data'} icon={Activity} />
            <Stat label="PM10" value={monitor?.kpis?.pm10 ?? 'No data'} icon={Activity} />
            <Stat label="Site Risk Score" value={monitor?.kpis?.risk_level || 'UNKNOWN'} icon={AlertCircle} />
            <Stat label="Telemetry Provenance" value={monitor?.source || 'NO DATA'} icon={Radio} />
          </div>

          <div className="sub-section-block">
            <h3>Explainable Risk & Prediction Analysis</h3>
            <p className="role-muted">Predictions are decision support based on terrain, wind heading, and activity. Plumes are not measured concentrations.</p>
            <div className="risk-zone-grid">
              {(monitor?.risk?.zones || []).map(z => (
                <div className="risk-zone-card" key={z.zone_id}>
                  <b>{z.zone_name}</b>
                  <div className="risk-level-tag">
                    <Status>{z.level}</Status>
                    <small>{z.data_quality} · rule-based forecast</small>
                  </div>
                </div>
              ))}
              {!(monitor?.risk?.zones || []).length && (
                <p className="role-muted">Select a project with active telemetry to view zone risk predictions.</p>
              )}
            </div>
          </div>

          <div className="sub-section-block">
            <h3>Recent readings</h3>
            <Table
              columns={['Time', 'Device', 'Zone', 'Measurements', 'Source', 'Quality']}
              rows={(monitor?.history || []).slice(-20).reverse().map((event, index) => {
                const values = Object.entries({ ...(event.metrics || {}), ...(event.states || {}) })
                  .map(([key, value]) => `${key.replaceAll('_', ' ')}: ${String(value)}`)
                  .join(' · ');
                return {
                  id: `${event.event_id || index}`,
                  cells: [
                    new Date(event.received_at_utc).toLocaleString(),
                    event.device_uid || 'Device',
                    event.zone_id || 'Site',
                    values || 'No usable measurements',
                    <Status key="source">{event.source_type}</Status>,
                    <Status key="quality">{event.quality}</Status>
                  ]
                };
              })}
              empty="No telemetry events in this range."
            />
          </div>

          <div className="sub-section-block">
            <h3>Devices</h3>
            <Table
              columns={['Device', 'ID', 'Source', 'Zone', 'Status', 'Last seen']}
              rows={(monitor?.devices || []).map(device => ({
                id: device.id,
                cells: [
                  device.name,
                  device.device_uid,
                  <Status key="source">{device.source_type}</Status>,
                  device.zone_id || 'Unassigned',
                  <Status key="status">{device.status}</Status>,
                  device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : 'No data'
                ]
              }))}
              empty="No devices registered for this project."
            />
          </div>
        </section>
      )}

      {active === 'interventions' && (
        <section className="role-panel">
          <h2>Intervention recommendations & approval workflows</h2>
          <div className="intervention-list">
            {interventions.filter(i => JSON.stringify(i).toLowerCase().includes(search.toLowerCase())).map(i => (
              <article className="intervention-card" key={i.id}>
                <div>
                  <b>{i.intervention_type}</b>
                  <p>{i.rationale || 'Intervention requested'}</p>
                  <small>Status: <Status>{i.status}</Status> · Source: {i.source_type || 'SYSTEM'}</small>
                </div>
                <div className="intervention-actions">
                  {(i.status === 'DRAFT' || i.status === 'PENDING_APPROVAL') && (
                    <button className="role-primary" onClick={() => approveIntervention(i)}>
                      Approve intervention
                    </button>
                  )}
                </div>
              </article>
            ))}
            {!interventions.length && (
              <p className="role-muted">No interventions created for this project.</p>
            )}
          </div>
        </section>
      )}

      {active === 'resources' && (
        <section className="role-panel">
          <h2>Resources & equipment coordination</h2>
          <div className="role-stats">
            <Stat label="Water tank level" value="No data" icon={Droplets} foot="Awaiting level transmitter" />
            <Stat label="Flow rate" value="No data" icon={Waves} foot="Awaiting a fresh flow reading" />
            <Stat label="Assigned Water Drivers" value={drivers.length} icon={Users} />
          </div>

          <h3>Water Drivers availability</h3>
          <Table
            columns={['Driver', 'Email', 'Assigned sites', 'Availability']}
            rows={drivers.map(d => ({
              id: d.user_id,
              cells: [
                <b key="name">{d.full_name}</b>,
                d.email,
                d.site_ids?.length || 0,
                <Status key="avail">{d.availability || 'INACTIVE'}</Status>
              ]
            }))}
            empty="No drivers assigned to this organization."
          />
          {projectId && (
            <div style={{ marginTop: 16 }}>
              <button
                className="role-link"
                onClick={() => onOpenSite(sites.find(s => s.id === projectId), 'resources')}
              >
                Open detailed site resources <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>
      )}

      {active === 'reports' && (
        <section className="role-panel">
          <h2>Reports & operational documentation</h2>
          <Table
            columns={['Project name', 'Status', 'Export CSV']}
            rows={sites.filter(s => !projectId || s.id === projectId).map(s => ({
              id: s.id,
              cells: [
                <b key="name">{s.name}</b>,
                <Status key="status">{s.status}</Status>,
                <button
                  key="open"
                  className="role-link"
                  onClick={() => onOpenSite(s, 'reports')}
                >
                  Download CSV report <ArrowRight size={14} />
                </button>
              ]
            }))}
            empty="No project reports available."
          />
        </section>
      )}

      {inviteModal && (
        <div className="role-modal-backdrop">
          <form className="role-modal" onSubmit={sendInvite}>
            <header>
              <h2>Invite {active === 'site_managers' ? 'Site Manager' : 'Water Driver'}</h2>
              <button type="button" onClick={() => setInviteModal(false)}>×</button>
            </header>
            <label>Teammate work email<input name="email" type="email" required placeholder="name@company.com" /></label>
            <label>Assign to site<select name="site_id" required>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></label>
            <footer>
              <button className="role-secondary" type="button" onClick={() => setInviteModal(false)}>Cancel</button>
              <button className="role-primary" disabled={busy}>{busy ? 'Sending…' : 'Send invitation'}</button>
            </footer>
          </form>
        </div>
      )}
    </RoleShell>
  );
}

export function DriverApp({ token, user, onLogout }) {
  const [data, setData] = useState({ availability: 'INACTIVE', offers: [], tasks: [] });
  const [tab, setTab] = useState('home');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reportLitresModal, setReportLitresModal] = useState(null);
  const [reportProblemModal, setReportProblemModal] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await request('/drivers/me/tasks', token);
      setData(res);
    } catch (e) {
      setError(e.message);
    }
  }, [token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const current = data.tasks.find(t => ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'BLOCKED'].includes(t.status));
  const offers = data.offers.filter(x => x.status === 'OFFERED');

  async function act(path, body = {}) {
    setBusy(true);
    setError('');
    try {
      await request(path, token, { method: 'POST', body: JSON.stringify(body) });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleAvailability() {
    setBusy(true);
    try {
      const nextValue = data.availability === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const result = await request('/drivers/me/availability', token, {
        method: 'PATCH',
        body: JSON.stringify({ availability: nextValue })
      });
      setData(d => ({ ...d, availability: result.availability }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const completedTodayCount = useMemo(() => (
    data.tasks.filter(t => t.status === 'COMPLETED').length
  ), [data.tasks]);

  return (
    <div className="driver-app">
      <header className="driver-header">
        <span className="driver-brand">
          <b>A</b> AEROVA Water
        </span>
        <button className="driver-logout-btn" onClick={onLogout} title="Sign out">
          <LogOut size={20} />
        </button>
      </header>

      <main className="driver-content">
        {error && <div className="driver-error-box"><AlertCircle size={18} />{error}</div>}

        {tab === 'home' && (
          <>
            <div className="driver-profile-header">
              <h1>Hello, {user.full_name?.split(' ')[0]}</h1>
              <p className="driver-caption">Tanker Spraying Tasks</p>
            </div>

            <section className={`driver-toggle-box ${data.availability === 'ACTIVE' ? 'active-box' : 'inactive-box'}`}>
              <div>
                <small>CURRENT STATUS</small>
                <strong>{data.availability === 'ACTIVE' ? 'ACTIVE · READY' : 'INACTIVE · OFF DUTY'}</strong>
                <span>{completedTodayCount} tasks completed today</span>
              </div>
              <button
                className={`driver-toggle-btn ${data.availability === 'ACTIVE' ? 'btn-active' : 'btn-inactive'}`}
                disabled={busy}
                onClick={toggleAvailability}
              >
                {data.availability === 'ACTIVE' ? 'GO INACTIVE' : 'GO ACTIVE'}
              </button>
            </section>

            {offers.map(offer => (
              <section className="driver-offer-card" key={offer.id}>
                <div className="driver-badge-urgent">
                  <Droplets size={16} /> WATER NEEDED
                </div>
                <h2>{offer.task.site_name}</h2>
                <p><MapPin size={16} /> {offer.task.destination || 'Site destination'}</p>
                {offer.task.zone_name && (
                  <span className="driver-zone-chip">Target zone: {offer.task.zone_name}</span>
                )}
                {offer.task.requested_litres && (
                  <div className="driver-spec-row">Volume: {offer.task.requested_litres} L</div>
                )}
                <div className="driver-action-grid">
                  <button
                    className="driver-btn-primary"
                    disabled={busy}
                    onClick={() => act(`/water-task-offers/${offer.id}/accept`)}
                  >
                    Accept task
                  </button>
                  <button
                    className="driver-btn-secondary"
                    disabled={busy}
                    onClick={() => act(`/water-task-offers/${offer.id}/decline`, { note: 'Declined by driver' })}
                  >
                    Decline
                  </button>
                </div>
              </section>
            ))}

            {current ? (
              <section className="driver-current-task-card">
                <div className="driver-badge-progress">
                  <ClipboardList size={16} /> TASK: {current.status.replaceAll('_', ' ')}
                </div>
                <h2>{current.zone_name || current.title}</h2>
                <p className="driver-dest"><MapPin size={16} /> {current.site_name} · {current.destination}</p>
                <div className="driver-instructions-box">
                  <b>Instructions:</b>
                  <p>{current.instructions}</p>
                </div>

                {current.requested_litres && (
                  <div className="driver-spec-row">Required volume: <b>{current.requested_litres} L</b></div>
                )}

                <div className="driver-action-grid">
                  {current.status === 'ACCEPTED' && (
                    <button
                      className="driver-btn-primary"
                      disabled={busy}
                      onClick={() => act(`/water-tasks/${current.id}/arrive`)}
                    >
                      Arrived at site
                    </button>
                  )}

                  {current.status === 'ARRIVED' && (
                    <button
                      className="driver-btn-primary"
                      disabled={busy}
                      onClick={() => act(`/water-tasks/${current.id}/start`)}
                    >
                      Start spraying
                    </button>
                  )}

                  {current.status === 'IN_PROGRESS' && (
                    <button
                      className="driver-btn-primary"
                      disabled={busy}
                      onClick={() => setReportLitresModal(current)}
                    >
                      Complete spraying
                    </button>
                  )}

                  {['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(current.status) && (
                    <button
                      className="driver-btn-danger"
                      disabled={busy}
                      onClick={() => setReportProblemModal(current)}
                    >
                      Report problem
                    </button>
                  )}
                </div>

                <small className="driver-disclaimer">
                  Driver confirmation recorded separately from sensor-verified water flow.
                </small>
              </section>
            ) : (
              !offers.length && (
                <section className="driver-empty-state">
                  <Droplets size={38} />
                  <h3>No tasks assigned</h3>
                  <p>{data.availability === 'ACTIVE' ? 'You will be notified when spraying is needed.' : 'Turn your status ACTIVE to receive task offers.'}</p>
                </section>
              )
            )}
          </>
        )}

        {tab === 'tasks' && (
          <section className="driver-history-section">
            <h2>My Tasks</h2>
            <div className="driver-history-list">
              {data.tasks.map(t => (
                <article className="driver-history-item" key={t.id}>
                  <div>
                    <b>{t.site_name}</b>
                    <small>{t.title} · {t.zone_name || 'Site'}</small>
                    <time>{new Date(t.created_at).toLocaleString()}</time>
                  </div>
                  <Status>{t.status}</Status>
                </article>
              ))}
              {!data.tasks.length && (
                <p className="role-muted">No task history recorded.</p>
              )}
            </div>
          </section>
        )}

        {reportLitresModal && (
          <div className="driver-modal-backdrop">
            <div className="driver-modal">
              <h3>Task completed</h3>
              <p>Enter the water volume sprayed, if known:</p>
              <input
                id="driver-litres-input"
                type="number"
                min="0"
                placeholder="e.g. 5000 litres"
                className="driver-large-input"
              />
              <div className="driver-modal-actions">
                <button
                  className="driver-btn-primary"
                  onClick={() => {
                    const input = document.getElementById('driver-litres-input');
                    const val = input?.value ? Number(input.value) : undefined;
                    act(`/water-tasks/${reportLitresModal.id}/complete`, { litres_reported: val });
                    setReportLitresModal(null);
                  }}
                >
                  Confirm & complete
                </button>
                <button
                  className="driver-btn-secondary"
                  onClick={() => setReportLitresModal(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {reportProblemModal && (
          <div className="driver-modal-backdrop">
            <div className="driver-modal">
              <h3>Report an issue</h3>
              <p>What prevented spraying?</p>
              <textarea
                id="driver-problem-notes"
                rows={3}
                placeholder="Blocked road, empty hydrant, mechanical fault..."
                className="driver-large-textarea"
              />
              <div className="driver-modal-actions">
                <button
                  className="driver-btn-danger"
                  onClick={() => {
                    const notes = document.getElementById('driver-problem-notes')?.value || 'Problem reported';
                    act(`/water-tasks/${reportProblemModal.id}/problem`, { note: notes });
                    setReportProblemModal(null);
                  }}
                >
                  Submit report
                </button>
                <button
                  className="driver-btn-secondary"
                  onClick={() => setReportProblemModal(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="driver-nav-bar">
        <button
          className={tab === 'home' ? 'nav-active' : ''}
          onClick={() => setTab('home')}
        >
          <Gauge size={22} />
          <span>Home</span>
        </button>
        <button
          className={tab === 'tasks' ? 'nav-active' : ''}
          onClick={() => setTab('tasks')}
        >
          <ClipboardList size={22} />
          <span>My tasks</span>
        </button>
      </nav>
    </div>
  );
}

export function InvitationActivation({ onAuth }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inviteToken = new URLSearchParams(window.location.search).get('invite') || '';

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    try {
      const result = await request('/invitations/activate', '', {
        method: 'POST',
        body: JSON.stringify({
          token: inviteToken,
          full_name: f.get('name'),
          password: f.get('password'),
          phone: f.get('phone') || null
        })
      });
      onAuth(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="invite-activation">
      <form onSubmit={submit}>
        <a className="role-brand" href="/"><span>A</span>AEROVA</a>
        <h1>Activate your account</h1>
        <p>Set up your AEROVA access from the invitation link.</p>
        <label>Full name<input name="name" autoComplete="name" required minLength="2" placeholder="Jane Smith" /></label>
        <label>Mobile number<input name="phone" type="tel" autoComplete="tel" placeholder="+91 9876543210" /></label>
        <label>Create password<input name="password" type="password" autoComplete="new-password" required minLength="12" placeholder="At least 12 characters" /></label>
        {error && <div className="role-message"><AlertCircle size={16} />{error}</div>}
        <button className="role-primary" disabled={busy || !inviteToken}>
          {busy ? 'Activating…' : 'Activate account'}
        </button>
        {!inviteToken && <small className="error-text">Invitation token is missing from this link.</small>}
      </form>
    </div>
  );
}

export function SiteWaterOperations({ token, site, user }) {
  const [tasks, setTasks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [zones, setZones] = useState([]);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const siteId = site?.id;

  const load = useCallback(async () => {
    if (!siteId) return;
    try {
      const [t, d, z] = await Promise.all([
        request(`/sites/${siteId}/water-tasks`, token),
        request(`/sites/${siteId}/drivers`, token),
        request(`/sites/${siteId}/zones`, token)
      ]);
      setTasks(t);
      setDrivers(d);
      setZones(z);
    } catch (e) {
      setError(e.message);
    }
  }, [siteId, token]);

  useEffect(() => {
    load();
  }, [load]);

  async function createTask(e) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await request(`/sites/${site.id}/water-tasks`, token, {
        method: 'POST',
        body: JSON.stringify({
          title: f.get('title'),
          instructions: f.get('instructions'),
          zone_id: f.get('zone_id') || null,
          destination: site.address,
          requested_litres: f.get('litres') ? Number(f.get('litres')) : null,
          duration_minutes: f.get('duration') ? Number(f.get('duration')) : null,
          approval_required: user.role === 'SITE_MANAGER'
        })
      });
      setShow(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function approve(task) {
    try {
      await request(`/water-tasks/${task.id}/approve`, token, { method: 'POST', body: '{}' });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function offer(task, driver) {
    try {
      await request(`/water-tasks/${task.id}/offers`, token, {
        method: 'POST',
        body: JSON.stringify({ driver_id: driver.id, expires_minutes: 5 })
      });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <div className="role-actions">
        <button className="role-primary" onClick={() => setShow(true)}>
          <Plus size={16} /> Create water task
        </button>
      </div>

      {error && <div className="role-message"><AlertCircle size={16} />{error}</div>}

      <section className="role-panel">
        <h2>Water tasks · {site?.name}</h2>
        <div className="water-task-list">
          {tasks.length ? (
            tasks.map(t => (
              <article key={t.id}>
                <div>
                  <b>{t.title}</b>
                  <small>{t.zone_id ? `Target zone · ${t.zone_id} · ` : ''}{t.destination || site?.address || 'Site destination'}</small>
                  <p>{t.instructions}</p>
                  <Status>{t.status}</Status>
                  {t.accepted_by && <small>Driver accepted assignment</small>}
                </div>
                <div className="water-task-actions">
                  {t.status === 'PENDING_APPROVAL' && user.role === 'CUSTOMER_MANAGER' && (
                    <button className="role-primary" onClick={() => approve(t)}>
                      Approve task
                    </button>
                  )}
                  {t.status === 'READY' && drivers.filter(d => d.availability === 'ACTIVE').map(d => (
                    <button className="role-secondary" key={d.id} onClick={() => offer(t, d)}>
                      Offer to {d.name}
                    </button>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <p className="role-muted">No water tasks have been created for this project.</p>
          )}
        </div>
      </section>

      <section className="role-panel">
        <h2>Drivers assigned to this project</h2>
        <Table
          columns={['Driver', 'Availability', 'Current task assignment']}
          rows={drivers.map(d => ({
            id: d.id,
            cells: [
              <b key="name">{d.name}</b>,
              <Status key="status">{d.availability}</Status>,
              d.active_task ? 'Assigned' : '—'
            ]
          }))}
          empty="No drivers assigned to this site."
        />
      </section>

      {show && (
        <div className="role-modal-backdrop">
          <form className="role-modal" onSubmit={createTask}>
            <header>
              <h2>Request water spraying task</h2>
              <button type="button" onClick={() => setShow(false)}>×</button>
            </header>
            <p className="role-muted">
              A high dust alert alone does not authorize spraying. Confirm surface conditions and tank readiness.
            </p>
            <label>Task title<input name="title" defaultValue="Water spraying required" required /></label>
            <label>Target zone<select name="zone_id">
              <option value="">Entire site</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select></label>
            <label>Instructions<textarea name="instructions" required minLength="3" placeholder="Where to spray and safety instructions..." /></label>
            <label>Water amount, if known (litres)<input name="litres" type="number" min="1" placeholder="e.g. 5000" /></label>
            <label>Duration, if known (minutes)<input name="duration" type="number" min="1" placeholder="e.g. 30" /></label>
            <small>
              {user.role === 'SITE_MANAGER'
                ? 'Requires approval before offering to drivers according to organization policy.'
                : 'Task will be created and offered to active drivers.'}
            </small>
            <footer>
              <button className="role-secondary" type="button" onClick={() => setShow(false)}>Cancel</button>
              <button className="role-primary" disabled={busy}>{busy ? 'Saving…' : 'Save & create task'}</button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
