import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import appIcon from "../assets/app-icon.png";

const features = ["Attendance tracking", "Exam results", "Fee updates", "Parent notices"];

const contactDetails = {
  email: "support@instituteapp.com",
  phone: "+1-234-567-890"
};

const policySections = [
  {
    title: "Information We Collect",
    body:
      "SP ICSE Foundation may collect account details such as name, phone number, email address, student profile information, attendance records, exam marks, fee records, and institute notices. The app may also store login tokens on your device so you can remain signed in securely."
  },
  {
    title: "How We Use Information",
    body:
      "We use this information to operate the institute management system, show student academic records, share attendance and fee updates, send important notifications, support parent and staff access, and maintain the security of the service."
  },
  {
    title: "Notifications",
    body:
      "If you allow notifications, the app may send reminders and institute updates related to attendance, fees, exams, notices, and student activity. You can control notification permissions from your device settings."
  },
  {
    title: "Sharing of Information",
    body:
      "Student and account information is used for institute operations. We do not sell personal information. Information may be shared with authorized institute staff, parents or guardians linked to a student, service providers who help run the app, or when required by law."
  },
  {
    title: "Data Security",
    body:
      "We use reasonable technical and administrative safeguards to protect information. No digital service can be guaranteed to be completely secure, so users should keep their login details confidential and report suspicious access promptly."
  },
  {
    title: "Data Retention",
    body:
      "Records are kept for as long as needed for institute administration, legal, accounting, academic, or operational purposes. Requests to update or remove information can be submitted to the institute administration."
  },
  {
    title: "Children's Privacy",
    body:
      "The app is intended for institute administration and parent or guardian access to student information. Student data should be managed by authorized staff and guardians according to institute policies and applicable law."
  },
  {
    title: "Contact",
    body:
      "For privacy questions, corrections, or access requests, contact the SP ICSE Foundation administration through the official institute office or the support contact listed with the mobile app."
  }
];

function PublicFooter() {
  const year = new Date().getFullYear();
  const [contacts, setContacts] = useState(contactDetails);

  useEffect(() => {
    let mounted = true;
    api
      .get("/settings/public")
      .then((res) => {
        if (mounted && res.data.settings) {
          setContacts({
            email: res.data.settings.supportEmail ?? contactDetails.email,
            phone: res.data.settings.supportPhone ?? contactDetails.phone
          });
        }
      })
      .catch(() => {
        setContacts(contactDetails);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <footer className="public-footer">
      <div>
        <strong>SP ICSE Foundation</strong>
        <p>Copyright © {year} SP ICSE Foundation. All rights reserved.</p>
      </div>
      <address className="footer-contact">
        <a href={`mailto:${contacts.email}`}>{contacts.email}</a>
        <a href={`tel:${contacts.phone.replace(/[^\d+]/g, "")}`}>{contacts.phone}</a>
      </address>
      <nav aria-label="Footer navigation">
        <Link to="/">Home</Link>
        <Link to="/privacy-policy">Privacy Policy</Link>
        <Link to="/admin/login">Login</Link>
      </nav>
    </footer>
  );
}

export function LandingPage() {
  return (
    <main className="public-site">
      <nav className="public-nav">
        <Link className="brand-link" to="/">
          <img src={appIcon} alt="SP ICSE Foundation app icon" />
          <span>SP ICSE Foundation</span>
        </Link>
        <div className="public-nav-actions">
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link className="public-button ghost" to="/admin/login">
             Login
          </Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="public-eyebrow">Institute management app</p>
          <h1>Suvarna Pawar's ICSE Foundation</h1>
          <p>
            A simple digital companion for institute staff and families to keep attendance, marks,
            fees, and notices in one dependable place.
          </p>
          <div className="landing-actions">
            <Link className="public-button" to="/privacy-policy">
              View Privacy Policy
            </Link>
           
          </div>
        </div>

        <div className="app-preview" aria-label="SP ICSE Foundation mobile app preview">
          <div className="phone-frame">
            <div className="phone-status" />
            <div className="phone-header">
              <img src={appIcon} alt="" />
              <div>
                <strong>Student Portal</strong>
                <span>Today at a glance</span>
              </div>
            </div>
            <div className="phone-stat-grid">
              <div>
                <span>Attendance</span>
                <strong>94%</strong>
              </div>
              <div>
                <span>Fees</span>
                <strong>Updated</strong>
              </div>
            </div>
            <div className="phone-list">
              {features.map((feature) => (
                <div key={feature}>
                  <span />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-band">
        {features.map((feature) => (
          <article className="feature-card" key={feature}>
            <span>{feature.slice(0, 2).toUpperCase()}</span>
            <h2>{feature}</h2>
            <p>Clear records for students, parents, and authorized institute staff.</p>
          </article>
        ))}
      </section>
      <PublicFooter />
    </main>
  );
}

export function PrivacyPolicyPage() {
  return (
    <main className="public-site policy-page">
      <nav className="public-nav">
        <Link className="brand-link" to="/">
          <img src={appIcon} alt="SP ICSE Foundation app icon" />
          <span>SP ICSE Foundation</span>
        </Link>
        <div className="public-nav-actions">
          <Link to="/">Home</Link>
          <Link className="public-button ghost" to="/admin/login">
            Admin Login
          </Link>
        </div>
      </nav>

      <article className="policy-document">
        <p className="public-eyebrow">Last updated: June 13, 2026</p>
        <h1>Privacy Policy</h1>
        <p className="policy-intro">
          This Privacy Policy explains how SP ICSE Foundation collects, uses, stores, and protects
          information when you use the SP ICSE Foundation mobile app and related web services.
        </p>

        {policySections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}

        <section>
          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Updates will be posted on this page
            with a new effective date.
          </p>
        </section>
      </article>
      <PublicFooter />
    </main>
  );
}
