import React from 'react';
import { Link } from 'react-router-dom';
import { landingToolsCatalog } from '../../../config/landingToolsCatalog';

export default function LandingToolsSection({ onOpenModal }) {
  return (
    <section
      className="landing-section tools-section"
      aria-label="เครื่องมือและฐานข้อมูล"
    >
      <div className="section-header-compact">
        <h2>🛠️ เครื่องมือและฐานข้อมูล</h2>
        <span className="section-subtitle">
          ระบบบริการและลิงก์ด่วนการเข้าถึงฐานข้อมูลการเกษตร
        </span>
      </div>

      <div className="tools-grid">
        {landingToolsCatalog.map((tool) => {
          const Icon = tool.Icon;

          if (tool.isModalTrigger) {
            return (
              <button
                key={tool.id}
                type="button"
                className="tool-card"
                style={{
                  background: 'none',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onClick={() => onOpenModal && onOpenModal(tool.modalKey)}
              >
                <div className="tool-icon-wrapper">
                  <Icon aria-hidden="true" />
                </div>
                <h3>{tool.title}</h3>
                <p>{tool.subtitle}</p>
              </button>
            );
          }

          if (tool.isExternal) {
            return (
              <a
                key={tool.id}
                href={tool.href}
                className="tool-card"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="tool-icon-wrapper">
                  <Icon aria-hidden="true" />
                </div>
                <h3>{tool.title}</h3>
                <p>{tool.subtitle}</p>
              </a>
            );
          }

          return (
            <Link key={tool.id} to={tool.href} className="tool-card">
              <div className="tool-icon-wrapper">
                <Icon aria-hidden="true" />
              </div>
              <h3>{tool.title}</h3>
              <p>{tool.subtitle}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
