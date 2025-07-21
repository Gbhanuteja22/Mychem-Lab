'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useState } from 'react'

interface BeakerProps {
  id: string
  contents: string[]
  color: string
  onDrop: (element: string) => void
  size?: 'small' | 'medium' | 'large'
}

export default function Beaker({ id, contents, color, size = 'medium' }: BeakerProps) {
  const [isHovered, setIsHovered] = useState(false)

  const sizeClasses = {
    small: 'w-20 h-24',
    medium: 'w-24 h-32',
    large: 'w-32 h-40'
  }

  const liquidHeight = contents.length > 0 ? Math.min(50 + contents.length * 20, 80) : 0

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      <motion.div
        className="w-full h-full cursor-pointer select-none"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Beaker Container */}
        <div className="relative w-full h-full">
        {/* Beaker Glass */}
        <svg
          viewBox="0 0 100 120"
          className="w-full h-full drop-shadow-lg"
        >
          {/* Glass outline */}
          <path
            d="M20 20 L20 70 Q20 90 40 90 L60 90 Q80 90 80 70 L80 20"
            fill="rgba(200, 230, 255, 0.3)"
            stroke="rgba(100, 150, 200, 0.8)"
            strokeWidth="2"
          />
          
          {/* Liquid */}
          {liquidHeight > 0 && (
            <motion.path
              d={`M20 ${90 - liquidHeight * 0.7} Q20 90 40 90 L60 90 Q80 90 80 ${90 - liquidHeight * 0.7}`}
              fill={color}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ duration: 0.5 }}
            />
          )}
          
          {/* Beaker rim */}
          <rect
            x="15"
            y="18"
            width="70"
            height="4"
            fill="rgba(100, 150, 200, 0.8)"
            rx="2"
          />
          
          {/* Pour spout */}
          <path
            d="M75 18 Q82 18 82 25"
            fill="none"
            stroke="rgba(100, 150, 200, 0.8)"
            strokeWidth="2"
          />
        </svg>

        {/* Bubbles animation when contents are added */}
        {contents.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white rounded-full opacity-50"
                style={{
                  left: `${30 + i * 15}%`,
                  bottom: '20%'
                }}
                animate={{
                  y: [-20, -40, -20],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3
                }}
              />
            ))}
          </div>
        )}

        {/* Hover label */}
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap"
          >
            {contents.length > 0 ? contents.join(' + ') : 'Chemical beaker'}
          </motion.div>
        )}

        {/* Contents label */}
        {contents.length > 0 && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-center text-gray-600">
            {contents.length} element{contents.length > 1 ? 's' : ''}
          </div>
        )}
        </div>
      </motion.div>
    </div>
  );
}
