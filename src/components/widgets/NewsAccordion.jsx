import { useState } from 'react';
import { DownOutlined, RightOutlined } from '@ant-design/icons';
import './NewsAccordion.css';

export default function NewsAccordion({ sections, className = '', ariaLabel = 'News sections' }) {
    const defaultOpenKeys = sections
        .filter(section => section.defaultOpen)
        .map(section => section.key);
    const [openKeys, setOpenKeys] = useState(defaultOpenKeys);

    const toggleSection = (key) => {
        setOpenKeys(currentKeys => (
            currentKeys.includes(key)
                ? currentKeys.filter(currentKey => currentKey !== key)
                : [...currentKeys, key]
        ));
    };

    return (
        <section className={`news-accordion ${className}`.trim()} aria-label={ariaLabel}>
            {sections.map(section => {
                const isOpen = openKeys.includes(section.key);
                const panelId = `news-accordion-panel-${section.key}`;
                const buttonId = `news-accordion-button-${section.key}`;
                const Icon = isOpen ? DownOutlined : RightOutlined;

                return (
                    <article
                        key={section.key}
                        className={`news-accordion-item${isOpen ? ' is-open' : ''}${section.tone ? ` news-accordion-item--${section.tone}` : ''}`}
                    >
                        <button
                            id={buttonId}
                            className="news-accordion-trigger"
                            type="button"
                            aria-expanded={isOpen}
                            aria-controls={panelId}
                            onClick={() => toggleSection(section.key)}
                        >
                            <span className="news-accordion-copy">
                                <span className="news-accordion-title">{section.title}</span>
                                {section.description && (
                                    <span className="news-accordion-description">{section.description}</span>
                                )}
                            </span>
                            <Icon className="news-accordion-chevron" aria-hidden="true" />
                        </button>

                        {isOpen && (
                            <div
                                id={panelId}
                                className="news-accordion-panel"
                                role="region"
                                aria-labelledby={buttonId}
                            >
                                {section.renderContent()}
                            </div>
                        )}
                    </article>
                );
            })}
        </section>
    );
}
