import React from 'react';
import LandingKpiGrid from './LandingKpiGrid';
import LandingKpiCard from './LandingKpiCard';

export default function LandingKpiSkeleton({ count = 4 }) {
  return (
    <LandingKpiGrid>
      {Array.from({ length: count }).map((_, idx) => (
        <LandingKpiCard key={idx} loading={true} />
      ))}
    </LandingKpiGrid>
  );
}
