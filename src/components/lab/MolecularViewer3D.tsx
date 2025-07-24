'use client'

import React, { useRef, useEffect, useState, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere, Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import { X, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'

interface Atom {
  element: string
  position: [number, number, number]
  color: string
  radius: number
}

interface Bond {
  start: [number, number, number]
  end: [number, number, number]
  type: 'single' | 'double' | 'triple'
}

interface MolecularData {
  name: string
  formula: string
  atoms: Atom[]
  bonds: Bond[]
}

interface MolecularViewer3DProps {
  compound: Array<{ element: string; molecules: number; weight: number }> | string
  reactionResult?: any // Add reaction result to get the correct formula
}

// Helper function to format chemical formulas with proper subscripts
const formatChemicalFormula = (formula: string): string => {
  if (!formula) return ''
  
  // Convert numbers to subscripts
  return formula.replace(/(\d+)/g, (match) => {
    const subscripts = '₀₁₂₃₄₅₆₇₈₉'
    return match.split('').map(digit => subscripts[parseInt(digit)]).join('')
  })
}

// Molecular geometry templates
const getAtomicRadius = (element: string): number => {
  const radii: Record<string, number> = {
    'H': 0.4, 'C': 0.7, 'N': 0.65, 'O': 0.6, 'F': 0.5,
    'Na': 1.8, 'Mg': 1.6, 'Al': 1.4, 'Si': 1.1, 'P': 1.0,
    'S': 1.0, 'Cl': 1.0, 'K': 2.2, 'Ca': 2.0, 'Fe': 1.26,
    'Li': 1.5, 'Be': 1.1, 'B': 0.9, 'Br': 1.2, 'I': 1.4
  }
  return radii[element] || 0.8
}

const getMolecularGeometry = (centerAtom: string, numBonds: number, hasLonePairs: boolean = false): string => {
  const geometryMap: Record<string, Record<number, string>> = {
    'C': { 4: 'tetrahedral', 3: 'trigonalPlanar', 2: 'linear' },
    'N': { 3: 'trigonalPyramidal', 4: 'tetrahedral', 2: 'bent' },
    'O': { 2: 'bent', 1: 'linear' },
    'S': { 2: 'bent', 4: 'tetrahedral', 6: 'octahedral' },
    'P': { 3: 'trigonalPyramidal', 5: 'trigonalBipyramidal' }
  }
  
  return geometryMap[centerAtom]?.[numBonds] || 'linear'
}

const generateGeometricPositions = (
  centerPos: [number, number, number], 
  numAtoms: number, 
  geometry: string, 
  bondLength: number = 1.5
): [number, number, number][] => {
  const positions: [number, number, number][] = []
  const [cx, cy, cz] = centerPos
  
  switch (geometry) {
    case 'linear':
      for (let i = 0; i < numAtoms; i++) {
        positions.push([cx + (i - (numAtoms - 1) / 2) * bondLength, cy, cz])
      }
      break
      
    case 'trigonalPlanar':
      for (let i = 0; i < numAtoms; i++) {
        const angle = (2 * Math.PI * i) / numAtoms
        positions.push([
          cx + bondLength * Math.cos(angle),
          cy + bondLength * Math.sin(angle),
          cz
        ])
      }
      break
      
    case 'tetrahedral':
      // Tetrahedral bond angles (~109.5°)
      const tetraCoords = [
        [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]
      ]
      for (let i = 0; i < Math.min(numAtoms, 4); i++) {
        const [x, y, z] = tetraCoords[i]
        const factor = bondLength / Math.sqrt(3)
        positions.push([cx + x * factor, cy + y * factor, cz + z * factor])
      }
      break
      
    case 'trigonalPyramidal':
      // NH3-like structure with lone pair
      const pyramidAngle = Math.PI * 107.8 / 180 // NH3 bond angle
      for (let i = 0; i < numAtoms; i++) {
        const angle = (2 * Math.PI * i) / numAtoms
        positions.push([
          cx + bondLength * Math.cos(angle) * Math.sin(pyramidAngle),
          cy + bondLength * Math.sin(angle) * Math.sin(pyramidAngle),
          cz - bondLength * Math.cos(pyramidAngle)
        ])
      }
      break
      
    case 'bent':
      // H2O-like structure (~104.5°)
      const bentAngle = Math.PI * 104.5 / 180
      for (let i = 0; i < numAtoms; i++) {
        const angle = (i - (numAtoms - 1) / 2) * bentAngle / (numAtoms - 1)
        positions.push([
          cx + bondLength * Math.cos(angle),
          cy + bondLength * Math.sin(angle),
          cz
        ])
      }
      break
      
    default:
      // Default to linear if geometry unknown
      for (let i = 0; i < numAtoms; i++) {
        positions.push([cx + (i - (numAtoms - 1) / 2) * bondLength, cy, cz])
      }
  }
  
  return positions
}

// Create a molecule structure from a chemical formula with proper geometry
const createMoleculeFromFormula = (name: string, formula: string): MolecularData => {
  const colors: Record<string, string> = {
    'H': '#ffffff', 'C': '#404040', 'N': '#3050f8', 'O': '#ff0d0d',
    'F': '#90e050', 'Ne': '#b3e3f5', 'Na': '#ab5cf2', 'Mg': '#8aff00',
    'Al': '#bfa6a6', 'Si': '#f0c8a0', 'P': '#ff8000', 'S': '#ffff30',
    'Cl': '#1ff01f', 'Ar': '#80d1e3', 'K': '#8f40d4', 'Ca': '#3dff00',
    'Ti': '#bfc2c7', 'Fe': '#e06633', 'Ni': '#50d050', 'Cu': '#c88033',
    'Zn': '#7d80b0', 'Br': '#a62929', 'I': '#940094', 'Li': '#cc80cc'
  }

  // Enhanced formula parser
  const parseFormula = (formula: string): Record<string, number> => {
    const elementCounts: Record<string, number> = {}
    
    // Clean formula by converting subscripts to regular numbers
    const cleanFormula = formula.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (match) => {
      const subscriptMap: Record<string, string> = {
        '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
        '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9'
      }
      return subscriptMap[match] || match
    })
    
    // Handle parentheses for complex formulas like Ca(OH)2
    const expandFormula = (f: string): string => {
      const parenRegex = /\(([^)]+)\)(\d*)/g
      return f.replace(parenRegex, (match, group, multiplier) => {
        const mult = parseInt(multiplier || '1', 10)
        let expanded = ''
        for (let i = 0; i < mult; i++) {
          expanded += group
        }
        return expanded
      })
    }
    
    const expandedFormula = expandFormula(cleanFormula)
    
    // Match element symbols with their counts
    const regex = /([A-Z][a-z]?)(\d*)/g
    let match
    
    while ((match = regex.exec(expandedFormula)) !== null) {
      const element = match[1]
      const count = parseInt(match[2] || '1', 10)
      elementCounts[element] = (elementCounts[element] || 0) + count
    }
    
    return elementCounts
  }

  const elementCounts = parseFormula(formula)
  const atoms: Atom[] = []
  const bonds: Bond[] = []

  // Determine central atom and molecular structure
  const elements = Object.keys(elementCounts)
  const totalAtoms = Object.values(elementCounts).reduce((sum, count) => sum + count, 0)
  
  // Find central atom (usually the one with lowest electronegativity, except H)
  const centralAtomPriority = ['C', 'Si', 'N', 'P', 'S', 'O', 'F', 'Cl', 'Br', 'I']
  const centralAtom = elements.find(el => centralAtomPriority.includes(el) && el !== 'H') || elements[0]
  
  if (totalAtoms === 1) {
    // Single atom
    const element = elements[0]
    atoms.push({
      element,
      position: [0, 0, 0],
      color: colors[element] || '#888888',
      radius: getAtomicRadius(element)
    })
  } else if (totalAtoms === 2 && elementCounts[elements[0]] === 1 && elementCounts[elements[1]] === 1) {
    // Diatomic molecule (O2, N2, etc.)
    const bondLength = 1.2
    elements.forEach((element, index) => {
      atoms.push({
        element,
        position: [index === 0 ? -bondLength/2 : bondLength/2, 0, 0],
        color: colors[element] || '#888888',
        radius: getAtomicRadius(element)
      })
    })
    
    bonds.push({
      start: atoms[0].position,
      end: atoms[1].position,
      type: 'single'
    })
  } else {
    // Multi-atom molecule - use central atom approach
    const centralCount = elementCounts[centralAtom] || 1
    const otherAtoms = Object.entries(elementCounts).filter(([el]) => el !== centralAtom)
    
    // Place central atom(s)
    for (let i = 0; i < centralCount; i++) {
      atoms.push({
        element: centralAtom,
        position: [i * 2, 0, 0], // Space out multiple central atoms
        color: colors[centralAtom] || '#888888',
        radius: getAtomicRadius(centralAtom)
      })
    }
    
    // Place peripheral atoms around each central atom
    for (let centralIndex = 0; centralIndex < centralCount; centralIndex++) {
      const centralPos = atoms[centralIndex].position
      let totalPeripheralAtoms = 0
      
      // Count total peripheral atoms for this central atom
      otherAtoms.forEach(([, count]) => totalPeripheralAtoms += count)
      
      // Determine molecular geometry
      const geometry = getMolecularGeometry(centralAtom, totalPeripheralAtoms)
      const bondLength = 1.5
      
      let peripheralIndex = 0
      otherAtoms.forEach(([element, count]) => {
        for (let i = 0; i < count; i++) {
          let position: [number, number, number]
          
          if (formula === 'NH3' || formula === 'NH₃') {
            // Special case for ammonia - trigonal pyramidal
            const pyramidPositions = generateGeometricPositions(centralPos, 3, 'trigonalPyramidal', bondLength)
            position = pyramidPositions[peripheralIndex % 3]
          } else if (formula === 'H2O' || formula === 'H₂O') {
            // Special case for water - bent
            const bentPositions = generateGeometricPositions(centralPos, 2, 'bent', bondLength)
            position = bentPositions[peripheralIndex % 2]
          } else if (formula === 'CH4' || formula === 'CH₄') {
            // Special case for methane - tetrahedral
            const tetraPositions = generateGeometricPositions(centralPos, 4, 'tetrahedral', bondLength)
            position = tetraPositions[peripheralIndex % 4]
          } else if (formula === 'CO2' || formula === 'CO₂') {
            // Special case for CO2 - linear
            const linearPositions = generateGeometricPositions(centralPos, 2, 'linear', bondLength)
            position = linearPositions[peripheralIndex % 2]
          } else {
            // General case - use geometry detection
            const geometricPositions = generateGeometricPositions(centralPos, totalPeripheralAtoms, geometry, bondLength)
            position = geometricPositions[peripheralIndex % geometricPositions.length]
          }
          
          atoms.push({
            element,
            position,
            color: colors[element] || '#888888',
            radius: getAtomicRadius(element)
          })
          
          // Create bond to central atom
          bonds.push({
            start: centralPos,
            end: position,
            type: 'single'
          })
          
          peripheralIndex++
        }
      })
    }
  }

  return {
    name,
    formula,
    atoms,
    bonds
  }
}

// Predefined molecular structures for common compounds
const getMolecularData = (
  compound: Array<{ element: string; molecules: number; weight: number }> | string, 
  reactionResult?: any
): MolecularData => {
  // If we have a reaction result with exact formula and name, use that
  if (reactionResult?.chemicalFormula && reactionResult?.compoundName) {
    const formattedFormula = formatChemicalFormula(reactionResult.chemicalFormula)
    
    // Try to get predefined structure first
    const predefined = getMolecule(reactionResult.compoundName)
    if (predefined.name !== 'Water') { // Default fallback check
      return {
        ...predefined,
        name: reactionResult.compoundName,
        formula: formattedFormula
      }
    }
    
    // If no predefined structure, create from formula
    return createMoleculeFromFormula(reactionResult.compoundName, formattedFormula)
  }

  // If compound is an array (new format), convert to compound name
  if (Array.isArray(compound)) {
    if (compound.length === 0) {
      return getDefaultMolecule()
    }

    const elements = compound.map(spec => spec.element)
    
    // Determine compound based on elements
    if (elements.includes('H') && elements.includes('O')) {
      return getMolecule('Water')
    } else if (elements.includes('C') && elements.includes('O')) {
      return getMolecule('Carbon Dioxide')
    } else if (elements.includes('N') && elements.includes('O')) {
      return getMolecule('Nitrogen Dioxide')
    } else if (elements.includes('C') && elements.includes('H')) {
      return getMolecule('Methane')
    } else if (elements.includes('Na') && elements.includes('Cl')) {
      return getMolecule('Sodium Chloride')
    } else if (elements.length === 1) {
      return getSingleAtom(elements[0])
    } else {
      return getGenericCompound(elements)
    }
  }

  // Handle string compound names (backward compatibility)
  return getMolecule(compound)
}

const getMolecule = (compoundName: string): MolecularData => {
  const molecules: Record<string, MolecularData> = {
    'Water': {
      name: 'Water',
      formula: 'H₂O',
      atoms: [
        { element: 'O', position: [0, 0, 0], color: '#ff0000', radius: 0.7 },
        { element: 'H', position: [-0.8, 0.6, 0], color: '#ffffff', radius: 0.4 },
        { element: 'H', position: [0.8, 0.6, 0], color: '#ffffff', radius: 0.4 }
      ],
      bonds: [
        { start: [0, 0, 0], end: [-0.8, 0.6, 0], type: 'single' },
        { start: [0, 0, 0], end: [0.8, 0.6, 0], type: 'single' }
      ]
    },
    'Methane': {
      name: 'Methane',
      formula: 'CH₄',
      atoms: [
        { element: 'C', position: [0, 0, 0], color: '#000000', radius: 0.6 },
        { element: 'H', position: [1, 1, 1], color: '#ffffff', radius: 0.4 },
        { element: 'H', position: [-1, -1, 1], color: '#ffffff', radius: 0.4 },
        { element: 'H', position: [-1, 1, -1], color: '#ffffff', radius: 0.4 },
        { element: 'H', position: [1, -1, -1], color: '#ffffff', radius: 0.4 }
      ],
      bonds: [
        { start: [0, 0, 0], end: [1, 1, 1], type: 'single' },
        { start: [0, 0, 0], end: [-1, -1, 1], type: 'single' },
        { start: [0, 0, 0], end: [-1, 1, -1], type: 'single' },
        { start: [0, 0, 0], end: [1, -1, -1], type: 'single' }
      ]
    },
    'Carbon Dioxide': {
      name: 'Carbon Dioxide',
      formula: 'CO₂',
      atoms: [
        { element: 'C', position: [0, 0, 0], color: '#000000', radius: 0.6 },
        { element: 'O', position: [-1.2, 0, 0], color: '#ff0000', radius: 0.7 },
        { element: 'O', position: [1.2, 0, 0], color: '#ff0000', radius: 0.7 }
      ],
      bonds: [
        { start: [0, 0, 0], end: [-1.2, 0, 0], type: 'double' },
        { start: [0, 0, 0], end: [1.2, 0, 0], type: 'double' }
      ]
    },
    'Sodium Chloride': {
      name: 'Sodium Chloride',
      formula: 'NaCl',
      atoms: [
        { element: 'Na', position: [0, 0, 0], color: '#ab5cf2', radius: 1.0 },
        { element: 'Cl', position: [2.3, 0, 0], color: '#00ff00', radius: 0.9 }
      ],
      bonds: [
        { start: [0, 0, 0], end: [2.3, 0, 0], type: 'single' }
      ]
    },
    'Nitrogen Dioxide': {
      name: 'Nitrogen Dioxide',
      formula: 'NO₂',
      atoms: [
        { element: 'N', position: [0, 0, 0], color: '#0000ff', radius: 0.6 },
        { element: 'O', position: [1.0, 0.5, 0], color: '#ff0000', radius: 0.7 },
        { element: 'O', position: [1.0, -0.5, 0], color: '#ff0000', radius: 0.7 }
      ],
      bonds: [
        { start: [0, 0, 0], end: [1.0, 0.5, 0], type: 'single' },
        { start: [0, 0, 0], end: [1.0, -0.5, 0], type: 'single' }
      ]
    }
  }

  return molecules[compoundName] || molecules['Water']
}

const getDefaultMolecule = (): MolecularData => {
  return {
    name: 'Empty Beaker',
    formula: '',
    atoms: [],
    bonds: []
  }
}

const getSingleAtom = (element: string): MolecularData => {
  const colors: Record<string, string> = {
    'H': '#ffffff',
    'C': '#000000',
    'N': '#0000ff',
    'O': '#ff0000',
    'Na': '#ab5cf2',
    'Cl': '#00ff00',
    'Fe': '#ffa500',
    'Li': '#cc80cc',
    'Ca': '#3dff00',
    'K': '#8f40d4',
    'Mg': '#8aff00'
  }

  return {
    name: element,
    formula: element,
    atoms: [
      { element, position: [0, 0, 0], color: colors[element] || '#888888', radius: 0.8 }
    ],
    bonds: []
  }
}

const getGenericCompound = (elements: string[]): MolecularData => {
  const colors: Record<string, string> = {
    'H': '#ffffff',
    'C': '#000000',
    'N': '#0000ff',
    'O': '#ff0000',
    'Na': '#ab5cf2',
    'Cl': '#00ff00',
    'Fe': '#ffa500',
    'Li': '#cc80cc',
    'Ca': '#3dff00',
    'K': '#8f40d4',
    'Mg': '#8aff00'
  }

  const atoms = elements.map((element, index) => ({
    element,
    position: [
      Math.cos((index / elements.length) * 2 * Math.PI) * 1.5,
      Math.sin((index / elements.length) * 2 * Math.PI) * 1.5,
      0
    ] as [number, number, number],
    color: colors[element] || '#888888',
    radius: 0.6
  }))

  const bonds = []
  for (let i = 0; i < atoms.length - 1; i++) {
    bonds.push({ 
      start: atoms[i].position, 
      end: atoms[i + 1].position, 
      type: 'single' as const 
    })
  }
  if (atoms.length > 2) {
    bonds.push({ 
      start: atoms[atoms.length - 1].position, 
      end: atoms[0].position, 
      type: 'single' as const 
    })
  }

  return {
    name: 'Custom Compound',
    formula: elements.join(''),
    atoms,
    bonds
  }
}

// Rotating molecule component
function MoleculeModel({ data }: { data: MolecularData }) {
  const groupRef = useRef<THREE.Group>(null)
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.01
    }
  })

  return (
    <group ref={groupRef}>
      {/* Atoms */}
      {data.atoms.map((atom, index) => (
        <group key={index} position={atom.position}>
          <Sphere args={[atom.radius, 32, 32]}>
            <meshStandardMaterial color={atom.color} />
          </Sphere>
          <Text
            position={[0, atom.radius + 0.3, 0]}
            fontSize={0.3}
            color="black"
            anchorX="center"
            anchorY="middle"
          >
            {atom.element}
          </Text>
        </group>
      ))}
      
      {/* Bonds */}
      {data.bonds.map((bond, index) => {
        const start = new THREE.Vector3(...bond.start)
        const end = new THREE.Vector3(...bond.end)
        const direction = end.clone().sub(start)
        const length = direction.length()
        const position = start.clone().add(end).multiplyScalar(0.5)
        
        // Calculate proper rotation for the cylinder
        const quaternion = new THREE.Quaternion()
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
        
        return (
          <group key={index} position={position.toArray()} quaternion={quaternion.toArray()}>
            <mesh>
              <cylinderGeometry args={[0.03, 0.03, length, 8]} />
              <meshStandardMaterial color="#666666" />
            </mesh>
            {bond.type === 'double' && (
              <mesh position={[0.1, 0, 0]}>
                <cylinderGeometry args={[0.02, 0.02, length, 8]} />
                <meshStandardMaterial color="#666666" />
              </mesh>
            )}
            {bond.type === 'triple' && (
              <>
                <mesh position={[0.08, 0, 0]}>
                  <cylinderGeometry args={[0.02, 0.02, length, 8]} />
                  <meshStandardMaterial color="#666666" />
                </mesh>
                <mesh position={[-0.08, 0, 0]}>
                  <cylinderGeometry args={[0.02, 0.02, length, 8]} />
                  <meshStandardMaterial color="#666666" />
                </mesh>
              </>
            )}
          </group>
        )
      })}
    </group>
  )
}

// Loading component
function LoadingFallback() {
  return (
    <Html center>
      <div className="text-white bg-black bg-opacity-50 px-4 py-2 rounded">
        Loading 3D Model...
      </div>
    </Html>
  )
}

// Validate if 3D structure is reliable
const validate3DStructure = (molecularData: MolecularData): boolean => {
  if (!molecularData || molecularData.atoms.length === 0) return false
  
  // Check if atoms have valid positions
  const hasValidPositions = molecularData.atoms.every(atom => 
    Array.isArray(atom.position) && 
    atom.position.length === 3 && 
    atom.position.every(coord => typeof coord === 'number' && !isNaN(coord))
  )
  
  // Check if bonds are reasonable
  const hasReasonableBonds = molecularData.bonds.every(bond => 
    Array.isArray(bond.start) && Array.isArray(bond.end) &&
    bond.start.length === 3 && bond.end.length === 3
  )
  
  // Check if structure makes chemical sense
  const hasCentralAtom = molecularData.atoms.length > 1 ? 
    molecularData.bonds.some(bond => 
      molecularData.atoms.some(atom => 
        JSON.stringify(atom.position) === JSON.stringify(bond.start) ||
        JSON.stringify(atom.position) === JSON.stringify(bond.end)
      )
    ) : true
  
  return hasValidPositions && hasReasonableBonds && hasCentralAtom
}

// Fallback 2D structure component
const Structure2D = ({ molecularData }: { molecularData: MolecularData }) => {
  const [imageError, setImageError] = useState(false)
  
  // Try to get 2D structure from PubChem or ChemSpider
  const get2DImageUrl = (formula: string, name: string): string => {
    // Clean formula for API
    const cleanFormula = formula.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (match) => {
      const subscriptMap: Record<string, string> = {
        '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
        '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9'
      }
      return subscriptMap[match] || match
    })
    
    // Use PubChem REST API for 2D structure
    return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/PNG?image_size=300x300`
  }
  
  const fallbackToLocal2D = (formula: string): string => {
    // Generate simple SVG for common molecules
    const svgTemplates: Record<string, string> = {
      'H₂O': `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="30" r="8" fill="#ff0000"/>
        <circle cx="10" cy="15" r="4" fill="#ffffff"/>
        <circle cx="10" cy="45" r="4" fill="#ffffff"/>
        <line x1="20" y1="30" x2="14" y2="19" stroke="#000" stroke-width="2"/>
        <line x1="20" y1="30" x2="14" y2="41" stroke="#000" stroke-width="2"/>
        <text x="25" y="35" font-size="12" fill="#000">H₂O</text>
      </svg>`,
      'NH₃': `<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="40" r="8" fill="#3050f8"/>
        <circle cx="35" cy="25" r="4" fill="#ffffff"/>
        <circle cx="35" cy="55" r="4" fill="#ffffff"/>
        <circle cx="65" cy="40" r="4" fill="#ffffff"/>
        <line x1="50" y1="40" x2="39" y2="29" stroke="#000" stroke-width="2"/>
        <line x1="50" y1="40" x2="39" y2="51" stroke="#000" stroke-width="2"/>
        <line x1="50" y1="40" x2="61" y2="40" stroke="#000" stroke-width="2"/>
        <text x="70" y="45" font-size="12" fill="#000">NH₃</text>
      </svg>`,
      'CO₂': `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="6" fill="#ff0000"/>
        <circle cx="60" cy="20" r="8" fill="#404040"/>
        <circle cx="100" cy="20" r="6" fill="#ff0000"/>
        <line x1="26" y1="20" x2="52" y2="20" stroke="#000" stroke-width="3"/>
        <line x1="68" y1="20" x2="94" y2="20" stroke="#000" stroke-width="3"/>
        <text x="40" y="35" font-size="12" fill="#000">CO₂</text>
      </svg>`
    }
    
    const svg = svgTemplates[formula] || `<svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
      <text x="10" y="25" font-size="16" fill="#000">${formula}</text>
    </svg>`
    
    return `data:image/svg+xml;base64,${btoa(svg)}`
  }
  
  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className="text-center mb-4">
        <h4 className="text-sm font-medium text-gray-700">2D Structure</h4>
        <p className="text-xs text-gray-500">{molecularData.formula}</p>
      </div>
      
      {!imageError ? (
        <img 
          src={get2DImageUrl(molecularData.formula, molecularData.name)}
          alt={`2D structure of ${molecularData.name}`}
          className="max-w-full max-h-32 object-contain"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <img 
            src={fallbackToLocal2D(molecularData.formula)}
            alt={`Local 2D structure of ${molecularData.name}`}
            className="max-w-full max-h-24 object-contain mx-auto"
          />
          <p className="text-xs text-gray-400 mt-2">Simplified structure</p>
        </div>
      )}
    </div>
  )
}

export default function MolecularViewer3D({ compound, reactionResult }: MolecularViewer3DProps) {
  const [molecularData, setMolecularData] = useState<MolecularData | null>(null)
  const [show3D, setShow3D] = useState(true)
  const [is3DValid, setIs3DValid] = useState(true)
  const [isDarkTheme, setIsDarkTheme] = useState(false)

  // Check theme
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

  useEffect(() => {
    if (compound) {
      const data = getMolecularData(compound, reactionResult)
      setMolecularData(data)
      
      // Validate 3D structure
      const isValid = validate3DStructure(data)
      setIs3DValid(isValid)
      
      // If 3D is invalid, default to 2D
      if (!isValid) {
        setShow3D(false)
      }
    } else {
      setMolecularData(getDefaultMolecule())
      setIs3DValid(true)
      setShow3D(true)
    }
  }, [compound, reactionResult])

  if (!molecularData) {
    return (
      <div className={`rounded-lg p-4 h-64 flex items-center justify-center ${
        isDarkTheme ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600'
      }`}>
        <p>Loading molecular viewer...</p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border overflow-hidden ${
      isDarkTheme ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className={`p-3 border-b flex justify-between items-center ${
        isDarkTheme 
          ? 'bg-slate-800 border-slate-700 text-white' 
          : 'bg-gray-50 border-gray-200 text-black'
      }`}>
        <div>
          <h3 className="text-lg font-semibold">{molecularData.name}</h3>
          <p className={`text-sm ${isDarkTheme ? 'text-slate-400' : 'text-gray-600'}`}>
            {molecularData.formula}
          </p>
        </div>
        
        {/* View Toggle */}
        <div className="flex gap-2">
          {is3DValid && (
            <button
              onClick={() => setShow3D(true)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                show3D 
                  ? isDarkTheme 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-purple-600 text-white'
                  : isDarkTheme 
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              3D
            </button>
          )}
          <button
            onClick={() => setShow3D(false)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              !show3D 
                ? isDarkTheme 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-purple-600 text-white'
                : isDarkTheme 
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            2D
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div className={`h-48 ${
        isDarkTheme 
          ? 'bg-gradient-to-br from-slate-800 to-slate-900' 
          : 'bg-gradient-to-br from-blue-50 to-indigo-100'
      }`}>
        {show3D && is3DValid ? (
          // 3D View
          molecularData.atoms.length > 0 ? (
            <Canvas camera={{ position: [3, 3, 3] }}>
              <ambientLight intensity={0.6} />
              <pointLight position={[5, 5, 5]} />
              
              <Suspense fallback={<LoadingFallback />}>
                <MoleculeModel data={molecularData} />
              </Suspense>
              
              <OrbitControls 
                enablePan={false}
                enableZoom={true}
                enableRotate={true}
                minDistance={2}
                maxDistance={8}
                autoRotate={true}
                autoRotateSpeed={1}
              />
            </Canvas>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className={`text-sm ${isDarkTheme ? 'text-slate-400' : 'text-gray-500'}`}>
                Add elements to see molecular structure
              </p>
            </div>
          )
        ) : (
          // 2D View or Fallback
          !is3DValid ? (
            <div className="h-full flex flex-col items-center justify-center p-4">
              <div className={`text-center mb-3 ${isDarkTheme ? 'text-slate-300' : 'text-gray-700'}`}>
                <p className="text-sm font-medium">3D model not available</p>
                <p className="text-xs">Showing 2D structure instead</p>
              </div>
              <Structure2D molecularData={molecularData} />
            </div>
          ) : (
            <Structure2D molecularData={molecularData} />
          )
        )}
      </div>

      {/* Controls Info */}
      <div className={`p-3 border-t ${
        isDarkTheme 
          ? 'bg-slate-800 border-slate-700 text-slate-400' 
          : 'bg-gray-50 border-gray-200 text-gray-600'
      }`}>
        <div className="text-xs text-center">
          {show3D && is3DValid 
            ? 'Click and drag to rotate • Scroll to zoom'
            : 'Viewing 2D chemical structure'
          }
        </div>
      </div>
    </div>
  )
}
