'use client'

import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ProgressChart } from '@/components/ui/progress-chart'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { InteractiveTimeline } from '@/components/ui/interactive-timeline'

export default function OpportunityPage() {
  const [activeSection, setActiveSection] = useState(0)
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({})

  const sections = [
    'transformation',
    'opportunity', 
    'problem',
    'solution',
    'strategy',
    'revenue',
    'advantage',
    'pivot'
  ]

  const toggleDetails = (key: string) => {
    setShowDetails(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="pt-20 pb-16 px-4 text-center"
      >
        <motion.h1 
          className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          E-Invoicing Revolution
        </motion.h1>
        <motion.p 
          className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          The Next Big Opportunity - From OCR Processing to Global E-Invoicing Platform
        </motion.p>
      </motion.section>

      {/* Navigation Dots */}
      <div className="fixed right-8 top-1/2 transform -translate-y-1/2 z-50 hidden md:block">
        <div className="flex flex-col space-y-2">
          {sections.map((section, index) => (
            <button
              key={section}
              onClick={() => setActiveSection(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                activeSection === index ? 'bg-blue-600 scale-125' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Transformation Section */}
      <AnimatedSection id="transformation" title="The Transformation">
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div 
            className="bg-red-50 p-6 rounded-lg border border-red-200"
            whileHover={{ scale: 1.02 }}
          >
            <h3 className="text-xl font-semibold text-red-800 mb-4">Current State</h3>
            <p className="text-red-700">
              Businesses rely on OCR tools to digitize paper invoices - a time-consuming, 
              error-prone process that we&apos;ve solved with InvoiceOCR.
            </p>
          </motion.div>
          <motion.div 
            className="bg-green-50 p-6 rounded-lg border border-green-200"
            whileHover={{ scale: 1.02 }}
          >
            <h3 className="text-xl font-semibold text-green-800 mb-4">Future State</h3>
            <p className="text-green-700">
              E-invoicing mandates are rolling out globally, making paper invoices obsolete. 
              By 2027, most developed countries will require structured electronic invoices.
            </p>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Market Opportunity */}
      <AnimatedSection id="opportunity" title="Market Opportunity">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: '$18.6B Market', desc: 'Global e-invoicing market by 2027', color: 'blue', value: 18.6 },
            { title: '60+ Countries', desc: 'Implementing e-invoicing mandates', color: 'green', value: 60 },
            { title: 'Universal Need', desc: 'Every business needs compliance', color: 'purple', value: 100 },
            { title: 'First-Mover', desc: 'Early adoption creates leadership', color: 'orange', value: 75 }
          ].map((item, index) => (
            <motion.div
              key={index}
              className={`bg-${item.color}-50 p-6 rounded-lg border border-${item.color}-200 text-center relative overflow-hidden`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <motion.div 
                className={`absolute inset-0 bg-gradient-to-br from-${item.color}-100 to-transparent opacity-0`}
                whileHover={{ opacity: 1 }}
              />
              <div className="relative z-10">
                <h3 className={`text-2xl font-bold text-${item.color}-800 mb-2`}>
                  {item.title.includes('$') ? (
                    <><AnimatedCounter value={item.value} prefix="$" suffix="B" /> Market</>
                  ) : item.title.includes('+') ? (
                    <><AnimatedCounter value={item.value} suffix="+" /> Countries</>
                  ) : (
                    item.title
                  )}
                </h3>
                <p className={`text-${item.color}-600`}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Market Growth Chart */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-center">Market Adoption Timeline</h3>
          <ProgressChart data={[
            { label: '2024 - Early Adopters', value: 25, color: 'bg-blue-500' },
            { label: '2025 - Regulatory Push', value: 45, color: 'bg-green-500' },
            { label: '2026 - Mass Adoption', value: 75, color: 'bg-purple-500' },
            { label: '2027 - Market Maturity', value: 95, color: 'bg-orange-500' }
          ]} />
        </div>
      </AnimatedSection>

      {/* The Problem */}
      <AnimatedSection id="problem" title="The Problem E-Invoicing Creates">
        <div className="space-y-4">
          {[
            { title: 'Format Complexity', desc: 'Multiple standards (UBL, CII, Peppol, country-specific)' },
            { title: 'Integration Nightmare', desc: 'ERP systems need costly upgrades' },
            { title: 'Compliance Burden', desc: 'Real-time validation, digital signatures, tax reporting' },
            { title: 'SME Accessibility', desc: 'Small businesses can&apos;t afford enterprise solutions' }
          ].map((problem, index) => (
            <motion.div
              key={index}
              className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{problem.title}</h3>
              <p className="text-gray-600">{problem.desc}</p>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* Solution - InvoiceFlow */}
      <AnimatedSection id="solution" title="Proposed App: InvoiceFlow" className="bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="text-center mb-8">
          <motion.div
            className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full text-xl font-semibold"
            whileHover={{ scale: 1.05 }}
          >
&quot;The Shopify of E-Invoicing&quot;
          </motion.div>
          <p className="text-lg text-gray-600 mt-4">Making global e-invoicing as simple as sending an email</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'Universal Format Engine',
              features: ['Auto-convert between 20+ standards', 'Real-time compliance validation', 'Smart field mapping with AI'],
              icon: '🔄'
            },
            {
              title: 'No-Code Integration Hub',
              features: ['Connect any ERP/accounting system', 'Pre-built connectors', 'Visual workflow builder'],
              icon: '🔌'
            },
            {
              title: 'Compliance Autopilot',
              features: ['Automatic tax calculations', 'Digital signature orchestration', 'Real-time government reporting'],
              icon: '⚡'
            },
            {
              title: 'SME-First Design',
              features: ['Freemium model', 'Mobile-first creation', 'One-click marketplace integration'],
              icon: '🎯'
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              className="bg-white p-6 rounded-lg shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.03, y: -5 }}
            >
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold mb-3">{feature.title}</h3>
              <ul className="space-y-2">
                {feature.features.map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* Go-to-Market Strategy */}
      <AnimatedSection id="strategy" title="Go-to-Market Strategy" className="bg-gray-50">
        <InteractiveTimeline items={[
          {
            phase: 'Phase 1',
            title: 'Target SMEs in Early-Mandate Countries',
            description: 'Focus on Italy, Mexico, Brazil where e-invoicing is already mandatory but solutions are expensive and complex',
            timeline: '0-6 months',
            color: 'bg-blue-500'
          },
          {
            phase: 'Phase 2', 
            title: 'Enterprise Features & Multi-Country Expansion',
            description: 'Add advanced features for larger organizations and expand to EU countries with upcoming mandates',
            timeline: '6-18 months',
            color: 'bg-green-500'
          },
          {
            phase: 'Phase 3',
            title: 'Marketplace Integrations & Embedded Solutions',
            description: 'Partner with e-commerce platforms, ERPs, and accounting software for embedded e-invoicing',
            timeline: '18+ months',
            color: 'bg-purple-500'
          }
        ]} />
      </AnimatedSection>

      {/* Revenue Model */}
      <AnimatedSection id="revenue" title="Revenue Model">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Freemium', desc: 'Free tier drives adoption', price: '$0', detail: '50 invoices/month' },
            { title: 'SaaS Subscriptions', desc: 'Volume-based pricing', price: '$29-299', detail: 'Per month' },
            { title: 'Enterprise', desc: 'Custom implementations', price: 'Custom', detail: 'Large organizations' },
            { title: 'API Revenue', desc: 'Usage-based integrations', price: 'Per call', detail: 'Developer ecosystem' }
          ].map((model, index) => (
            <motion.div
              key={index}
              className="bg-white p-6 rounded-lg shadow-md text-center cursor-pointer"
              whileHover={{ scale: 1.05, shadow: '0 10px 25px rgba(0,0,0,0.1)' }}
              onClick={() => toggleDetails(`revenue-${index}`)}
            >
              <h3 className="text-lg font-semibold mb-2">{model.title}</h3>
              <div className="text-2xl font-bold text-blue-600 mb-2">{model.price}</div>
              <p className="text-gray-600 text-sm mb-2">{model.desc}</p>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ 
                  opacity: showDetails[`revenue-${index}`] ? 1 : 0,
                  height: showDetails[`revenue-${index}`] ? 'auto' : 0
                }}
                className="text-blue-500 text-sm"
              >
                {model.detail}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* Competitive Advantage */}
      <AnimatedSection id="advantage" title="Competitive Advantage" className="bg-gradient-to-r from-indigo-50 to-cyan-50">
        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              category: 'Technical Excellence',
              advantages: [
                { title: 'Format-Agnostic Platform', desc: 'vs. single-standard solutions', icon: '🔄' },
                { title: 'Cloud-Native Architecture', desc: 'vs. legacy on-premise systems', icon: '☁️' }
              ]
            },
            {
              category: 'Market Position',
              advantages: [
                { title: 'SME-Focused Design', desc: 'vs. enterprise-only competitors', icon: '🎯' },
                { title: 'Multi-Country Support', desc: 'Global from day one', icon: '🌍' }
              ]
            }
          ].map((section, sectionIndex) => (
            <motion.div
              key={sectionIndex}
              className="space-y-4"
              initial={{ opacity: 0, x: sectionIndex === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">{section.category}</h3>
              {section.advantages.map((advantage, index) => (
                <motion.div
                  key={index}
                  className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-500"
                  whileHover={{ scale: 1.02, x: 10 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <div className="flex items-start space-x-4">
                    <div className="text-3xl">{advantage.icon}</div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">{advantage.title}</h4>
                      <p className="text-gray-600 text-sm">{advantage.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* The Pivot Path */}
      <AnimatedSection id="pivot" title="The Pivot Path" className="bg-gradient-to-r from-green-50 to-blue-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="bg-white p-8 rounded-lg shadow-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
          >
            <h3 className="text-2xl font-semibold mb-6 text-center">Leverage InvoiceOCR Assets</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-lg mb-3 text-green-700">Current Assets</h4>
                <ul className="space-y-2">
                  {[
                    'User base understands invoice processing',
                    'Technical team expertise in document handling',
                    'Brand recognition in invoice automation',
                    'Existing infrastructure and UI components'
                  ].map((asset, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span className="text-gray-700">{asset}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-3 text-blue-700">Timeline</h4>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-2">6 Months</div>
                  <p className="text-blue-700">
                    Transition to capture early e-invoicing wave before competition intensifies
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Call to Action */}
      <motion.section 
        className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
      >
        <motion.h2 
          className="text-3xl md:text-4xl font-bold mb-6"
          initial={{ y: 20 }}
          whileInView={{ y: 0 }}
        >
          The Question Isn&apos;t Whether E-Invoicing Will Replace OCR
        </motion.h2>
        <motion.p 
          className="text-xl mb-8 max-w-3xl mx-auto"
          initial={{ y: 20 }}
          whileInView={{ y: 0 }}
          transition={{ delay: 0.2 }}
        >
          It&apos;s whether we&apos;ll lead the next generation of invoice automation or watch others capture this massive opportunity.
        </motion.p>
        <motion.button
          className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Start the Revolution
        </motion.button>
      </motion.section>
    </div>
  )
}

// Reusable animated section component
function AnimatedSection({ 
  id, 
  title, 
  children, 
  className = '' 
}: { 
  id: string
  title: string
  children: React.ReactNode
  className?: string 
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <motion.section 
      ref={ref}
      id={id}
      className={`py-16 px-4 ${className}`}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.h2 
          className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-800"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ delay: 0.2 }}
        >
          {title}
        </motion.h2>
        {children}
      </div>
    </motion.section>
  )
}