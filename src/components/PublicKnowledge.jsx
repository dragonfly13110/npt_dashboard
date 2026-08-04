import './PublicKnowledge.css';

export function KnowledgeStats({
  items = [],
  tone = 'farmer',
  ariaLabel = 'ขอบเขตคลังความรู้',
  className = '',
}) {
  if (!items.length) return null;

  return (
    <section
      className={`public-knowledge-stats public-knowledge-stats--${tone} ${className}`.trim()}
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <div className="public-knowledge-stat" key={item.label}>
          <span className="public-knowledge-stat-icon" aria-hidden="true">
            {item.icon}
          </span>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </section>
  );
}

export function KnowledgeSectionHeading({ kicker, title, count, titleId }) {
  return (
    <div className="public-knowledge-section-heading">
      <div>
        <span className="public-knowledge-section-kicker">{kicker}</span>
        <h2 id={titleId}>{title}</h2>
      </div>
      {count ? (
        <span className="public-knowledge-result-count">{count}</span>
      ) : null}
    </div>
  );
}
