import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import appIcon from "../assets/app-icon.png";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: "DB" },
  { to: "/admin/students", label: "Students", icon: "ST" },
  { to: "/admin/attendance", label: "Attendance", icon: "AT" },
  { to: "/admin/exams", label: "Exams", icon: "EX" },
  { to: "/admin/fees/plans", label: "Fee Plans", icon: "FP" },
  { to: "/admin/fees/accounts", label: "Fee Accounts", icon: "FA" },
  { to: "/admin/settings", label: "Settings", icon: "SE" }
];

export function Layout() {
  const logout = useAuthStore((s) => s.logout);
  const email = useAuthStore((s) => s.email);
  const role = useAuthStore((s) => s.role);
  const location = useLocation();

  const currentItem =
    navItems.find((item) => (item.to === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(item.to))) ?? navItems[0];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={appIcon} alt="SP ICSE Foundation logo" />
          <div>
            <strong>SP ICSE Foundation</strong>
            <span>Admin Console</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Nav key={item.to} to={item.to} icon={item.icon}>
              {item.label}
            </Nav>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Signed in as
          </div>
          <div style={{ fontWeight: 800, marginTop: 8 }}>{email}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {role}
          </div>
        </div>
      </aside>

      <main className="content-shell">
        <div className="topbar">
          <div>
            <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Active workspace
            </div>
            <h2 className="topbar-title">{currentItem.label}</h2>
            <div className="topbar-subtitle">Centralized operations for your coaching institute.</div>
          </div>

          <div className="row">
            <div className="topbar-user">
              <div className="topbar-avatar">{(email ?? "A").slice(0, 1).toUpperCase()}</div>
              <div>
                <div style={{ fontWeight: 800 }}>{email}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {role}
                </div>
              </div>
            </div>
            <button className="btn danger" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function Nav({ to, icon, children }: { to: string; icon: string; children: React.ReactNode }) {
  return (
    <NavLink to={to} className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
      <span className="sidebar-icon">{icon}</span>
      <span>{children}</span>
    </NavLink>
  );
}
