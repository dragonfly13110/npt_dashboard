export default function SmartMapHeader({
  navigate,
  onReset,
  searchQuery,
  onSearchChange,
  searchFocused,
  setSearchFocused,
  suggestions,
  onSelectDistrict,
  onClearSearch,
  controlsOpen,
  setControlsOpen,
}) {
  return (
    <>
      <div className="smart-map-action-group">
        <button className="smart-map-back" onClick={() => navigate('/')}>
          ← กลับหน้าหลัก
        </button>
        <button className="smart-map-reset" onClick={onReset}>
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
              className="smart-map-search-input"
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={onClearSearch}>
                ✕
              </button>
            )}
          </div>
          {searchFocused && suggestions.length > 0 && (
            <ul className="search-suggestions-list">
              {suggestions.map((name) => (
                <li
                  key={name}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onSelectDistrict(name);
                  }}
                  className="search-suggestion-item"
                >
                  📍 อ.{name}
                </li>
              ))}
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
