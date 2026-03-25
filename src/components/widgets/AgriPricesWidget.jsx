import { useState, useMemo } from 'react';
import { LineChartOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useApiCache } from '../../hooks/useApiCache';

async function fetchAgriPrices(category) {
    const pages = [1, 2, 3, 4, 5];
    const promises = pages.map(p => 
        fetch(`/api/nabc/api/daily-prices/category?product_category=${encodeURIComponent(category)}&page=${p}`)
            .then(res => res.json())
            .catch(() => ({ success: false }))
    );
    
    const responses = await Promise.all(promises);
    let allItems = [];
    
    responses.forEach(json => {
        if (json.success && json.data) {
            allItems = allItems.concat(json.data);
        }
    });

    if (allItems.length > 0) {
        const uniqueDates = [...new Set(allItems.map(item => item.data_date))].filter(Boolean);
        uniqueDates.sort((a, b) => new Date(b) - new Date(a));
        return { items: allItems, dates: uniqueDates };
    }
    
    throw new Error("API returned no data");
}

function getMockData(category) {
    const mockDates = [];
    const mockData = [];
    for (let i = 0; i < 3; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        mockDates.push(ds);
        mockData.push({
            data_date: ds,
            product_name: `(ข้อมูลจำลอง) ${category} เกรด A`,
            day_price: 150 - (i * 2), 
            unit: 'บาท/กก.',
            market_name: 'ตลาดนครปฐม',
            province: 'นครปฐม'
        });
        mockData.push({
            data_date: ds,
            product_name: `(ข้อมูลจำลอง) ${category} เกรด B`,
            day_price: 140 - i, 
            unit: 'บาท/กก.',
            market_name: 'ตลาดกลางบางแก้ว',
            province: 'นครปฐม'
        });
        mockData.push({
            data_date: ds,
            product_name: `(ข้อมูลจำลอง) ${category} เกรด A`,
            day_price: 148 - (i * 3), 
            unit: 'บาท/กก.',
            market_name: 'ตลาดกรุงเทพ',
            province: 'กรุงเทพมหานคร'
        });
    }
    return { items: mockData, dates: mockDates };
}

export default function AgriPricesWidget() {
    const allCategories = [
        'กุ้งขาว', 'สับปะรดโรงงาน', 'ข้าวโพดเลี้ยงสัตว์', 'ไก่', 'ยางพารา', 
        'ข้าวหอมมะลิ', 'มะพร้าว', 'ไข่ไก่', 'ปาล์มน้ำมัน', 'ลำไย', 
        'มันสำปะหลัง', 'มะนาว', 'สุกร'
    ];
    const [selectedCategory, setSelectedCategory] = useState('ข้าวหอมมะลิ');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedProvince, setSelectedProvince] = useState('__ALL__');

    const { data: fetchedData, isLoading } = useApiCache(
        ['agri-prices', selectedCategory],
        () => fetchAgriPrices(selectedCategory),
        { staleMinutes: 60, cacheMinutes: 180 }  // ราคาอัปเดตรายวัน → cache 1 ชม.
    );

    // Use fetched data or fallback mock
    const { historyData, availableDates } = useMemo(() => {
        const result = fetchedData || getMockData(selectedCategory);
        return { historyData: result.items, availableDates: result.dates };
    }, [fetchedData, selectedCategory]);

    // Auto-select first date when data changes
    const effectiveDate = selectedDate && availableDates.includes(selectedDate) 
        ? selectedDate 
        : (availableDates[0] || '');

    // Extract unique provinces from all data
    const availableProvinces = useMemo(() => {
        const provinces = [...new Set(historyData.map(item => item.province).filter(Boolean))];
        provinces.sort((a, b) => {
            if (a === 'นครปฐม') return -1;
            if (b === 'นครปฐม') return 1;
            return a.localeCompare(b, 'th');
        });
        return provinces;
    }, [historyData]);

    const getTrend = (currentItem) => {
        const olderItem = historyData.find(old => 
            old.market_name === currentItem.market_name && 
            old.province === currentItem.province && 
            new Date(old.data_date) < new Date(currentItem.data_date)
        );

        if (!olderItem) return { icon: '-', color: '#94a3b8' };
        
        const currentPrice = Number(currentItem.day_price);
        const olderPrice = Number(olderItem.day_price);
        
        if (!isNaN(currentPrice) && !isNaN(olderPrice)) {
            if (currentPrice > olderPrice) return { icon: '▲', color: '#16a34a' };
            if (currentPrice < olderPrice) return { icon: '▼', color: '#dc2626' };
        }
        return { icon: '-', color: '#64748b' };
    };

    const displayedItems = historyData.filter(item => {
        const matchDate = item.data_date === effectiveDate;
        const matchProvince = selectedProvince === '__ALL__' || item.province === selectedProvince;
        return matchDate && matchProvince;
    });

    const provinceCount = displayedItems.length;

    return (
        <div className="widget-box price-widget slide-up-anim" style={{ animationDelay: '0.15s', justifyContent: 'flex-start' }}>
            <div className="widget-header" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="widget-icon bg-green-100 text-green-600"><LineChartOutlined /></div>
                    <h4>ราคาผลผลิตทางการเกษตร</h4>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <select 
                        value={selectedCategory} 
                        onChange={e => setSelectedCategory(e.target.value)}
                        title="หมวดหมู่สินค้า"
                        style={{ 
                            padding: '5px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', 
                            outline: 'none', background: '#f8fafc', color: '#0f172a', 
                            fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', maxWidth: '110px', fontSize: '12px'
                        }}
                    >
                        {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>

                    <select 
                        value={selectedProvince} 
                        onChange={e => setSelectedProvince(e.target.value)}
                        title="เลือกจังหวัด"
                        style={{ 
                            padding: '5px 8px', borderRadius: '8px', border: '1px solid #d8b4fe', 
                            outline: 'none', background: '#faf5ff', color: '#7c3aed', 
                            fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', maxWidth: '110px', fontSize: '12px'
                        }}
                    >
                        <option value="__ALL__">🗺️ ทุกจังหวัด</option>
                        {availableProvinces.map(prov => (
                            <option key={prov} value={prov}>
                                {prov === 'นครปฐม' ? '📍 ' : ''}{prov}
                            </option>
                        ))}
                    </select>
                    
                    <select 
                        value={effectiveDate} 
                        onChange={e => setSelectedDate(e.target.value)}
                        disabled={availableDates.length === 0}
                        title="วันที่"
                        style={{ 
                            padding: '5px 8px', borderRadius: '8px', border: '1px solid #bae6fd', 
                            outline: 'none', background: '#e0f2fe', color: '#0369a1', 
                            fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', maxWidth: '110px', fontSize: '12px'
                        }}
                    >
                        {availableDates.map(date => <option key={date} value={date}>{date}</option>)}
                        {availableDates.length === 0 && <option value="">ไม่มีข้อมูล</option>}
                    </select>
                </div>
            </div>

            {/* Province filter badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <button 
                    onClick={() => setSelectedProvince(selectedProvince === 'นครปฐม' ? '__ALL__' : 'นครปฐม')}
                    style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                        background: selectedProvince === 'นครปฐม' ? 'linear-gradient(135deg, #7c3aed, #a78bfa)' : '#f8fafc',
                        color: selectedProvince === 'นครปฐม' ? '#fff' : '#64748b',
                        border: selectedProvince === 'นครปฐม' ? 'none' : '1px solid #cbd5e1',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: selectedProvince === 'นครปฐม' ? '0 2px 4px rgba(124, 58, 237, 0.25)' : 'none'
                    }}
                >
                    <EnvironmentOutlined />
                    {selectedProvince === 'นครปฐม' ? 'กำลังดูเฉพาะนครปฐม' : 'ดูเฉพาะนครปฐม'}
                </button>
                {selectedProvince !== 'นครปฐม' && selectedProvince !== '__ALL__' && (
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                        (กำลังเลือกดู จ.{selectedProvince})
                    </span>
                )}
                <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>
                    {isLoading ? '' : `พบ ${provinceCount} รายการ`}
                </span>
            </div>
            
            <div className="price-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                {isLoading ? (
                    <div className="skeleton-pulse" style={{ height: '280px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="w-loader">กำลังโหลดข้อมูล {selectedCategory}...</div>
                    </div>
                ) : displayedItems.length > 0 ? (
                    displayedItems.map((item, idx) => {
                        const trend = getTrend(item);
                        return (
                            <div key={idx} className="price-item" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingRight: '12px', gap: '2px' }}>
                                    <span style={{ fontSize: '13px', color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontWeight: '700' }} title={item.product_name || item.product_category}>
                                        {item.product_name || item.product_category}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} title={(item.province ? `จ.${item.province} - ` : '') + (item.market_name || 'ส่วนกลาง')}>
                                        📍 {item.province ? `จ.${item.province} - ` : ''}{item.market_name || 'ส่วนกลาง'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '95px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: trend.color, fontSize: '14px', fontWeight: '900' }}>{trend.icon}</span>
                                        <span style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                                            {isNaN(item.day_price) ? item.day_price : Number(item.day_price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>{item.unit}</span>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div style={{ padding: '30px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', lineHeight: '1.6', maxWidth: '85%', margin: '0 auto' }}>
                            {selectedProvince === 'นครปฐม' 
                                ? `ในนครปฐมไม่มีแหล่งข้อมูลของสำนักงานเศรษฐกิจการเกษตรที่อ้างอิงข้อมูลของสินค้านี้ (${selectedCategory})` 
                                : `ไม่พบรายการราคาสินค้า${selectedProvince !== '__ALL__' ? ` ใน จ.${selectedProvince}` : ''} ในวันที่เลือก`
                            }
                        </div>
                        {selectedProvince !== '__ALL__' && (
                            <button 
                                onClick={() => setSelectedProvince('__ALL__')}
                                style={{ 
                                    marginTop: '16px', padding: '6px 16px', borderRadius: '8px',
                                    border: '1px solid #d8b4fe', background: '#faf5ff', color: '#7c3aed',
                                    fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px'
                                }}
                            >
                                ดูของทุกจังหวัดแทน
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
