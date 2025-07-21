import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Types for chemistry calculations
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
  state: string;
  safetyWarnings: string[];
  explanation: string;
  reactionEquation?: string;
  temperature?: number;
  pressure?: number;
}

export class GeminiChemistryAI {
  private model;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * Main function to predict chemical reactions using Gemini AI
   */
  async predictReaction(params: ChemicalReactionParams): Promise<ChemicalReactionResult> {
    console.log('=== GEMINI AI PREDICTION START ===');
    console.log('Received elements in order:', params.elements);
    console.log('Mode:', params.mode);
    
    // Only log additional params if they have actual values (not undefined)
    const additionalParams = {
      ...(params.temperature !== undefined && { temperature: params.temperature }),
      ...(params.pressure !== undefined && { pressure: params.pressure }),
      ...(params.volume !== undefined && { volume: params.volume }),
      ...(params.weight !== undefined && { weight: params.weight })
    };
    
    if (Object.keys(additionalParams).length > 0) {
      console.log('Additional params:', additionalParams);
    }
    
    // Retry logic with exponential backoff for API errors
    const maxRetries = 3;
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
      } catch (error: any) {
        lastError = error;
        console.error(`=== GEMINI AI PREDICTION ERROR (Attempt ${attempt}/${maxRetries}) ===`);
        console.error('Error predicting reaction:', error);
        
        // If it's a 503 (overloaded) or rate limit error, wait and retry
        if (attempt < maxRetries && (
          error.message?.includes('503') || 
          error.message?.includes('overloaded') || 
          error.message?.includes('rate limit')
        )) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`API overloaded, waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // For other errors or final attempt, break and use fallback
        break;
      }
    }
    
    console.error('All retry attempts failed, using fallback result');
    const fallbackResult = this.getFallbackResult(params);
    console.log('Using fallback result:', fallbackResult);
    return fallbackResult;
  }

  /**
   * Builds the prompt text based on the mode and reaction parameters.
   */
  private buildPrompt(params: ChemicalReactionParams): string {
    const { elements, temperature = 25, pressure = 1, volume = 100, weight = 1, mode } = params;
    
    // Convert elements to string format for the prompt
    const elementNames = Array.isArray(elements) && elements.length > 0 && typeof elements[0] === 'object'
      ? (elements as ElementSpec[]).map(spec => `${spec.molecules || 1} molecules of ${spec.element} (${spec.weight || 1}g)`)
      : (elements as string[]);

    if (mode === 'play') {
      const elementsText = Array.isArray(elementNames) ? elementNames.join(' + ') : elementNames;
      return `Analyze the chemical reaction when combining: ${elementsText}.

CRITICAL INSTRUCTIONS:
1. Predict the MOST LIKELY chemical compound that would form from these elements
2. Consider stoichiometry, electronegativity, and common oxidation states
3. If multiple compounds are possible, choose the most stable one under standard conditions
4. Provide realistic chemical and physical properties
5. Return ONLY valid JSON with NO line breaks or control characters in string values

Required JSON format (respond with valid JSON only):
{
  "compoundName": "Name of the compound formed",
  "chemicalFormula": "Chemical formula",
  "color": "Color description",
  "state": "Physical state at room temperature",
  "safetyWarnings": ["Warning 1", "Warning 2"],
  "explanation": "Detailed explanation of the reaction mechanism and properties"
}`;
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
    console.log('Raw AI response received (first 500 chars):', text.substring(0, 500));
    
    // Skip JSON parsing entirely and go directly to manual extraction
    // This is more robust for handling AI responses with embedded control characters
    try {
      const manualResult = this.extractFieldsFromText(text, params);
      console.log('Manual extraction successful:', manualResult);
      return manualResult;
    } catch (extractError) {
      console.error('Manual extraction failed:', extractError);
      return this.getFallbackResult(params);
    }
  }

  /**
   * Processes a successfully parsed JSON response
   */
  private processValidJsonResponse(parsed: any, params: ChemicalReactionParams): ChemicalReactionResult {
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
    if (typeof color === 'string') {
      color = this.getColorCode(color);
    }

    return {
      compoundName: parsed.compoundName || 'Unknown Compound',
      chemicalFormula: parsed.chemicalFormula || 'Unknown',
      color: color || '#e0f2fe',
      state: parsed.state || 'unknown',
      safetyWarnings: Array.isArray(parsed.safetyWarnings) ? parsed.safetyWarnings : ['Handle with care'],
      explanation: parsed.explanation || 'No explanation available.',
      reactionEquation: parsed.reactionEquation,
      temperature: temperature,
      pressure: pressure
    };
  }

  /**
   * Manually extracts fields from text when JSON parsing fails
   */
  private extractFieldsFromText(text: string, params: ChemicalReactionParams): ChemicalReactionResult {
    console.log('Attempting manual field extraction...');
    
    // Extract fields using more flexible regex patterns
    const compoundNameMatch = text.match(/"compoundName":\s*"([^"]*?)"/) || text.match(/compoundName['":\s]+([A-Za-z0-9\s,()]+)/);
    const formulaMatch = text.match(/"chemicalFormula":\s*"([^"]*?)"/) || text.match(/chemicalFormula['":\s]+([A-Za-z0-9₀-₉]+)/);
    const colorMatch = text.match(/"color":\s*"([^"]*?)"/) || text.match(/color['":\s]+([A-Za-z\s()]+)/);
    const stateMatch = text.match(/"state":\s*"([^"]*?)"/) || text.match(/state['":\s]+([A-Za-z\s()]+)/);
    
    // Extract explanation with more flexible pattern (use multiline content)
    const cleanText = text.replace(/[\r\n]+/g, ' ');
    const explanationMatch = cleanText.match(/"explanation":\s*"([^"]*?)"/) || 
                           cleanText.match(/explanation['":\s]+([^"}{]+)/) ||
                           cleanText.match(/reaction[^.]*?\..*?\..*?\./);
    
    // Extract safety warnings array with better handling
    const safetyWarningsMatch = text.match(/"safetyWarnings":\s*\[(.*?)\]/);
    let safetyWarnings = ['Handle with care'];
    if (safetyWarningsMatch) {
      const warningsText = safetyWarningsMatch[1];
      const warnings = warningsText.match(/"([^"]+)"/g);
      if (warnings && warnings.length > 0) {
        safetyWarnings = warnings.map(w => w.replace(/"/g, '').trim()).filter(w => w.length > 0);
      }
    }

    // Create result with extracted data
    const result = {
      compoundName: compoundNameMatch ? compoundNameMatch[1].trim() : 'Unknown Compound',
      chemicalFormula: formulaMatch ? formulaMatch[1].trim() : 'Unknown',
      color: colorMatch ? this.getColorCode(colorMatch[1].trim()) : '#e0f2fe',
      state: stateMatch ? stateMatch[1].trim().toLowerCase() : 'unknown',
      safetyWarnings: safetyWarnings,
      explanation: explanationMatch ? explanationMatch[1].trim().substring(0, 500) + '...' : 'Chemical reaction analysis.',
      temperature: params.temperature,
      pressure: params.pressure
    };

    console.log('Extracted result:', result);
    return result;
  }

  /**
   * Converts color names to hex codes for UI display
   */
  private getColorCode(colorName: string): string {
    const colorMap: { [key: string]: string } = {
      'red': '#ef4444',
      'blue': '#3b82f6',
      'green': '#22c55e',
      'yellow': '#eab308',
      'orange': '#f97316',
      'purple': '#a855f7',
      'pink': '#ec4899',
      'brown': '#a3a3a3',
      'black': '#000000',
      'white': '#ffffff',
      'gray': '#6b7280',
      'grey': '#6b7280',
      'clear': '#e0f2fe',
      'colorless': '#e0f2fe',
      'transparent': '#e0f2fe'
    };

    const normalizedColor = colorName.toLowerCase().trim();
    return colorMap[normalizedColor] || '#e0f2fe';
  }

  /**
   * Provides a fallback result when AI parsing fails
   */
  private getFallbackResult(params: ChemicalReactionParams): ChemicalReactionResult {
    const elementNames = Array.isArray(params.elements) && params.elements.length > 0 && typeof params.elements[0] === 'object'
      ? (params.elements as ElementSpec[]).map(spec => spec.element)
      : (params.elements as string[]);
    
    const elementString = Array.isArray(elementNames) ? elementNames.join(' + ') : elementNames;
    
    // Provide specific fallbacks for common combinations
    if (elementNames.includes('Hydrogen') && elementNames.includes('Oxygen')) {
      return {
        compoundName: 'Water',
        chemicalFormula: 'H₂O',
        color: '#e0f2fe',
        state: 'liquid',
        safetyWarnings: ['Exothermic reaction may produce heat'],
        explanation: `The formation of water from hydrogen and oxygen is a highly exothermic combustion reaction (2H₂ + O₂ → 2H₂O) that releases 286 kJ/mol of energy per mole of water formed. This reaction proceeds through a radical chain mechanism involving the formation of hydroxyl radicals (OH•) and hydrogen radicals (H•) as intermediates. The molecular orbital theory explains the stability of water through the overlap of hydrogen 1s orbitals with oxygen 2p orbitals, creating polar covalent bonds with a bond angle of approximately 104.5° due to the tetrahedral electron geometry around oxygen. Water's unique properties including high boiling point, surface tension, and ability to act as both acid and base make it essential for biological systems and industrial processes.`
      };
    }
    
    if (elementNames.includes('Sodium') && elementNames.includes('Chlorine')) {
      return {
        compoundName: 'Sodium Chloride',
        chemicalFormula: 'NaCl',
        color: '#f8fafc',
        state: 'solid',
        safetyWarnings: ['Ionic compound - handle with care', 'Avoid inhalation'],
        explanation: `The reaction between sodium and chlorine forms sodium chloride through ionic bonding. Sodium readily loses its valence electron to achieve a stable electron configuration, while chlorine gains an electron to complete its valence shell. This electron transfer creates Na⁺ and Cl⁻ ions that are held together by strong electrostatic forces in a cubic crystal lattice structure.`
      };
    }
    
    if (elementNames.includes('Potassium') && elementNames.includes('Chlorine')) {
      return {
        compoundName: 'Potassium Chloride',
        chemicalFormula: 'KCl',
        color: '#f8fafc',
        state: 'solid',
        safetyWarnings: ['Ionic compound - handle with care', 'Avoid inhalation'],
        explanation: `Potassium and chlorine react to form potassium chloride through ionic bonding (2K + Cl₂ → 2KCl). This is a highly exothermic reaction where potassium loses its outer electron to chlorine, forming K⁺ and Cl⁻ ions. The resulting white crystalline salt is commonly used as a fertilizer and salt substitute.`
      };
    }
    
    if (elementNames.includes('Carbon') && elementNames.includes('Oxygen')) {
      return {
        compoundName: 'Carbon Dioxide',
        chemicalFormula: 'CO₂',
        color: '#e0f2fe',
        state: 'gas',
        safetyWarnings: ['Asphyxiant gas - ensure ventilation', 'Greenhouse gas'],
        explanation: `The combustion of carbon with oxygen produces carbon dioxide through a highly exothermic reaction (C + O₂ → CO₂). This reaction involves breaking the O=O double bond and forming two new C=O double bonds, which are more stable and release significant energy. Carbon dioxide is a linear, nonpolar molecule essential for photosynthesis and respiration in biological systems.`
      };
    }
    
    if (elementNames.includes('Carbon') && elementNames.includes('Hydrogen')) {
      return {
        compoundName: 'Methane',
        chemicalFormula: 'CH₄',
        color: '#e0f2fe',
        state: 'gas',
        safetyWarnings: ['Flammable gas', 'Asphyxiant in high concentrations'],
        explanation: `The combination of carbon and hydrogen forms methane, the simplest hydrocarbon. This reaction (C + 2H₂ → CH₄) requires high energy input to break the strong bonds in both reactants. Methane has a tetrahedral molecular geometry with sp³ hybridized carbon, making it a stable and widely used fuel gas.`
      };
    }
    
    if (elementNames.includes('Iron') && elementNames.includes('Oxygen')) {
      return {
        compoundName: 'Iron Oxide',
        chemicalFormula: 'Fe₂O₃',
        color: '#dc2626',
        state: 'solid',
        safetyWarnings: ['May cause respiratory irritation', 'Avoid inhalation of dust'],
        explanation: `Iron reacts with oxygen to form iron(III) oxide, commonly known as rust. This oxidation reaction (4Fe + 3O₂ → 2Fe₂O₃) is thermodynamically favorable and occurs readily in the presence of moisture. The reddish-brown compound has ionic character with Fe³⁺ and O²⁻ ions.`
      };
    }
    
    if (elementNames.includes('Nitrogen') && elementNames.includes('Oxygen')) {
      return {
        compoundName: 'Nitrogen Dioxide',
        chemicalFormula: 'NO₂',
        color: '#dc2626',
        state: 'gas',
        safetyWarnings: ['Toxic gas', 'Avoid inhalation', 'Corrosive to respiratory system'],
        explanation: `Nitrogen and oxygen combine to form nitrogen dioxide, a reddish-brown toxic gas. The reaction (N₂ + 2O₂ → 2NO₂) requires high energy and typically occurs at elevated temperatures. NO₂ is an important atmospheric pollutant and plays a role in smog formation.`
      };
    }
    
    if (elementNames.includes('Calcium') && elementNames.includes('Oxygen')) {
      return {
        compoundName: 'Calcium Oxide',
        chemicalFormula: 'CaO',
        color: '#f8fafc',
        state: 'solid',
        safetyWarnings: ['Caustic - avoid skin contact', 'Reacts violently with water'],
        explanation: `Calcium reacts with oxygen to form calcium oxide (quicklime), a highly exothermic reaction (2Ca + O₂ → 2CaO). This white, crystalline compound is widely used in construction and chemical industries.`
      };
    }
    
    if (elementNames.includes('Magnesium') && elementNames.includes('Oxygen')) {
      return {
        compoundName: 'Magnesium Oxide',
        chemicalFormula: 'MgO',
        color: '#f8fafc',
        state: 'solid',
        safetyWarnings: ['Handle with care', 'Avoid inhalation of powder'],
        explanation: `Magnesium burns in oxygen to produce magnesium oxide in a brilliant white flame (2Mg + O₂ → 2MgO). This reaction releases significant energy and produces a basic oxide.`
      };
    }
    
    if (elementNames.includes('Sulfur') && elementNames.includes('Oxygen')) {
      return {
        compoundName: 'Sulfur Dioxide',
        chemicalFormula: 'SO₂',
        color: '#e0f2fe',
        state: 'gas',
        safetyWarnings: ['Toxic gas', 'Respiratory irritant', 'Ensure proper ventilation'],
        explanation: `Sulfur burns in oxygen to form sulfur dioxide (S + O₂ → SO₂), a colorless gas with a pungent odor. This compound is important in acid rain formation and industrial processes.`
      };
    }
    
    if (elementNames.includes('Aluminum') && elementNames.includes('Oxygen')) {
      return {
        compoundName: 'Aluminum Oxide',
        chemicalFormula: 'Al₂O₃',
        color: '#f8fafc',
        state: 'solid',
        safetyWarnings: ['Handle with care', 'Avoid inhalation of powder'],
        explanation: `Aluminum reacts with oxygen to form aluminum oxide (4Al + 3O₂ → 2Al₂O₃), a white crystalline compound known as alumina. This reaction is highly exothermic and forms a protective oxide layer on aluminum metal.`
      };
    }
    
    if (elementNames.includes('Zinc') && elementNames.includes('Oxygen')) {
      return {
        compoundName: 'Zinc Oxide',
        chemicalFormula: 'ZnO',
        color: '#f8fafc',
        state: 'solid',
        safetyWarnings: ['Handle with care', 'Avoid inhalation'],
        explanation: `Zinc burns in oxygen to form zinc oxide (2Zn + O₂ → 2ZnO), a white powder commonly used in sunscreens and cosmetics due to its UV-blocking properties.`
      };
    }
    
    if (elementNames.includes('Lithium') && elementNames.includes('Oxygen')) {
      return {
        compoundName: 'Lithium Oxide',
        chemicalFormula: 'Li₂O',
        color: '#f8fafc',
        state: 'solid',
        safetyWarnings: ['Caustic - avoid contact', 'Reacts with water'],
        explanation: `Lithium reacts with oxygen to form lithium oxide (4Li + O₂ → 2Li₂O), a white ionic compound that readily absorbs moisture and carbon dioxide from air.`
      };
    }
    
    if (elementNames.includes('Copper') && elementNames.includes('Oxygen')) {
      return {
        compoundName: 'Copper Oxide',
        chemicalFormula: 'CuO',
        color: '#000000',
        state: 'solid',
        safetyWarnings: ['Handle with care', 'Avoid inhalation'],
        explanation: `Copper reacts with oxygen to form copper(II) oxide (2Cu + O₂ → 2CuO), a black solid that forms when copper is heated in air. This compound is used in ceramics and as a catalyst.`
      };
    }
    
    if (elementNames.includes('Fluorine') && elementNames.includes('Hydrogen')) {
      return {
        compoundName: 'Hydrogen Fluoride',
        chemicalFormula: 'HF',
        color: '#e0f2fe',
        state: 'gas',
        safetyWarnings: ['EXTREMELY DANGEROUS', 'Highly toxic and corrosive', 'Can cause severe burns'],
        explanation: `Hydrogen and fluorine react violently to form hydrogen fluoride (H₂ + F₂ → 2HF), an extremely dangerous compound that can penetrate skin and attack bones. Handle only in specialized facilities.`
      };
    }
    
    
    // If no specific combination found, try to predict using basic chemistry rules
    const predictedCompound = this.predictCompoundByRules(elementNames);
    if (predictedCompound) {
      return predictedCompound;
    }
    
    return {
      compoundName: 'Mixed Compound',
      chemicalFormula: 'Unknown',
      color: '#e0f2fe',
      state: 'unknown',
      safetyWarnings: ['Unknown reaction - proceed with caution'],
      explanation: `Chemical combination of ${elementString}. The exact products depend on reaction conditions, stoichiometry, and thermodynamic factors. Consider common oxidation states and bonding patterns.`
    };
  }

  /**
   * Predicts compounds using basic chemistry rules for common element combinations
   */
  private predictCompoundByRules(elementNames: string[]): ChemicalReactionResult | null {
    // Metal + Halogen combinations (ionic compounds)
    const metals = ['Sodium', 'Potassium', 'Lithium', 'Calcium', 'Magnesium', 'Aluminum', 'Iron', 'Zinc', 'Copper'];
    const halogens = ['Fluorine', 'Chlorine', 'Bromine', 'Iodine'];
    const nonmetals = ['Oxygen', 'Sulfur', 'Nitrogen', 'Phosphorus'];
    
    const foundMetal = elementNames.find(e => metals.includes(e));
    const foundHalogen = elementNames.find(e => halogens.includes(e));
    const foundNonmetal = elementNames.find(e => nonmetals.includes(e));
    
    // Metal + Halogen -> Ionic compound
    if (foundMetal && foundHalogen && elementNames.length === 2) {
      const metalSymbols: {[key: string]: string} = {
        'Sodium': 'Na', 'Potassium': 'K', 'Lithium': 'Li', 'Calcium': 'Ca', 
        'Magnesium': 'Mg', 'Aluminum': 'Al', 'Iron': 'Fe', 'Zinc': 'Zn', 'Copper': 'Cu'
      };
      const halogenSymbols: {[key: string]: string} = {
        'Fluorine': 'F', 'Chlorine': 'Cl', 'Bromine': 'Br', 'Iodine': 'I'
      };
      
      const metalSymbol = metalSymbols[foundMetal];
      const halogenSymbol = halogenSymbols[foundHalogen];
      
      return {
        compoundName: `${foundMetal} ${foundHalogen.replace('ine', 'ide')}`,
        chemicalFormula: `${metalSymbol}${halogenSymbol}`,
        color: '#f8fafc',
        state: 'solid',
        safetyWarnings: ['Ionic compound - handle with care', 'Avoid inhalation'],
        explanation: `${foundMetal} reacts with ${foundHalogen.toLowerCase()} to form an ionic compound through electron transfer. The metal loses electrons to form a positive ion, while the halogen gains electrons to form a negative ion, creating a stable ionic lattice.`
      };
    }
    
    // Metal + Oxygen -> Metal oxide
    if (foundMetal && elementNames.includes('Oxygen') && elementNames.length === 2) {
      const metalSymbols: {[key: string]: string} = {
        'Sodium': 'Na', 'Potassium': 'K', 'Lithium': 'Li', 'Calcium': 'Ca', 
        'Magnesium': 'Mg', 'Aluminum': 'Al', 'Iron': 'Fe', 'Zinc': 'Zn', 'Copper': 'Cu'
      };
      
      const metalSymbol = metalSymbols[foundMetal];
      
      return {
        compoundName: `${foundMetal} Oxide`,
        chemicalFormula: `${metalSymbol}₂O`, // Simplified - actual formula depends on oxidation state
        color: foundMetal === 'Copper' ? '#000000' : '#f8fafc',
        state: 'solid',
        safetyWarnings: ['Handle with care', 'May be caustic'],
        explanation: `${foundMetal} reacts with oxygen to form ${foundMetal.toLowerCase()} oxide. This is typically an exothermic oxidation reaction that produces a stable metal oxide compound.`
      };
    }
    
    return null;
  }
}

// Export singleton instance
export const geminiAI = new GeminiChemistryAI();
