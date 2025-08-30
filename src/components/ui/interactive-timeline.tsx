'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

interface TimelineItem {
  phase: string
  title: string
  description: string
  timeline: string
  color: string
}

interface InteractiveTimelineProps {
  items: TimelineItem[]
}

export function InteractiveTimeline({ items }: InteractiveTimelineProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gray-300 transform md:-translate-x-1/2" />

      <div className="space-y-8">
        {items.map((item, index) => (
          <motion.div
            key={index}
            className={`relative flex items-center cursor-pointer ${
              index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
            }`}
            onClick={() => setActiveIndex(index)}
            whileHover={{ scale: 1.02 }}
          >
            {/* Timeline Dot */}
            <motion.div
              className={`absolute left-4 md:left-1/2 w-4 h-4 rounded-full border-4 border-white shadow-lg transform md:-translate-x-1/2 ${
                activeIndex === index ? item.color : 'bg-gray-300'
              }`}
              animate={{
                scale: activeIndex === index ? 1.2 : 1,
                backgroundColor: activeIndex === index ? undefined : '#d1d5db'
              }}
              transition={{ duration: 0.3 }}
            />

            {/* Content Card */}
            <motion.div
              className={`ml-12 md:ml-0 md:w-5/12 ${
                index % 2 === 0 ? 'md:mr-8' : 'md:ml-8'
              }`}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              animate={{ 
                opacity: 1, 
                x: 0,
                backgroundColor: activeIndex === index ? '#f8fafc' : '#ffffff'
              }}
              transition={{ delay: index * 0.1 }}
            >
              <div className={`p-6 rounded-lg shadow-md border-l-4 ${
                activeIndex === index ? `border-${item.color.split('-')[1]}-500` : 'border-gray-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium px-2 py-1 rounded ${
                    activeIndex === index ? `bg-${item.color.split('-')[1]}-100 text-${item.color.split('-')[1]}-800` : 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.phase}
                  </span>
                  <span className="text-sm text-gray-500">{item.timeline}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {item.title}
                </h3>
                <motion.p 
                  className="text-gray-600"
                  animate={{
                    opacity: activeIndex === index ? 1 : 0.7
                  }}
                >
                  {item.description}
                </motion.p>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}