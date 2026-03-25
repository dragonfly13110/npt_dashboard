import { useEffect, useState } from 'react';
import { LineChartOutlined } from '@ant-design/icons';

export default function AgriPricesWidget() {
    const allCategories = [
        'กุ้งขาว', 'สับปะรดโรงงาน', 'ข้าวโพดเลี้ยงสัตว์', 'ไก่', 'ยางพารา', 
        'ข้าวหอมมะลิ', 'มะพร้าว', 'ไข่ไก่', 'ปาล์มน้ำมัน', 'ลำไย', 
        'มันสำปะหลัง', 'มะนาว', 'สุกร'
    ];
    const [selectedCategory, setSelectedCategory] = useState('ข้าวหอมมะลิ');
    const [selectedDate, setSelectedDate] = useState('');
    const [availableDates, setAvailableDates] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const pages = [1, 2, 3];
                const promises = pages.map(p => 
                    fetch(`/api/nabc/api/daily-prices/category?product_category=${encodeURIComponent(selectedCategory)}&page=${p}`)
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
                    setHistoryData(allItems);
                    const uniqueDates = [...new Set(allItems.map(item => item.data_date))].filter(Boolean);
                    uniqueDates.sort((a, b) => new Date(b) - new Date(a));
                    setAvailableDates(uniqueDates);
                    setSelectedDate(uniqueDates[0] || '');
                } else {
                    throw new Error("API returned no data or failed silently.");
                }
            } catch (error) {
                console.error("Fetch NABC History Error or Blocked:", error);
                const mockDates = [];
                const mockData = [];
                for(let i=0; i<3; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const ds = d.toISOString().split('T')[0];
                    mockDates.push(ds);
                    mockData.push({
                        data_date: ds,
                        product_name: `(ข้อมูลจำลอง) ${selectedCategory} เกรด A`,
                        day_price: 150 - (i * 2), 
                        unit: 'บาท/กก.',
                        market_name: 'ติดปัญหา CORS (บนเซิร์ฟเวอร์จริง)',
                        province: 'ส่วนกลาง'
                    });
                    mockData.push({
                        data_date: ds,
                        product_name: `(ข้อมูลจำลอง) ${selectedCategory} เกรด B`,
                        day_price: 140 - i, 
                        unit: 'บาท/กก.',
                        market_name: 'รอกำหนดค่า Proxy',
                        province: 'ระบบ'
                    });
                }
                setHistoryData(mockData);
                setAvailableDates(mockDates);
                setSelectedDate(mockDates[0]);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [selectedCategory]);

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

    const displayedItems = historyData.filter(item => item.data_date === selectedDate);

    return (
        <div className="widget-box price-widget slide-up-anim" style={{ animationDelay: '0.15s', justifyContent: 'flex-start' }}>
            <div className="widget-header" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="widget-icon bg-green-100 text-green-600"><LineChartOutlined /></div>
                    <h4>ราคาผลผลิตทางการเกษตร</h4>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <select 
                        value={selectedCategory} 
                        onChange={e => setSelectedCategory(e.target.value)}
                        title="หมวดหมู่สินค้า"
                        style={{ 
                            padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', 
                            outline: 'none', background: '#f8fafc', color: '#0f172a', 
                            fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', maxWidth: '120px'
                        }}
                    >
                        {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    
                    <select 
                        value={selectedDate} 
                        onChange={e => setSelectedDate(e.target.value)}
                        disabled={availableDates.length === 0}
                        title="วันที่"
                        style={{ 
                            padding: '6px 10px', borderRadius: '8px', border: '1px solid #bae6fd', 
                            outline: 'none', background: '#e0f2fe', color: '#0369a1', 
                            fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', maxWidth: '120px'
                        }}
                    >
                        {availableDates.map(date => <option key={date} value={date}>{date}</option>)}
                        {availableDates.length === 0 && <option value="">ไม่มีข้อมูล</option>}
                    </select>
                </div>
            </div>
            
            <div className="price-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                {loading ? (
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
                    <div className="w-loader" style={{ padding: '30px 0' }}>ไม่พบรายการราคาสินค้าในวันที่เลือก</div>
                )}
            </div>
        </div>
    );
}
