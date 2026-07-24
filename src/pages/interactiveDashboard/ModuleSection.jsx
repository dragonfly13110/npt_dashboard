import { useEffect, useRef, useState } from 'react';

export function ModuleSection({
  id,
  title,
  summary,
  status,
  defaultOpen = false,
  children,
}) {
  const rootRef = useRef(null);
  const [nearViewport, setNearViewport] = useState(defaultOpen);

  useEffect(() => {
    if (nearViewport || !rootRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setNearViewport(true),
      { rootMargin: '500px 0px' }
    );
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, [nearViewport]);

  return (
    <section id={id} ref={rootRef} className="module-section">
      <details open={defaultOpen}>
        <summary>
          <span>
            <h2>{title}</h2>
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
        </summary>
        <div className="module-section-body">
          {nearViewport ? children : <div className="module-skeleton" />}
        </div>
      </details>
    </section>
  );
}
