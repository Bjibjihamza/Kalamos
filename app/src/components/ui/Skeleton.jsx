import React from 'react';

export default function Skeleton({ height = 18, width = '100%', radius = 6 }) {
  return (
    <span
      className="skeleton"
      style={{ height, width, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}
