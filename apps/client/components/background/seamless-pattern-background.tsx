"use client";

import React, { memo, useId, useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";

const AVAILABLE_ICONS = [
  "BuildingComplex",
  "Building",
  "House",
  "Store",
  "Factory",
  "Warehouse",
  "Hotel",
  "Car",
  "Van",
  "ShipCargo",
  "CarFront",
  "CarTaxiFront",
  "Motorbike",
  "Bus",
  "Tractor",
  "Helicopter",
  "BusFront",
  "Trailer",
] as const;

interface SeamlessPatternProps {
  gradient: { from: string; to: string; angle?: number };
  tileSize?: number;
  iconsPerTile?: number;
  iconSize?: number;
  iconColor?: string;
  className?: string;
}

export const PATTERN_THEMES = {
  green: {
    gradient: { from: "#30ff79", to: "#bdfcd4", angle: 15 },
    iconColor: "#1a1a1a",
  },
  blue: {
    gradient: { from: "#1e40af", to: "#3b82f6", angle: 135 },
    iconColor: "#ffffff",
  },
  purple: {
    gradient: { from: "#7c3aed", to: "#a78bfa", angle: 45 },
    iconColor: "#ffffff",
  },
  orange: {
    gradient: { from: "#ea580c", to: "#fb923c", angle: 90 },
    iconColor: "#1a1a1a",
  },
  gray: {
    gradient: { from: "#f3f4f6", to: "#e5e7eb", angle: 135 },
    iconColor: "#6b7280",
  },
  dark: {
    gradient: { from: "#1f2937", to: "#374151", angle: 135 },
    iconColor: "#9ca3af",
  },
} as const;

interface GeneratedIcon {
  id: number;
  iconName: (typeof AVAILABLE_ICONS)[number];
  x: number;
  y: number;
  rotate: number;
  opacity: number;
}

const generateGridPositions = (
  tileSize: number,
  iconsPerTile: number,
  iconSize: number,
) => {
  const cols = Math.ceil(Math.sqrt(iconsPerTile));
  const rows = Math.ceil(iconsPerTile / cols);

  const cellWidth = tileSize / cols;
  const cellHeight = tileSize / rows;

  const maxJitterX = cellWidth - iconSize;
  const maxJitterY = cellHeight - iconSize;

  const positions = [];
  for (let i = 0; i < iconsPerTile; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = col * cellWidth + Math.random() * maxJitterX;
    const y = row * cellHeight + Math.random() * maxJitterY;

    positions.push({ x, y });
  }

  return positions;
};

const generateRandomRotation = () => Math.floor(Math.random() * 61) - 30;

export const SeamlessPatternBackground: React.FC<SeamlessPatternProps> = memo(
  ({
    gradient,
    tileSize = 200,
    iconsPerTile = 9,
    iconSize = 24,
    iconColor = "#1a1a1a",
    className = "",
  }) => {
    const uniqueId = useId();
    const gradientId = `grad-${uniqueId}`;
    const patternId = `pat-${uniqueId}`;
    const angle = gradient.angle || 135;

    const [icons, setIcons] = useState<GeneratedIcon[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);

      const positions = generateGridPositions(tileSize, iconsPerTile, iconSize);

      const generatedIcons: GeneratedIcon[] = Array.from(
        { length: iconsPerTile },
        (_, index) => {
          const randomIconName =
            AVAILABLE_ICONS[Math.floor(Math.random() * AVAILABLE_ICONS.length)];

          return {
            id: index,
            iconName: randomIconName,
            x: positions[index].x,
            y: positions[index].y,
            rotate: generateRandomRotation(),
            opacity: 0.1 + Math.random() * 0.15,
          };
        },
      );

      setIcons(generatedIcons);
    }, [tileSize, iconSize, iconsPerTile]);

    if (!isMounted) {
      return (
        <svg
          className={`absolute inset-0 w-full h-full ${className}`}
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
              gradientTransform={`rotate(${angle})`}
            >
              <stop offset="0%" stopColor={gradient.from} />
              <stop offset="100%" stopColor={gradient.to} />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${gradientId})`} />
        </svg>
      );
    }

    return (
      <svg
        className={`absolute inset-0 w-full h-full ${className}`}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
            gradientTransform={`rotate(${angle})`}
          >
            <stop offset="0%" stopColor={gradient.from} />
            <stop offset="100%" stopColor={gradient.to} />
          </linearGradient>

          <pattern
            id={patternId}
            x="0"
            y="0"
            width={tileSize}
            height={tileSize}
            patternUnits="userSpaceOnUse"
          >
            {icons.map((icon) => {
              const IconComponent = LucideIcons[
                icon.iconName
              ] as React.ComponentType<any>;
              if (!IconComponent) return null;

              return (
                <g
                  key={icon.id}
                  transform={`translate(${icon.x}, ${icon.y}) rotate(${icon.rotate}, ${iconSize / 2}, ${iconSize / 2})`}
                  opacity={icon.opacity}
                >
                  <IconComponent
                    size={iconSize}
                    strokeWidth={1.5}
                    color={iconColor}
                  />
                </g>
              );
            })}
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill={`url(#${gradientId})`} />
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    );
  },
);
