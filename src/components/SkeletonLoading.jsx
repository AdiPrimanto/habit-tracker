import React from 'react'

export default function SkeletonLoading() {
  return (
    <div className="skeleton-container" aria-label="Memuat data habit...">
      {/* Header Skeleton */}
      <div className="skeleton-header">
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-line skeleton-subtitle" />
        <div className="skeleton-card skeleton-progress-card">
          <div className="skeleton-line skeleton-progress-bar" />
        </div>
      </div>

      {/* Search Bar Skeleton */}
      <div className="skeleton-line skeleton-search" />

      {/* Habit Cards Skeleton */}
      <div className="skeleton-list">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-card skeleton-row">
            <div className="skeleton-row-top">
              <div className="skeleton-circle" />
              <div className="skeleton-line skeleton-text" />
              <div className="skeleton-badge" />
            </div>
            <div className="skeleton-week-grid">
              {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                <div key={j} className="skeleton-square" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
