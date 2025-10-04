"use client";

import React, { useState, useEffect } from "react";

export default function StarfieldBackground() {
  const [stars, setStars] = useState<React.ReactElement[]>([]);

  // Generate random stars only on client side to avoid hydration mismatch
  const generateStars = (count: number, keyPrefix: string) => {
    return Array.from({ length: count }, (_, i) => {
      const size = Math.random() * 3 + 1; // 1-4px stars
      const animationDelay = Math.random() * 2; // 0-2s delay
      const duration = Math.random() * 3 + 2; // 2-5s duration

      return (
        <div
          key={`${keyPrefix}-${i}`}
          className="absolute bg-starWhite rounded-full animate-twinkle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${size}px`,
            height: `${size}px`,
            animationDelay: `${animationDelay}s`,
            animationDuration: `${duration}s`,
          }}
        />
      );
    });
  };

  useEffect(() => {
    // Generate all stars on client side only
    const largeStars = generateStars(50, "large");
    const mediumStars = generateStars(100, "medium");
    const smallStars = generateStars(200, "small");

    setStars([...largeStars, ...mediumStars, ...smallStars]);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Nebula gradient overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-space-nebula-start/20 via-space-nebula-middle/10 to-space-nebula-end/20 animate-nebula"
        style={{
          backgroundSize: "400% 400%",
        }}
      />

      {/* Stars - only render after client hydration */}
      <div className="absolute inset-0">{stars}</div>

      {/* Shooting star effect */}
      <div className="absolute inset-0">
        <div
          className="absolute w-1 h-1 bg-neonCyan rounded-full"
          style={{
            left: "10%",
            top: "20%",
            boxShadow: "0 0 10px #22D3EE, 2px 2px 20px #22D3EE",
            animation: "float 4s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-1 h-1 bg-meteorOrange rounded-full"
          style={{
            left: "80%",
            top: "60%",
            boxShadow: "0 0 8px #F97316, 2px 2px 15px #F97316",
            animation: "float 3s ease-in-out infinite reverse",
          }}
        />
      </div>
    </div>
  );
}
