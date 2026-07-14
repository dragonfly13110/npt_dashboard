import { useState } from 'react';

export default function SmartMapHeader({
  navigate,
  onReset,
  searchQuery,
  onSearchChange,
  searchFocused,
  setSearchFocused,
  suggestions,
  onSelectSuggestion,
  onClearSearch,
  controlsOpen,
  setControlsOpen,
}) {
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const selectSuggestion = (suggestion) => {
    if (suggestion) onSelectSuggestion(suggestion);
    setActiveSuggestion(-1);
  };
  const handleKeyDown = (event) => {
    if (!suggestions.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestion((current) =>
        event.key === 'ArrowDown'
          ? (current + 1) % suggestions.length
          : (current - 1 + suggestions.length) % suggestions.length
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectSuggestion(suggestions[activeSuggestion] || suggestions[0]);
    } else if (event.key === 'Escape') {
      setActiveSuggestion(-1);
      setSearchFocused(false);
    }
  };
  return (
    <>
      <div className="smart-map-action-group">
        <button
          className="smart-map-back"
          onClick={() => navigate('/')}
          aria-label="กลับหน้าหลัก"
        >
          ← กลับหน้าหลัก
        </button>
        <button
          className="smart-map-reset"
          onClick={onReset}
          aria-label="รีเซ็ตมุมมองแผนที่"
        >
          🔄 รีเซ็ตมุมมอง
        </button>
        <div
          className="smart-map-search-container"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="ค้นหาอำเภอในนครปฐม..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 250)}
              onKeyDown={handleKeyDown}
              aria-label="ค้นหาอำเภอ ตำบล หรือจุดข้อมูล"
              aria-autocomplete="list"
              aria-controls="smart-map-search-results"
              className="smart-map-search-input"
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={onClearSearch}
                aria-label="ล้างคำค้นหา"
              >
                ✕
              </button>
            )}
          </div>
          {searchFocused && suggestions.length > 0 && (
            <ul
              id="smart-map-search-results"
              className="search-suggestions-list"
              role="listbox"
            >
              {suggestions.map((suggestion, index) => {
                const name = suggestion.label;
                return (
                  <li
                    key={suggestion.id}
                    role="option"
                    aria-selected={activeSuggestion === index}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      selectSuggestion(suggestion);
                    }}
                    className={`search-suggestion-item ${activeSuggestion === index ? 'active' : ''}`}
                  >
                    📍 อ.{name}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <div className="smart-map-title">
        <span className="smart-map-title-icon">🗺️</span>
        <span className="smart-map-title-text">แผนที่นครปฐมอัจฉริยะ</span>
        <span className="smart-map-title-sub">Smart Agri Map</span>
      </div>
      <button
        className={`smart-map-controls-toggle ${controlsOpen ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setControlsOpen((current) => !current);
        }}
        title="ตัวเลือกแผนที่"
      >
        {controlsOpen ? '✕' : '🥞 เลเยอร์'}
      </button>
      {controlsOpen && (
        <div
          className="smart-map-controls-backdrop"
          onClick={(e) => {
            e.stopPropagation();
            setControlsOpen(false);
          }}
        />
      )}
    </>
  );
}
