import { Skeleton } from 'antd';

export default function PageSkeleton() {
    return (
        <div className="page-skeleton">
            {/* Stat Cards Skeleton */}
            <div className="skeleton-stat-row">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="skeleton-stat-card">
                        <div className="skeleton-stat-icon">
                            <Skeleton.Avatar active size={40} shape="square" />
                        </div>
                        <Skeleton active paragraph={{ rows: 1, width: '60%' }} title={{ width: '40%' }} />
                    </div>
                ))}
            </div>

            {/* Table Skeleton */}
            <div className="skeleton-table-card">
                <div className="skeleton-table-header">
                    <Skeleton.Input active size="large" style={{ width: 200 }} />
                    <div className="skeleton-table-actions">
                        <Skeleton.Input active size="default" style={{ width: 120 }} />
                        <Skeleton.Button active size="default" />
                    </div>
                </div>
                <div className="skeleton-table-body">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="skeleton-table-row">
                            <Skeleton active paragraph={false} title={{ width: `${60 + Math.random() * 30}%` }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
