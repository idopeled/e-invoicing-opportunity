'use client'

import { motion } from 'framer-motion'

interface ProgressChartProps {
  data: Array<{
    label: string
    value: number
    color: string
  }>
}

export function ProgressChart({ data }: ProgressChartProps) {
  const maxValue = Math.max(...data.map(item => item.value))

  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={item.label} className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
            <span className="text-sm text-gray-500">{item.value}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full ${item.color}`}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / maxValue) * 100}%` }}
              transition={{ duration: 1, delay: index * 0.2 }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}