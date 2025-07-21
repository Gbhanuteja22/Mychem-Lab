import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface ElementSpec {
  element: string;
  molecules: number;
  weight: number;
}

export interface ChemicalReactionParams {
  elements: string[] | ElementSpec[];
  temperature?: number;
  pressure?: number;
  volume?: number;
  weight?: number;
  mode: 'play' | 'practical';
}

export interface ChemicalReactionResult {
  compoundName: string;
  chemicalFormula: string;
  color: string;
  state: 'solid' | 'liquid' | 'gas' | 'plasma';
  safetyWarnings: string[];
  explanation: string;
  reactionEquation?: string;
  temperature?: number;
  pressure?: number;
}

/**
 * GeminiChemistryAI wraps the Google Gemini model for predicting chemical reactions.
 */
export class GeminiChemistryAI {
  private model: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor() {
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
    this.model = genAI.getGenerativeModel({ model: modelName });
  }

  /**
   * Calls the Gemini model with a chemistry prompt and parses the result.
   */
  async predictReaction(params: ChemicalReactionParams): Promise<ChemicalReactionResult> {
    console.log('=== GEMINI AI PREDICTION START ===');
    console.log('Received elements in order:', params.elements);
    console.log('Mode:', params.mode);
    console.log('Additional params:', { 
      temperature: params.temperature, 
      pressure: params.pressure, 
      volume: params.volume, 
      weight: params.weight 
    });
    
    try {
      const prompt = this.buildPrompt(params);
      console.log('Generated prompt:', prompt);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('AI response received:', text);
      
      const parsedResult = this.parseResponse(text, params);
      console.log('Parsed result:', parsedResult);
      console.log('=== GEMINI AI PREDICTION COMPLETE ===');
      
      return parsedResult;
    } catch (error) {
      console.error('=== GEMINI AI PREDICTION ERROR ===');
      console.error('Error predicting reaction:', error);
      const fallbackResult = this.getFallbackResult(params);
      console.log('Using fallback result:', fallbackResult);
      return fallbackResult;
    }
  }

  /**
   * Builds the prompt text based on the mode and reaction parameters.
   */
  private buildPrompt(params: ChemicalReactionParams): string {
    const { elements, temperature, pressure, volume, weight, mode } = params;
    
    // Convert elements to string format for the prompt
    const elementNames = Array.isArray(elements) && elements.length > 0 && typeof elements[0] === 'object'
      ? (elements as ElementSpec[]).map(spec => `${spec.molecules} molecules of ${spec.element} (${spec.weight}g)`)
      : (elements as string[]);

    if (mode === 'play') {
      return `Predict reaction when mixing: ${Array.isArray(elementNames) ? elementNames.join(' + ') : elementNames}.
Provide JSON with fields: compoundName, chemicalFormula, color, state, safetyWarnings (array), explanation.
Make the explanation detailed and scientific - include reaction mechanism, molecular interactions, energy changes, and real-world applications. Write at least 2 full paragraphs.`;
    } else {
      const elementsText = Array.isArray(elementNames) ? elementNames.join(' + ') : elementNames;
      return `Predict reaction for ${elementsText} at ${temperature}°C, ${pressure} atm, ${volume} mL, ${weight}g.
Provide JSON with: compoundName, chemicalFormula, reactionEquation, color, state, safetyWarnings (array), explanation, temperature, pressure.
Make the explanation comprehensive and scientific - include detailed reaction mechanism, thermodynamics, kinetics, limiting reagent analysis, theoretical yield calculations, molecular orbital theory if applicable, and practical applications. Write at least 2 detailed paragraphs with scientific depth.`;
    }
  }

  /**
   * Parses the first JSON object in the AI response; falls back on default logic if parsing fails.
   */
  private parseResponse(text: string, params: ChemicalReactionParams): ChemicalReactionResult {
    try {
      const match = text.match(/\{[\s\S]*?\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        
        // Clean temperature and pressure values to be numbers only
        let temperature = parsed.temperature;
        let pressure = parsed.pressure;
        let color = parsed.color;
        
        if (typeof temperature === 'string') {
          temperature = parseFloat(temperature.replace(/[^\d.-]/g, '')) || params.temperature;
        }
        
        if (typeof pressure === 'string') {
          pressure = parseFloat(pressure.replace(/[^\d.-]/g, '')) || params.pressure;
        }
        
        // Handle color values that aren't valid CSS colors
        if (typeof color === 'string') {
          const normalizedColor = color.toLowerCase();
          if (normalizedColor === 'colorless' || normalizedColor === 'clear' || normalizedColor === 'transparent') {
            color = '#e0f2fe'; // Light blue for clear/colorless
          } else if (normalizedColor === 'white') {
            color = '#f8fafc'; // Off-white that's visible
          } else if (normalizedColor === 'black') {
            color = '#1f2937'; // Dark gray instead of pure black
          }
        }
        
        return {
          compoundName: parsed.compoundName || 'Unknown Compound',
          chemicalFormula: parsed.chemicalFormula || 'Unknown',
          color: color || '#e0f2fe',
          state: parsed.state || 'liquid',
          safetyWarnings: parsed.safetyWarnings || [],
          explanation: parsed.explanation || 'No explanation provided.',
          reactionEquation: parsed.reactionEquation,
          temperature: temperature,
          pressure: pressure,
        };
      }
    } catch (error) {
      console.error('Error parsing AI response JSON:', error);
    }
    return this.getFallbackResult(params);
  }

  /**
   * Provides simple fallback results for common reactions or generic mixing.
   */
  private getFallbackResult(params: ChemicalReactionParams): ChemicalReactionResult {
    const { elements } = params;
    
    // Helper function to check if element exists in the list
    const hasElement = (elementName: string): boolean => {
      if (Array.isArray(elements) && elements.length > 0 && typeof elements[0] === 'object') {
        return (elements as ElementSpec[]).some(spec => spec.element === elementName);
      }
      return (elements as string[]).includes(elementName);
    };
    
    // Helper function to get element names as strings
    const getElementNames = (): string[] => {
      if (Array.isArray(elements) && elements.length > 0 && typeof elements[0] === 'object') {
        return (elements as ElementSpec[]).map(spec => spec.element);
      }
      return elements as string[];
    };

    if (hasElement('Sodium') && hasElement('Chlorine')) {
      return {
        compoundName: 'Sodium Chloride',
        chemicalFormula: 'NaCl',
        color: '#f8fafc',
        state: 'solid',
        safetyWarnings: ['Handle with care'],
        explanation: 'Sodium and chlorine undergo a highly exothermic redox reaction where sodium loses one electron (Na → Na⁺ + e⁻) and chlorine gains one electron (Cl₂ + 2e⁻ → 2Cl⁻) to form ionic bonds. This electron transfer creates a strong electrostatic attraction between the oppositely charged ions, resulting in the formation of sodium chloride crystals with a face-centered cubic lattice structure. The reaction releases approximately 411 kJ/mol of energy, making it thermodynamically favorable and essentially irreversible under standard conditions. Sodium chloride is widely used in food preservation, chemical manufacturing, and as a de-icing agent due to its ability to lower the freezing point of water through colligative properties.',
      };
    }

    if (hasElement('Hydrogen') && hasElement('Oxygen')) {
      return {
        compoundName: 'Water',
        chemicalFormula: 'H₂O',
        color: '#e0f2fe',
        state: 'liquid',
        safetyWarnings: ['Exothermic reaction may produce heat'],
        explanation: 'The formation of water from hydrogen and oxygen is a highly exothermic combustion reaction (2H₂ + O₂ → 2H₂O) that releases 286 kJ/mol of energy per mole of water formed. This reaction proceeds through a radical chain mechanism involving the formation of hydroxyl radicals (OH•) and hydrogen radicals (H•) as intermediates. The molecular orbital theory explains the stability of water through the overlap of hydrogen 1s orbitals with oxygen 2p orbitals, creating polar covalent bonds with a bond angle of approximately 104.5° due to the tetrahedral electron geometry around oxygen. Water\'s unique properties including high boiling point, surface tension, and ability to act as both acid and base make it essential for biological systems and industrial processes. The reaction kinetics are typically fast at elevated temperatures but require an activation energy input, often provided by a spark or catalyst, to initiate the chain reaction.',
      };
    }

    const elementNames = getElementNames();
    return {
      compoundName: 'Mixed Compound',
      chemicalFormula: 'Unknown',
      color: '#e0f2fe',
      state: 'liquid',
      safetyWarnings: ['Unknown reaction - proceed with caution'],
      explanation: `Mixed ${elementNames.join(' + ')}.`,
    };
  }
}

export const geminiAI = new GeminiChemistryAI();
