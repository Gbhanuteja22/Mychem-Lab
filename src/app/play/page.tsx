'use client'

import { useState, useEffect } from 'react'
import { UserButton } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import { FlaskConical, Home, Lightbulb, Zap, RotateCcw, Save } from 'lucide-react'
import Link from 'next/link'
import Element from '@/components/lab/Element'
import Beaker from '@/components/lab/Beaker'

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
}

export default function PlayModePage() {
  const [elements, setElements] = useState<ElementData[]>([])
  const [beakerContents, setBeakerContents] = useState<string[]>([])
  const [beakerColor, setBeakerColor] = useState('#e0f2fe')
  const [reactionResult, setReactionResult] = useState<ReactionResult | null>(null)
  const [isReacting, setIsReacting] = useState(false)
  const [showResult, setShowResult] = useState(false)
  
  // Element selection for container
  const [selectedElements, setSelectedElements] = useState<string[]>([])
  
  // Undo/Redo functionality
  const [history, setHistory] = useState<string[][]>([[]]) // Start with empty state
  const [historyIndex, setHistoryIndex] = useState(0)
  const [reactionHistory, setReactionHistory] = useState<ReactionResult[]>([])

  // Fetch elements on component mount
  useEffect(() => {
    fetchElements()
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

  const saveToHistory = (contents: string[]) => {
    console.log('Saving to history:', contents)
    
    // If we're not at the end of history, truncate future history
    const truncatedHistory = history.slice(0, historyIndex + 1)
    
    // Only save if the new state is different from current
    const lastState = truncatedHistory[truncatedHistory.length - 1]
    if (truncatedHistory.length === 0 || JSON.stringify(contents) !== JSON.stringify(lastState)) {
      const newHistory = [...truncatedHistory, [...contents]]
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
      console.log('History updated:', newHistory, 'Index:', newHistory.length - 1)
    }
  }

  const handleElementDrop = async (elementName: string) => {
    // Remove drag functionality - this function is no longer used
    console.log('Drag functionality disabled in play mode')
  }

  const handleReactButton = async () => {
    console.log('=== REACT BUTTON CLICKED ===')
    console.log('Elements to send to Gemini:', beakerContents)
    console.log('Order sequence:', beakerContents.map((element, index) => `${index + 1}. ${element}`))
    
    if (beakerContents.length < 1) {
      alert('Please add at least 1 element to create a reaction!')
      return
    }
    await predictReaction(beakerContents)
  }

  const predictReaction = async (contents: string[]) => {
    setIsReacting(true)
    try {
      const response = await fetch('/api/reactions/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elements: contents,
          mode: 'play',
          title: `Play Mode: ${contents.join(' + ')}`
        }),
      })

      const data = await response.json()
      if (data.success) {
        setReactionResult(data.result)
        setBeakerColor(data.result.color || '#e0f2fe')
        setShowResult(true)
        
        // Save to reaction history
        setReactionHistory(prev => [...prev, data.result])
      } else {
        console.error('Error predicting reaction:', data.error)
      }
    } catch (error) {
      console.error('Error predicting reaction:', error)
    } finally {
      setIsReacting(false)
    }
  }

  const undo = () => {
    console.log('Undo clicked - historyIndex:', historyIndex, 'history length:', history.length)
    
    if (history.length > 1 && historyIndex > 0) {
      const newIndex = historyIndex - 1
      const previousState = history[newIndex]
      setHistoryIndex(newIndex)
      setBeakerContents([...previousState])
      setShowResult(false)
      setReactionResult(null)
      setBeakerColor('#e0f2fe')
      console.log('Undo applied - new index:', newIndex, 'contents:', previousState)
    }
  }

  const redo = () => {
    console.log('Redo clicked - historyIndex:', historyIndex, 'history length:', history.length)
    
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      const nextState = history[newIndex]
      setHistoryIndex(newIndex)
      setBeakerContents([...nextState])
      setShowResult(false)
      setReactionResult(null)
      setBeakerColor('#e0f2fe')
      console.log('Redo applied - new index:', newIndex, 'contents:', nextState)
    }
  }

  const clearBeaker = () => {
    console.log('Clear workbench clicked (Play)')
    
    // Reset everything to initial state
    setBeakerContents([])
    setBeakerColor('#e0f2fe')
    setReactionResult(null)
    setShowResult(false)
    
    // Reset undo/redo history completely
    setHistory([[]])
    setHistoryIndex(0)
    
    console.log('Workbench completely cleared and history reset (Play)')
  }

  const getRandomElements = () => {
    const shuffled = [...elements].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, 2)
  }

  const toggleElementSelection = (elementName: string) => {
    setSelectedElements(prev => {
      if (prev.includes(elementName)) {
        return prev.filter(el => el !== elementName)
      } else {
        return [...prev, elementName]
      }
    })
  }

  const addSelectedElementsToBeaker = () => {
    if (selectedElements.length === 0) return
    
    saveToHistory(beakerContents)
    const newContents = [...beakerContents, ...selectedElements]
    setBeakerContents(newContents)
    setSelectedElements([])
    setShowResult(false)
    setReactionResult(null)
    
    console.log('Added selected elements to beaker:', selectedElements)
  }

  const clearSelectedElements = () => {
    setSelectedElements([])
  }

  const performRandomReaction = async () => {
    const randomElements = getRandomElements()
    if (randomElements.length >= 2) {
      const elementNames = randomElements.map(el => el.name)
      
      // Save current state and add random elements to existing contents
      saveToHistory(beakerContents)
      const newContents = [...beakerContents, ...elementNames.filter(name => !beakerContents.includes(name))]
      setBeakerContents(newContents)
      
      await predictReaction(newContents)
    }
  }

  return (
    <div>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        {/* Navigation */}
        <nav className="bg-white/80 backdrop-blur-md border-b border-green-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                  <Home className="h-5 w-5" />
                  <span>Dashboard</span>
                </Link>
                <div className="flex items-center space-x-2">
                  <FlaskConical className="h-8 w-8 text-green-600" />
                  <span className="text-xl font-bold text-gray-900">Play Mode</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={performRandomReaction}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Zap className="h-4 w-4" />
                  <span>Random Reaction</span>
                </button>
                <UserButton />
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Elements Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-green-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <Lightbulb className="h-6 w-6 text-green-600 mr-2" />
                  Elements
                </h2>
                
                <p className="text-gray-600 mb-4">
                  Click elements to select them for your container!
                </p>
                
                <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-green-800">
                      Selected: {selectedElements.length}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={clearSelectedElements}
                        className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        Clear
                      </button>
                      <button
                        onClick={addSelectedElementsToBeaker}
                        disabled={selectedElements.length === 0}
                        className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                      >
                        Add to Beaker
                      </button>
                    </div>
                  </div>
                  {selectedElements.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedElements.map((element, index) => (
                        <span key={index} className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                          {element}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {elements.map((element) => (
                    <div key={element.symbol} className="flex justify-center">
                      <div
                        onClick={() => toggleElementSelection(element.name)}
                        className={`cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                          selectedElements.includes(element.name) 
                            ? 'ring-2 ring-green-500 ring-offset-2' 
                            : ''
                        }`}
                      >
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
            </div>

            {/* Lab Area */}
            <div className="lg:col-span-2">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-green-200 p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">Virtual Lab Bench</h2>
                  
                  {/* Control Buttons */}
                  <div className="flex items-center space-x-3">
                    {/* Undo/Redo Buttons */}
                    <button
                      onClick={undo}
                      disabled={history.length <= 1 || historyIndex <= 0}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Undo</span>
                    </button>
                    
                    <button
                      onClick={redo}
                      disabled={historyIndex >= history.length - 1}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      <RotateCcw className="h-4 w-4 scale-x-[-1]" />
                      <span>Redo</span>
                    </button>

                    {/* React Button */}
                    <button
                      onClick={handleReactButton}
                      disabled={beakerContents.length < 1 || isReacting}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      <Zap className="h-4 w-4" />
                      <span>{isReacting ? 'Reacting...' : 'React'}</span>
                    </button>
                    
                    {/* Clear Button */}
                    <button
                      onClick={clearBeaker}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>

                {/* Current Elements Display - Enhanced with Order */}
                {beakerContents.length > 0 && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="mb-3 text-center">
                      <div className="font-semibold text-black mb-1">Elements in beaker (in order)</div>
                      <div className="text-sm text-black">Total: {beakerContents.length}</div>
                    </div>
                    <div className="flex flex-wrap gap-3 mb-3">
                      {beakerContents.map((element, index) => (
                        <div
                          key={`${element}-${index}`}
                          className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-2 rounded-full text-sm font-medium border border-blue-200 mb-1"
                        >
                          <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 font-bold">
                            {index + 1}
                          </span>
                          {element}
                        </div>
                      ))}
                    </div>
                    <div className="text-sm text-gray-600 bg-white/60 px-3 py-1 rounded border">
                      <span className="font-medium">Reaction sequence:</span> {beakerContents.join(' + ')}
                    </div>
                  </div>
                )}

                {/* Lab Equipment Area */}
                <div className="min-h-64 bg-gradient-to-b from-blue-50 to-blue-100 rounded-xl p-8 border-2 border-dashed border-blue-300">
                  {beakerContents.length === 0 && (
                    <div className="text-center mb-4 p-3 bg-blue-100/60 rounded-lg border border-blue-300">
                      <p className="text-blue-800 font-medium">💡 Tip: Drag multiple elements to the beaker, then click React!</p>
                      <p className="text-sm text-blue-600 mt-1">Build your chemical reaction by adding elements one by one</p>
                    </div>
                  )}
                  <div className="flex justify-center items-center h-full">
                    <div className="text-center">
                      <Beaker
                        id="main-beaker"
                        contents={beakerContents}
                        color={beakerColor}
                        onDrop={handleElementDrop}
                        size="large"
                      />
                      
                      {isReacting && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-4 text-blue-600 font-medium"
                        >
                          <div className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                          Analyzing reaction...
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reaction Result */}
                {showResult && reactionResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-6 border border-green-200"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <Zap className="h-6 w-6 text-green-600 mr-2" />
                      Compound Formed!
                    </h3>
                    
                    <div className="grid md:grid-cols-3 gap-6">
                      {/* Compound Visualization */}
                      <div className="flex flex-col items-center">
                        <h4 className="font-semibold text-gray-700 mb-3">Visual Representation</h4>
                        <div className="relative">
                          {/* Compound Crystal/Molecule Representation */}
                          <motion.div
                            initial={{ scale: 0, rotate: 0 }}
                            animate={{ scale: 1, rotate: 360 }}
                            transition={{ duration: 1, type: "spring" }}
                            className="w-24 h-24 rounded-lg border-4 border-gray-300 flex items-center justify-center text-white font-bold text-lg shadow-lg"
                            style={{ 
                              backgroundColor: reactionResult.color === 'colorless' ? '#9CA3AF' : reactionResult.color,
                              borderColor: reactionResult.color === 'colorless' ? '#6B7280' : reactionResult.color
                            }}
                          >
                            {reactionResult.chemicalFormula}
                          </motion.div>
                          
                          {/* State indicator */}
                          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-white rounded-full text-xs font-medium border shadow-sm">
                            {reactionResult.state === 'solid' && '�'}
                            {reactionResult.state === 'liquid' && '💧'}
                            {reactionResult.state === 'gas' && '💨'}
                            {reactionResult.state === 'plasma' && reactionResult.state}
                          </div>
                        </div>
                      </div>

                      {/* Compound Details */}
                      <div className="mb-4">
                        <h4 className="font-semibold text-black mb-3">Properties</h4>
                        <div className="space-y-3">
                          <div>
                            <span className="font-semibold text-black">Name:</span>
                            <span className="ml-2 text-black">{reactionResult.compoundName}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-black">Formula:</span>
                            <span className="ml-2 text-black font-mono text-lg">{reactionResult.chemicalFormula}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-black">State:</span>
                            <span className="ml-2 text-black capitalize">{reactionResult.state}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-black">Color:</span>
                            <div className="ml-2 inline-flex items-center space-x-2">
                              <span className="text-black capitalize">{reactionResult.color}</span>
                              <div 
                                className="w-4 h-4 rounded-full border border-gray-300"
                                style={{ backgroundColor: reactionResult.color === 'colorless' ? '#E5E7EB' : reactionResult.color }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Explanation */}
                      <div className="mb-4">
                        <h4 className="font-semibold text-black mb-3">How it Formed:</h4>
                        <p className="text-black text-sm leading-relaxed">{reactionResult.explanation}</p>
                        
                        {/* Reaction Equation */}
                        {reactionResult.reactionEquation && (
                          <div className="mt-4 p-3 bg-white rounded border">
                            <div className="text-xs text-black font-medium mb-2">Chemical Equation:</div>
                            <div className="font-mono text-sm text-black bg-gray-100 p-2 rounded text-center">{reactionResult.reactionEquation}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Safety Warnings */}
                    {reactionResult.safetyWarnings && reactionResult.safetyWarnings.length > 0 && (
                      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
                          ⚠️ Safety Information:
                        </h4>
                        <ul className="text-yellow-700 text-sm space-y-1">
                          {reactionResult.safetyWarnings.map((warning, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-yellow-600 mr-2">•</span>
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Save Result Button */}
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => {
                          // You can implement save functionality here
                          alert('Reaction saved to your lab journal!')
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Save className="h-4 w-4" />
                        <span>Save to Journal</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
