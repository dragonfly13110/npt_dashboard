import { useEffect, useRef, useState } from 'react';

export function ModuleSection({
  id,
  title,
  summary,
  status,
  defaultOpen = false,
  active = false,
  children,
}) {
  const rootRef = useRef(null);
  const [nearViewport, setNearViewport] = useState(defaultOpen || active);

  useEffect(() => {
    if (active) {
      setNearViewport(true);
      return undefined;
    }
    if (nearViewport || !rootRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setNearViewport(true),
      { rootMargin: '500px 0px' }
    );
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, [active, nearViewport]);

  return (
    <section
      id={id}
      ref={rootRef}
      className={`module-section${active ? ' module-section-active' : ''}`}
    >
      <details open={defaultOpen || active}>
        <summary>
          <h2>
            <span>
              {title}
              {summary && (
                <>
                  {' '}
                  <small>{summary}</small>
                </>
              )}
            </span>
            {status && (
              <>
                {' '}
                <span className="module-status">{status}</span>
              </>
            )}
          </h2>
        </summary>
        <div className="module-section-body">
          {nearViewport ? children : <div className="module-skeleton" />}
        </div>
      </details>
    </section>
  );
}
