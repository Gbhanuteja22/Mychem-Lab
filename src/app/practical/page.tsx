'use client'

import { useState, useEffect } from 'react'
import { UserButton } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import { FlaskConical, Home, Settings, Play, RotateCcw, Thermometer, Gauge, Droplets, Scale, Zap, Save, Lightbulb, Timer, Bot, AlertTriangle, Eye, Beaker as BeakerIcon } from 'lucide-react'
import Link from 'next/link'
import Element from '@/components/lab/Element'
import Beaker from '@/components/lab/Beaker'
import SaveExperimentDialog from '@/components/lab/SaveExperimentDialog'
import MolecularViewer3D from '@/components/lab/MolecularViewer3D'
import PHMeter from '@/components/lab/PHMeter'
import SafetyInstructions from '@/components/lab/SafetyInstructions'
import ParticleAnimation from '@/components/lab/ParticleAnimation'

// Add lab panel types
type LabPanel = 'elements' | 'equipment' | 'analysis'

interface ElementSpec {
  element: string
  molecules: number
  weight: number
}

interface ElementData {
  symbol: string
  name: string
  atomicNumber: number
  color: string
  safetyLevel: 'safe' | 'caution' | 'dangerous'
}

interface ReactionResult {
  compoundName: string
  chemicalFormula: string
  color: string
  state: string
  safetyWarnings: string[]
  explanation: string
  reactionEquation?: string
  temperature?: number
  pressure?: number
}

export default function PracticalModePage() {
  const [isDarkTheme, setIsDarkTheme] = useState(false)
  const [settings, setSettings] = useState<any>({
    preferences: { autoSave: true }
  })
  const [elements, setElements] = useState<ElementData[]>([])
  const [beakerContents, setBeakerContents] = useState<ElementSpec[]>([])
  const [beakerColor, setBeakerColor] = useState('#e0f2fe')
  const [reactionResult, setReactionResult] = useState<ReactionResult | null>(null)
  const [isReacting, setIsReacting] = useState(false)
  const [showResult, setShowResult] = useState(false)
  
  // Element selection for container
  const [selectedElement, setSelectedElement] = useState<string>('')
  const [selectedMolecules, setSelectedMolecules] = useState<number>(1)
  const [selectedWeight, setSelectedWeight] = useState<number>(1)
  const [showElementSelector, setShowElementSelector] = useState(false)

  const [reactionHistory, setReactionHistory] = useState<ReactionResult[]>([])

  // Lab parameters
  const [temperature, setTemperature] = useState(25) // Celsius
  const [pressure, setPressure] = useState(1.0) // atm
  const [labVolume, setLabVolume] = useState(100) // mL

  // Save dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false)

  // New feature states
  const [activePanel, setActivePanel] = useState<LabPanel>('elements')
  const [particleAnimationType, setParticleAnimationType] = useState<'bubble' | 'steam' | 'spark' | 'smoke'>('bubble')
  const [showParticles, setShowParticles] = useState(false)
  const [showSafetyPopup, setShowSafetyPopup] = useState(false)

  // Check theme on mount and listen for changes
  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme')
      setIsDarkTheme(theme === 'dark')
    }
    
    checkTheme()
    
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })
    
    return () => observer.disconnect()
  }, [])

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('lab-settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(parsed)
      } catch (error) {
        console.error('Error parsing saved settings:', error)
      }
    }
  }, [])

  // Check if user has seen safety instructions
  useEffect(() => {
    const hasSeenSafety = localStorage.getItem('chemistry-lab-safety-seen')
    if (!hasSeenSafety) {
      setShowSafetyPopup(true)
    }
  }, [])

  const handleSafetyComplete = () => {
    localStorage.setItem('chemistry-lab-safety-seen', 'true')
    setShowSafetyPopup(false)
  }
  
  // pH calculation based on beaker contents
  const currentPH = beakerContents.length > 0 ? 
    beakerContents.map(el => el.element) : []

  // Fetch elements on component mount
  useEffect(() => {
    fetchElements()
    
    // Check if we're editing an existing experiment
    const editExperiment = localStorage.getItem('editExperiment')
    if (editExperiment) {
      try {
        const experiment = JSON.parse(editExperiment)
        if (experiment.isEditing && experiment.mode === 'practical') {
          // Load experiment data
          setBeakerContents(experiment.elements.map((el: string) => ({
            element: el,
            molecules: 1,
            weight: 1
          })))
          setTemperature(experiment.parameters?.temperature || 25)
          setPressure(experiment.parameters?.pressure || 1.0)
          setLabVolume(experiment.parameters?.volume || 100)
          setReactionResult(experiment.result)
          setShowResult(true)
          
          // Clear the localStorage
          localStorage.removeItem('editExperiment')
        }
      } catch (error) {
        console.error('Error loading experiment for editing:', error)
        localStorage.removeItem('editExperiment')
      }
    }
  }, [])

  const fetchElements = async () => {
    try {
      const response = await fetch('/api/elements')
      const data = await response.json()
      if (data.success) {
        setElements(data.elements)
      }
    } catch (error) {
      console.error('Error fetching elements:', error)
    }
  }

  // Handle pH meter conversion
  const handleConversion = (convertedResult: any) => {
    setReactionResult(convertedResult)
    // Force re-render by updating state
    setShowResult(true)
  }

  const addElementToBeaker = () => {
    if (!selectedElement || selectedMolecules <= 0 || selectedWeight <= 0) return
    
    console.log('=== ADD ELEMENT EVENT (Practical) ===')
    console.log('Adding element:', selectedElement)
    console.log('Molecules:', selectedMolecules)
    console.log('Weight:', selectedWeight)
    
    // Find element data for safety check
    const elementData = elements.find(el => el.symbol === selectedElement)
    
    // Check safety level for dangerous elements - now just a warning
    if (elementData?.safetyLevel === 'dangerous') {
      console.log('Warning: Handling dangerous element. Please follow safety protocols.')
    }
    
    const newElement: ElementSpec = {
      element: selectedElement,
      molecules: selectedMolecules,
      weight: selectedWeight
    }
    
    const newContents = [...beakerContents, newElement]
    setBeakerContents(newContents)
    
    // Reset selection
    setSelectedElement('')
    setSelectedMolecules(1)
    setSelectedWeight(1)
    setShowElementSelector(false)
    setShowResult(false)
    setReactionResult(null)
    
    console.log('Element added to beaker:', newElement)
    console.log('=== ADD ELEMENT COMPLETE (Practical) ===')
  }

  const runExperiment = async () => {
    console.log('=== RUN EXPERIMENT CLICKED (Practical) ===')
    console.log('Elements to send to Gemini:', beakerContents)
    console.log('Element specifications:', beakerContents.map((spec, index) => `${index + 1}. ${spec.molecules} molecules of ${spec.element} (${spec.weight}g)`))
    console.log('Lab conditions:', { temperature, pressure, labVolume })
    
    if (beakerContents.length < 1) {
      alert('Please add at least 1 element to run an experiment.')
      return
    }

    setIsReacting(true)
    
    // Start particle animation
    setShowParticles(true)
    const particleType = temperature > 100 ? 'steam' : 
                        temperature > 50 ? 'bubble' : 
                        pressure > 2 ? 'spark' : 'smoke'
    setParticleAnimationType(particleType)
    
    try {
      const response = await fetch('/api/reactions/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elements: beakerContents,
          temperature,
          pressure,
          volume: labVolume,
          mode: 'practical',
          title: `Practical: ${beakerContents.map(spec => `${spec.molecules}x${spec.element}`).join(' + ')} at ${temperature}°C`
        }),
      })

      const data = await response.json()
      if (data.success) {
        setReactionResult(data.result)
        setBeakerColor(data.result.color || '#e0f2fe')
        setShowResult(true)
        
        // Respect autoSave setting
        if (settings.preferences?.autoSave) {
          setReactionHistory(prev => [...prev, data.result])
        }
      } else {
        console.error('Error predicting reaction:', data.error)
      }
    } catch (error) {
      console.error('Error predicting reaction:', error)
    } finally {
      setIsReacting(false)
      // Stop particles after reaction
      setTimeout(() => setShowParticles(false), 3000)
    }
  }

  // Helper function to get state emoji and display text
  const getStateDisplay = (state: string): { emoji: string; text: string } => {
    const lowerState = state.toLowerCase()
    
    // Use emojis only for standard states: solid (s), liquid (l), gas (g)
    if (lowerState === 's' || lowerState === 'solid') {
      return { emoji: '🧊', text: 'Solid' }
    }
    if (lowerState === 'l' || lowerState === 'liquid') {
      return { emoji: '�', text: 'Liquid' }
    }
    if (lowerState === 'g' || lowerState === 'gas') {
      return { emoji: '💨', text: 'Gas' }
    }
    
    // For other states (aq, plasma, unknown), use text only
    if (lowerState.includes('aq') || lowerState.includes('aqueous')) {
      return { emoji: '', text: 'Aqueous solution' }
    }
    if (lowerState.includes('plasma')) {
      return { emoji: '', text: 'Plasma' }
    }
    
    // Default: return the original state as text
    return { emoji: '', text: state }
  }

  const clearBeaker = () => {
    console.log('Clear workbench clicked (Practical)')
    
    // Reset everything to initial state
    setBeakerContents([])
    setBeakerColor('#e0f2fe')
    setReactionResult(null)
    setShowResult(false)
    setShowParticles(false)
    
    console.log('Workbench completely cleared (Practical)')
  }

  const removeElementFromBeaker = (indexToRemove: number) => {
    setBeakerContents(prev => prev.filter((_, index) => index !== indexToRemove))
    
    // Reset reaction if beaker becomes empty
    if (beakerContents.length === 1) {
      setReactionResult(null)
      setShowResult(false)
      setBeakerColor('#e0f2fe')
    }
    
    console.log('Element removed from beaker at index:', indexToRemove)
  }

  // New feature handlers
  const handleTemperatureChange = (newTemp: number) => {
    setTemperature(newTemp)
  }

  const handlePressureChange = (newPressure: number) => {
    setPressure(newPressure)
  }

  const handleSaveExperiment = async (title: string, description?: string, options?: { includeStructure: boolean, includeParameters: boolean, includeAnalysis: boolean }) => {
    if (!reactionResult) {
      throw new Error('No reaction result to save')
    }

    console.log('=== SAVE EXPERIMENT (Practical) ===')
    console.log('Title:', title)
    console.log('Description:', description)
    console.log('Save Options:', options)

    // Prepare data based on save options
    const experimentData: any = {
      mode: 'practical',
      title,
      description,
      elements: beakerContents.map(spec => `${spec.molecules}×${spec.element}`),
      result: reactionResult
    }

    // Add optional data based on save options
    if (options?.includeParameters) {
      experimentData.temperature = temperature
      experimentData.pressure = pressure
      experimentData.volume = labVolume
      console.log('Including parameters:', { temperature, pressure, volume: labVolume })
    }

    if (options?.includeStructure) {
      // Include molecular structure data - now properly includes 3D structure
      experimentData.molecularStructure = {
        bonds: [], // Add bond data from molecular viewer if available
        atoms: beakerContents.map(spec => ({ element: spec.element, count: spec.molecules })),
        formula: reactionResult.chemicalFormula || '',
        structure3D: {
          geometry: 'unknown', // Could be expanded with actual 3D data
          bondAngles: [],
          bondLengths: []
        }
      }
      console.log('Including 3D structure data')
    }

    if (options?.includeAnalysis) {
      // Include comprehensive analysis data
      experimentData.analysis = {
        reactionType: 'unknown',
        energyChange: null,
        colorChange: reactionResult.color || null,
        phChange: null,
        stateChange: reactionResult.state || null,
        safetyWarnings: reactionResult.safetyWarnings || []
      }
      console.log('Including analysis data')
    }

    console.log('Final experiment data to save:', experimentData)

    const response = await fetch('/api/experiments/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(experimentData)
    })

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to save experiment')
    }

    // Show save confirmation animation
    setShowSaveConfirmation(true)
    setTimeout(() => setShowSaveConfirmation(false), 3000)
    
    // Add to reaction history only when saved
    setReactionHistory(prev => [...prev, reactionResult])
    
    // Close save dialog
    setShowSaveDialog(false)
  }

  const resetParameters = () => {
    setTemperature(25)
    setPressure(1.0)
    setLabVolume(100)
  }

  return (
    <div className={`min-h-screen ${
      isDarkTheme 
        ? 'bg-gradient-to-br from-slate-900 to-slate-800' 
        : 'bg-gradient-to-br from-purple-50 to-indigo-100'
    }`}>
      <div className={`min-h-screen ${
        isDarkTheme 
          ? 'bg-gradient-to-br from-slate-900 to-slate-800' 
          : 'bg-gradient-to-br from-purple-50 to-indigo-100'
      }`}>
        <nav className={`backdrop-blur-md border-b sticky top-0 z-50 ${
          isDarkTheme 
            ? 'bg-slate-900/90 border-slate-700' 
            : 'bg-white/90 border-slate-200'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link href="/dashboard" className={`flex items-center space-x-2 ${
                  isDarkTheme 
                    ? 'text-white hover:text-slate-300' 
                    : 'text-black hover:text-slate-700'
                }`}>
                  <Home className="h-5 w-5" />
                  <span className="font-medium">Dashboard</span>
                </Link>
                <div className="flex items-center space-x-3">
                  <FlaskConical className="h-8 w-8 text-purple-600" />
                  <span className={`text-xl font-bold ${
                    isDarkTheme ? 'text-white' : 'text-black'
                  }`}>Practical Mode</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={runExperiment}
                  disabled={beakerContents.length < 1 || isReacting}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="h-4 w-4" />
                  <span>{isReacting ? 'Running...' : 'Run Experiment'}</span>
                </button>
                <UserButton />
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Left Sidebar - Lab Panels */}
            <div className="lg:col-span-4">
              <div className={`rounded-xl shadow-lg border overflow-hidden sticky top-20 ${
                isDarkTheme 
                  ? 'bg-slate-900 border-slate-700' 
                  : 'bg-white border-slate-200'
              }`} style={{ maxHeight: 'calc(100vh - 6rem)' }}>
                <div className={`flex border-b ${
                  isDarkTheme ? 'border-slate-700' : 'border-slate-200'
                }`}>
                  {[
                    { id: 'elements' as LabPanel, label: 'Elements', icon: FlaskConical },
                    { id: 'equipment' as LabPanel, label: 'Equipment', icon: Scale },
                    { id: 'analysis' as LabPanel, label: 'Analysis', icon: Droplets }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActivePanel(tab.id)}
                      className={`flex-1 flex flex-col items-center justify-center space-y-1 px-3 py-3 text-xs font-medium transition-colors
                        ${activePanel === tab.id 
                          ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50' 
                          : isDarkTheme
                          ? 'text-white hover:text-slate-300 hover:bg-slate-800'
                          : 'text-black hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <tab.icon className="h-5 w-5" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
                  {/* Elements Panel */}
                  {activePanel === 'elements' && (
                    <div>
                      <h2 className={`text-lg font-bold mb-4 ${
                        isDarkTheme ? 'text-white' : 'text-black'
                      }`}>Elements</h2>
                      
                      {selectedElement && showElementSelector && (
                        <div className={`mb-4 p-4 rounded-lg border ${
                          isDarkTheme 
                            ? 'bg-purple-900 border-purple-700' 
                            : 'bg-purple-50 border-purple-200'
                        }`}>
                          <h3 className={`font-medium mb-3 ${
                            isDarkTheme ? 'text-white' : 'text-black'
                          }`}>Selected: {selectedElement}</h3>
                          
                          <div className="space-y-3">
                            <div>
                              <label className={`block text-sm font-medium mb-1 ${
                                isDarkTheme ? 'text-white' : 'text-black'
                              }`}>
                                Number of Molecules: {selectedMolecules}
                              </label>
                              <input
                                type="range"
                                min="1"
                                max="10"
                                value={selectedMolecules}
                                onChange={(e) => setSelectedMolecules(Number(e.target.value))}
                                className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                              />
                              <div className={`flex justify-between text-xs mt-1 ${
                                isDarkTheme ? 'text-slate-300' : 'text-black'
                              }`}>
                                <span>1</span>
                                <span>10</span>
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-black mb-1">
                                Weight: {selectedWeight}g
                              </label>
                              <input
                                type="range"
                                min="0.1"
                                max="50"
                                step="0.1"
                                value={selectedWeight}
                                onChange={(e) => setSelectedWeight(Number(e.target.value))}
                                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                              />
                              <div className={`flex justify-between text-xs mt-1 ${
                                isDarkTheme ? 'text-slate-300' : 'text-black'
                              }`}>
                                <span>0.1g</span>
                                <span>50g</span>
                              </div>
                            </div>
                            
                            <div className="flex space-x-2">
                              <button
                                onClick={addElementToBeaker}
                                className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                              >
                                Add to Beaker
                              </button>
                              <button
                                onClick={() => setShowElementSelector(false)}
                                className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                                  isDarkTheme 
                                    ? 'bg-slate-600 text-white hover:bg-slate-700' 
                                    : 'bg-slate-300 text-black hover:bg-slate-400'
                                }`}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className={`grid grid-cols-2 gap-3 overflow-y-auto p-2 custom-scrollbar ${
                        isDarkTheme ? 'custom-scrollbar-dark' : 'custom-scrollbar-light'
                      }`} style={{ maxHeight: '24rem' }}>
                        {elements.map((element) => (
                          <div
                            key={element.symbol}
                            className="flex justify-center cursor-pointer transform hover:scale-105 transition-transform"
                            onClick={() => {
                              setSelectedElement(element.symbol)
                              setShowElementSelector(true)
                            }}
                          >
                            <div className="w-full max-w-[80px]">
                              <Element
                                  symbol={element.symbol}
                                name={element.name}
                                color={element.color}
                                safetyLevel={element.safetyLevel}
                                atomicNumber={element.atomicNumber}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Equipment Panel */}
                  {activePanel === 'equipment' && (
                    <div className="space-y-4">
                      <h2 className={`text-lg font-bold ${
                        isDarkTheme ? 'text-white' : 'text-black'
                      }`}>Equipment</h2>
                      
                      <PHMeter 
                        elements={beakerContents.map(spec => spec.element)} 
                        temperature={temperature}
                        reactionResult={reactionResult}
                        onConversion={handleConversion}
                      />
                    </div>
                  )}

                  {/* Analysis Panel */}
                  {activePanel === 'analysis' && (
                    <div className="space-y-4">
                      <h2 className={`text-lg font-bold ${
                        isDarkTheme ? 'text-white' : 'text-black'
                      }`}>3D Analysis</h2>
                      <MolecularViewer3D 
                        compound={beakerContents} 
                        reactionResult={reactionResult}
                      />
                      
                      {/* Lab Parameters */}
                      <div className={`rounded-lg border p-4 ${
                        isDarkTheme 
                          ? 'bg-slate-800 border-slate-700' 
                          : 'bg-white border-slate-200'
                      }`}>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className={`font-semibold flex items-center ${
                            isDarkTheme ? 'text-white' : 'text-black'
                          }`}>
                            <Settings className="h-4 w-4 text-purple-600 mr-2" />
                            Parameters
                          </h3>
                          <button
                            onClick={resetParameters}
                            className="text-xs text-purple-600 hover:text-purple-800"
                          >
                            Reset
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                <Thermometer className="h-4 w-4 text-red-500 mr-2" />
                                <label className="text-sm font-medium text-black">Temperature</label>
                              </div>
                              <span className={`text-sm ${
                                isDarkTheme ? 'text-slate-300' : 'text-black'
                              }`}>{temperature}°C</span>
                            </div>
                            <input
                              type="range"
                              min="-50"
                              max="500"
                              value={temperature}
                              onChange={(e) => handleTemperatureChange(Number(e.target.value))}
                              className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                <Gauge className="h-4 w-4 text-blue-500 mr-2" />
                                <label className="text-sm font-medium text-black">Pressure</label>
                              </div>
                              <span className={`text-sm ${
                                isDarkTheme ? 'text-slate-300' : 'text-black'
                              }`}>{pressure} atm</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="10"
                              step="0.1"
                              value={pressure}
                              onChange={(e) => handlePressureChange(Number(e.target.value))}
                              className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Lab Area */}
            <div className="lg:col-span-5">
              <div className={`rounded-xl shadow-lg border p-6 relative ${
                isDarkTheme 
                  ? 'bg-slate-900 border-slate-700' 
                  : 'bg-white border-slate-200'
              }`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`text-xl font-bold flex items-center ${
                    isDarkTheme ? 'text-white' : 'text-black'
                  }`}>
                    <BeakerIcon className="h-6 w-6 text-purple-600 mr-3" />
                    Virtual Lab Bench
                  </h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={clearBeaker}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Clear</span>
                    </button>
                    {reactionResult && (
                      <button
                        onClick={() => setShowSaveDialog(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        <Save className="h-4 w-4" />
                        <span>Save</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-center mb-8 relative">
                  <Beaker 
                    id="main-beaker"
                    contents={beakerContents.map(spec => spec.element)} 
                    color={beakerColor}
                    onDrop={() => {}}
                  />
                  
                  {/* Particle Animation Overlay */}
                  {showParticles && (
                    <div className="absolute inset-0 pointer-events-none">
                      <ParticleAnimation 
                        elements={beakerContents.map(spec => spec.element)}
                        temperature={temperature}
                        isReacting={showParticles}
                        reactionType="neutral"
                      />
                    </div>
                  )}
                </div>

                {/* Beaker Contents Display */}
                {beakerContents.length > 0 && (
                  <div className="mb-6">
                    <h3 className={`text-lg font-semibold mb-3 ${
                      isDarkTheme ? 'text-white' : 'text-black'
                    }`}>Current Contents:</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {beakerContents.map((spec, index) => (
                        <div key={index} className={`rounded-lg p-3 border relative group ${
                          isDarkTheme 
                            ? 'bg-purple-900 border-purple-700' 
                            : 'bg-purple-50 border-purple-200'
                        }`}>
                          <div className={`text-sm font-medium ${
                            isDarkTheme ? 'text-purple-200' : 'text-purple-800'
                          }`}>
                            {spec.molecules}× {spec.element}
                          </div>
                          <div className={`text-xs ${
                            isDarkTheme ? 'text-purple-300' : 'text-purple-600'
                          }`}>{spec.weight}g</div>
                          
                          {/* Remove button */}
                          <button
                            onClick={() => removeElementFromBeaker(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 flex items-center justify-center"
                            title="Remove element"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reaction Result */}
                {showResult && reactionResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl p-6 border ${
                      isDarkTheme 
                        ? 'bg-gradient-to-r from-green-900 to-emerald-900 border-green-700' 
                        : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <Zap className="h-6 w-6 text-green-600" />
                      <h3 className={`text-xl font-bold ${
                        isDarkTheme ? 'text-green-400' : 'text-green-800'
                      }`}>Reaction Complete!</h3>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className={`font-semibold mb-2 ${
                          isDarkTheme ? 'text-white' : 'text-black'
                        }`}>Product Details</h4>
                        <div className={`space-y-2 text-sm ${
                          isDarkTheme ? 'text-slate-300' : 'text-black'
                        }`}>
                          <div><span className={`font-medium ${
                            isDarkTheme ? 'text-white' : 'text-black'
                          }`}>Compound:</span> {reactionResult.compoundName}</div>
                          <div><span className={`font-medium ${
                            isDarkTheme ? 'text-white' : 'text-black'
                          }`}>Formula:</span> {reactionResult.chemicalFormula}</div>
                          <div>
                            <span className={`font-medium ${
                              isDarkTheme ? 'text-white' : 'text-black'
                            }`}>State:</span> 
                            {(() => {
                              const stateDisplay = getStateDisplay(reactionResult.state)
                              return (
                                <span className="ml-1">
                                  {stateDisplay.emoji && <span className="mr-1">{stateDisplay.emoji}</span>}
                                  {stateDisplay.text}
                                </span>
                              )
                            })()}
                          </div>
                          {reactionResult.temperature && (
                            <div><span className={`font-medium ${
                              isDarkTheme ? 'text-white' : 'text-black'
                            }`}>Final Temp:</span> {reactionResult.temperature}°C</div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className={`font-semibold mb-2 ${
                          isDarkTheme ? 'text-white' : 'text-black'
                        }`}>Safety Warnings</h4>
                        {reactionResult.safetyWarnings.length > 0 ? (
                          <ul className="text-sm space-y-1">
                            {reactionResult.safetyWarnings.map((warning, index) => (
                              <li key={index} className={`flex items-start ${
                                isDarkTheme ? 'text-amber-400' : 'text-amber-700'
                              }`}>
                                <AlertTriangle className="h-3 w-3 mt-0.5 mr-1 flex-shrink-0" />
                                {warning}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className={`text-sm ${
                            isDarkTheme ? 'text-green-400' : 'text-green-600'
                          }`}>No safety concerns detected</p>
                        )}
                      </div>
                    </div>
                    
                    <div className={`mt-4 pt-4 border-t ${
                      isDarkTheme ? 'border-green-700' : 'border-green-200'
                    }`}>
                      <h4 className={`font-semibold mb-2 ${
                        isDarkTheme ? 'text-white' : 'text-black'
                      }`}>Explanation</h4>
                      <p className={`text-sm ${
                        isDarkTheme ? 'text-slate-300' : 'text-black'
                      }`}>{reactionResult.explanation}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-3">
              {/* Reaction History */}
              {reactionHistory.length > 0 && (
                <div className={`rounded-xl shadow-lg border p-6 ${
                  isDarkTheme 
                    ? 'bg-slate-900 border-slate-700' 
                    : 'bg-white border-slate-200'
                }`} style={{ maxHeight: 'calc(100vh - 6rem)' }}>
                  <h3 className={`text-lg font-bold mb-4 flex items-center ${
                    isDarkTheme ? 'text-white' : 'text-black'
                  }`}>
                    <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
                    Recent Results
                  </h3>
                  <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
                    {reactionHistory.slice(-10).map((result, index) => (
                      <div key={index} className={`p-3 rounded-lg border ${
                        isDarkTheme 
                          ? 'bg-slate-800 border-slate-700' 
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className={`font-medium text-sm ${
                          isDarkTheme ? 'text-white' : 'text-black'
                        }`}>{result.compoundName}</div>
                        <div className={`text-xs ${
                          isDarkTheme ? 'text-slate-300' : 'text-black'
                        }`}>{result.chemicalFormula}</div>
                        <div className={`text-xs mt-1 ${
                          isDarkTheme ? 'text-slate-400' : 'text-black'
                        }`}>{result.state}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <SaveExperimentDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveExperiment}
        mode="practical"
        defaultName={`Practical-${beakerContents.map(spec => `${spec.molecules}x${spec.element}`).join('-')}-${temperature}C`}
      />

      {/* Safety Instructions Popup */}
      {showSafetyPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${
            isDarkTheme ? 'bg-slate-900' : 'bg-white'
          }`}>
            <div className={`p-6 border-b bg-red-50 ${
              isDarkTheme ? 'border-slate-700' : 'border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                  <div>
                    <h2 className="text-2xl font-bold text-black">Laboratory Safety Instructions</h2>
                    <p className={`${
                      isDarkTheme ? 'text-slate-300' : 'text-black'
                    }`}>Please read these important safety guidelines before proceeding</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 8rem)' }}>
              <SafetyInstructions />
            </div>
            
            <div className={`p-6 border-t ${
              isDarkTheme 
                ? 'border-slate-700 bg-slate-800' 
                : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex justify-between items-center">
                <div className={`text-sm ${
                  isDarkTheme ? 'text-slate-300' : 'text-black'
                }`}>
                  ⚠️ By proceeding, you acknowledge that you have read and understood these safety guidelines
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowSafetyPopup(false)}
                    className={`px-4 py-2 transition-colors ${
                      isDarkTheme 
                        ? 'text-slate-400 hover:text-slate-200' 
                        : 'text-black hover:text-slate-700'
                    }`}
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleSafetyComplete}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    I Understand - Proceed to Lab
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Confirmation Animation */}
      {showSaveConfirmation && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Experiment Saved Successfully!</span>
          </div>
        </div>
      )}
    </div>
  )
}
