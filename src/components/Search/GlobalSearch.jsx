import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Input, Spin, Empty, Tag, Tooltip } from 'antd';
import {
  SearchOutlined,
  RightOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  globalSearch,
  getRecentSearches,
  clearRecentSearches,
} from '../../services/globalSearchService';
import { useAuth } from '../../contexts/AuthContext';

// Group color mapping
const GROUP_COLORS = {
  กลุ่มยุทธศาสตร์และสารสนเทศ: '#0969da',
  กลุ่มส่งเสริมและพัฒนาการผลิต: '#1a7f37',
  กลุ่มส่งเสริมและพัฒนาเกษตรกร: '#8250df',
  กลุ่มอารักขาพืช: '#cf222e',
};

// Suggested searches for empty state
const SEARCH_SUGGESTIONS = [
  'กำแพงแสน',
  'ข้าว',
  'GAP',
  'แปลงใหญ่',
  'วิสาหกิจ',
  'Smart Farmer',
  'ศพก',
  'สามพราน',
];

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default function GlobalSearch({ collapsed = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const navigate = useNavigate();
  const { role } = useAuth();
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  // Load recent searches
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Ctrl+K global shortcut
  useEffect(() => {
    function handleGlobalKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      // ESC to close
      if (e.key === 'Escape' && open) {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        // Also check portal dropdown
        const dropdown = document.getElementById('global-search-portal');
        if (dropdown && dropdown.contains(e.target)) return;
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate dropdown position for portal
  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 380),
    });
  }, []);

  useEffect(() => {
    if (open) updateDropdownPosition();
  }, [open, updateDropdownPosition]);

  const handleSearch = useCallback(
    (value) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!value || value.trim().length < 2) {
        setResults([]);
        if (value === '') setOpen(true); // show recent on clear
        return;
      }

      setOpen(true);
      setLoading(true);

      debounceRef.current = setTimeout(async () => {
        try {
          const data = await globalSearch(value, 5, role);
          setResults(data);
          setRecentSearches(getRecentSearches());
        } catch (err) {
          console.error('Global search error:', err);
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [role]
  );

  const handleResultClick = (tableResult) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    navigate(tableResult.route);
  };

  const handleViewAll = () => {
    if (!query.trim()) return;
    setOpen(false);
    navigate(`/dashboard/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleRecentClick = (term) => {
    setQuery(term);
    handleSearch(term);
  };

  const handleClearRecent = (e) => {
    e.stopPropagation();
    clearRecentSearches();
    setRecentSearches([]);
  };

  const handleSuggestionClick = (term) => {
    setQuery(term);
    handleSearch(term);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim().length >= 2) {
      handleViewAll();
    }
  };

  const handleFocus = () => {
    setRecentSearches(getRecentSearches());
    setOpen(true);
    updateDropdownPosition();
  };

  const totalResults = results.reduce((sum, r) => sum + r.totalCount, 0);
  const showRecent = !query && recentSearches.length > 0;
  const showSuggestions = !query && recentSearches.length === 0;
  const showResults = query.trim().length >= 2;

  // Collapsed mode: just show a search icon button
  if (collapsed) {
    return (
      <Tooltip title="ค้นหา (Ctrl+K)" placement="right">
        <div
          className="sidebar-search-collapsed"
          onClick={() => inputRef.current?.focus()}
        >
          <SearchOutlined style={{ fontSize: 18, color: '#8b949e' }} />
        </div>
      </Tooltip>
    );
  }

  // Dropdown content rendered via Portal to avoid overflow clipping
  const dropdownContent = open && (
    <div
      id="global-search-portal"
      className="global-search-dropdown"
      style={{
        position: 'fixed',
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        zIndex: 9999,
      }}
    >
      {/* Loading */}
      {loading && (
        <div className="global-search-loading">
          <Spin size="small" />
          <span>กำลังค้นหา...</span>
        </div>
      )}

      {/* Recent searches */}
      {!loading && showRecent && (
        <div className="global-search-recent">
          <div className="global-search-section-header">
            <span>
              <ClockCircleOutlined /> ค้นหาล่าสุด
            </span>
            <span className="recent-clear" onClick={handleClearRecent}>
              <DeleteOutlined /> ล้าง
            </span>
          </div>
          <div className="global-search-tags">
            {recentSearches.map((term) => (
              <Tag
                key={term}
                className="search-tag"
                onClick={() => handleRecentClick(term)}
              >
                {term}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions (first time) */}
      {!loading && showSuggestions && (
        <div className="global-search-recent">
          <div className="global-search-section-header">
            <span>
              <SearchOutlined /> ลองค้นหา
            </span>
          </div>
          <div className="global-search-tags">
            {SEARCH_SUGGESTIONS.map((term) => (
              <Tag
                key={term}
                className="search-tag"
                onClick={() => handleSuggestionClick(term)}
              >
                {term}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {!loading && showResults && results.length === 0 && (
        <div className="global-search-empty">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <div>ไม่พบข้อมูลสำหรับ &quot;{query}&quot;</div>
                <div style={{ fontSize: 11, color: '#8b949e', marginTop: 4 }}>
                  ลองค้นหา: {SEARCH_SUGGESTIONS.slice(0, 4).join(', ')}
                </div>
              </div>
            }
            style={{ margin: '16px 0' }}
          />
        </div>
      )}

      {/* Results */}
      {!loading && showResults && results.length > 0 && (
        <>
          <div className="global-search-header">
            <DatabaseOutlined />
            <span>
              พบ <strong>{totalResults.toLocaleString()}</strong> รายการ จาก{' '}
              <strong>{results.length}</strong> ตาราง
            </span>
            <button
              type="button"
              className="global-search-view-all"
              onClick={handleViewAll}
            >
              <SearchOutlined /> ดูทั้งหมด
            </button>
          </div>

          <div className="global-search-results">
            {results.map((tableResult) => (
              <div key={tableResult.table} className="global-search-group">
                <div
                  className="global-search-group-header"
                  onClick={() => handleResultClick(tableResult)}
                >
                  <div className="group-left">
                    <span className="group-icon">{tableResult.icon}</span>
                    <span className="group-label">{tableResult.label}</span>
                    <Tag
                      color={GROUP_COLORS[tableResult.group] || '#8b949e'}
                      style={{
                        fontSize: 10,
                        lineHeight: '16px',
                        padding: '0 4px',
                        marginLeft: 4,
                      }}
                    >
                      {tableResult.totalCount}
                    </Tag>
                  </div>
                  <RightOutlined style={{ fontSize: 10, color: '#8b949e' }} />
                </div>

                <div className="global-search-items">
                  {tableResult.results.slice(0, 3).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="global-search-item"
                      onClick={() => handleResultClick(tableResult)}
                    >
                      <div className="item-title">
                        {highlightMatch(item.title, query)}
                      </div>
                      {item.subtitle && (
                        <div className="item-subtitle">{item.subtitle}</div>
                      )}
                    </div>
                  ))}
                  {tableResult.totalCount > 3 && (
                    <div
                      className="global-search-more"
                      onClick={() => handleResultClick(tableResult)}
                    >
                      +{tableResult.totalCount - 3} รายการเพิ่มเติม →
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Keyboard hint */}
      <div className="global-search-hint">
        <span>
          <kbd>Enter</kbd> ดูทั้งหมด
        </span>
        <span>
          <kbd>Esc</kbd> ปิด
        </span>
        <span>
          <kbd>Ctrl+K</kbd> เปิดค้นหา
        </span>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="global-search-container">
      <Input
        ref={inputRef}
        prefix={
          <SearchOutlined style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
        }
        suffix={
          !query && (
            <span className="search-shortcut-badge">
              <kbd>⌘K</kbd>
            </span>
          )
        }
        placeholder="ค้นหาข้อมูลหลัก..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        allowClear={{
          clearIcon: (
            <CloseOutlined style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
          ),
        }}
        className="global-search-input"
      />

      {/* Portal dropdown — avoids sidebar overflow clipping */}
      {createPortal(dropdownContent || <></>, document.body)}
    </div>
  );
}

function highlightMatch(text, query) {
  if (!text || !query) return text;
  const str = String(text);
  const escapedQuery = escapeRegex(query);

  // Split by query case-insensitive
  const parts = str.split(new RegExp(`(${escapedQuery})`, 'gi'));
  if (parts.length === 1) return str;

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            style={{
              backgroundColor: '#ffec3d',
              color: '#000',
              padding: '0 4px',
              borderRadius: '4px',
              fontWeight: 600,
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
