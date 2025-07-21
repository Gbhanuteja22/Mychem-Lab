'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface ElementProps {
  symbol: string
  name: string
  color: string
  safetyLevel: 'safe' | 'caution' | 'dangerous'
  atomicNumber: number
}

export default function Element({ symbol, name, color, safetyLevel, atomicNumber }: ElementProps) {
  const handleClick = () => {
    console.log('Element clicked:', name, symbol)
  }

  const safetyColors = {
    safe: 'border-green-400 bg-green-50',
    caution: 'border-yellow-400 bg-yellow-50',
    dangerous: 'border-red-400 bg-red-50'
  }

  const safetyIcons = {
    safe: '✓',
    caution: '⚠',
    dangerous: '⚠'
  }

  return (
    <motion.div
      onClick={handleClick}
      className={`
        relative w-20 h-20 rounded-xl border-2 cursor-pointer
        ${safetyColors[safetyLevel]} 
        hover:shadow-lg transition-all duration-200 select-none p-2
      `}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Atomic Number */}
      <div className="absolute top-1 left-1 text-xs text-gray-500">
        {atomicNumber}
      </div>
      
      {/* Safety indicator */}
      <div className={`absolute top-1 right-1 text-xs ${
        safetyLevel === 'safe' ? 'text-green-600' : 
        safetyLevel === 'caution' ? 'text-yellow-600' : 'text-red-600'
      }`}>
        {safetyIcons[safetyLevel]}
      </div>
      
      {/* Element Symbol */}
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div 
            className="text-2xl font-bold mb-1"
            style={{ color: color === 'colorless' ? '#666' : color }}
          >
            {symbol}
          </div>
        </div>
      </div>
      
      {/* Element Name */}
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-center text-gray-600 whitespace-nowrap">
        {name}
      </div>
      
      {/* Visual element representation */}
      <div 
        className="absolute inset-2 rounded-lg opacity-20"
        style={{ 
          backgroundColor: color === 'colorless' ? '#ddd' : color,
          border: `1px solid ${color === 'colorless' ? '#ccc' : color}`
        }}
      />
    </motion.div>
  )
}
