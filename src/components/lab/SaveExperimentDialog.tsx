'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, X, AlertCircle } from 'lucide-react'

interface SaveExperimentDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, description?: string, options?: SaveOptions) => Promise<void>
  mode: 'play' | 'practical'
  defaultName?: string
}

interface SaveOptions {
  includeStructure: boolean
  includeParameters: boolean
  includeAnalysis: boolean
}

export default function SaveExperimentDialog({
  isOpen,
  onClose,
  onSave,
  mode,
  defaultName = ''
}: SaveExperimentDialogProps) {
  const [name, setName] = useState(defaultName)
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [saveMode, setSaveMode] = useState<'full' | 'basic'>('full')
  const [saveOptions, setSaveOptions] = useState<SaveOptions>({
    includeStructure: true,
    includeParameters: true,
    includeAnalysis: true
  })

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Experiment name is required')
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      await onSave(name.trim(), description.trim() || undefined, saveOptions)
      onClose()
      setName('')
      setDescription('')
      setSaveMode('full')
      setSaveOptions({
        includeStructure: true,
        includeParameters: true,
        includeAnalysis: true
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save experiment')
    } finally {
      setIsLoading(false)
    }
  }

  const generateRandomName = () => {
    const adjectives = ['Amazing', 'Brilliant', 'Curious', 'Dynamic', 'Epic', 'Fantastic']
    const nouns = ['Reaction', 'Experiment', 'Test', 'Analysis', 'Study', 'Discovery']
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
    const randomNum = Math.floor(Math.random() * 999) + 1
    setName(`${randomAdj}-${randomNoun}-${randomNum.toString().padStart(3, '0')}`)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  mode === 'play' ? 'bg-blue-100' : 'bg-purple-100'
                }`}>
                  <Save className={`h-5 w-5 ${
                    mode === 'play' ? 'text-blue-600' : 'text-purple-600'
                  }`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-black">Save Experiment</h3>
                  <p className="text-sm text-black">
                    {mode === 'play' ? 'Play Mode' : 'Practical Mode'} Experiment
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-black hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Experiment Name */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Experiment Name *
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Acid-Base-001, My First Reaction..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={100}
                  />
                  <button
                    type="button"
                    onClick={generateRandomName}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Generate random name
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add notes about your experiment..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  maxLength={500}
                />
                <div className="text-xs text-black mt-1">
                  {description.length}/500 characters
                </div>
              </div>

              {/* Save Options */}
              <div>
                <label className="block text-sm font-medium text-black mb-3">
                  Save Options
                </label>
                
                {/* Save Mode Selection */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSaveMode('full')
                      setSaveOptions({
                        includeStructure: true,
                        includeParameters: true,
                        includeAnalysis: true
                      })
                    }}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      saveMode === 'full'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-black text-sm">Full Save</div>
                    <div className="text-xs text-gray-600 mt-1">
                      3D structure, parameters, and analysis
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setSaveMode('basic')
                      setSaveOptions({
                        includeStructure: false,
                        includeParameters: true,
                        includeAnalysis: false
                      })
                    }}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      saveMode === 'basic'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-black text-sm">Basic Save</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Elements and results only
                    </div>
                  </button>
                </div>

                {/* Custom Options (only shown for full save) */}
                {saveMode === 'full' && (
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                    <div className="text-xs font-medium text-gray-700 mb-2">Customize what to include:</div>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={saveOptions.includeStructure}
                        onChange={(e) => setSaveOptions(prev => ({ ...prev, includeStructure: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-black">3D Molecular Structure</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={saveOptions.includeParameters}
                        onChange={(e) => setSaveOptions(prev => ({ ...prev, includeParameters: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-black">Lab Parameters (T, P, Volume)</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={saveOptions.includeAnalysis}
                        onChange={(e) => setSaveOptions(prev => ({ ...prev, includeAnalysis: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-black">Analysis & Predictions</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-black bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading || !name.trim()}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2 ${
                  mode === 'play' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Experiment</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
