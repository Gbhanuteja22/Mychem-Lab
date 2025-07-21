'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, X, AlertCircle } from 'lucide-react'

interface SaveExperimentDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, description?: string) => Promise<void>
  mode: 'play' | 'practical'
  defaultName?: string
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

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Experiment name is required')
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      await onSave(name.trim(), description.trim() || undefined)
      onClose()
      setName('')
      setDescription('')
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
