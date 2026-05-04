export const PRACTICE_STRUCTURE = {
  "Physics": {
    "Class 11": [
      "01 Units and Measurements", "02 Motion in a Straight Line", 
      "03 Motion in a Plane", "04 Laws of Motion", 
      "05 Work Energy and Power", "06 System of Particles and Rotational Motion", 
      "07 Gravitation", "08 Mechanical Properties of Solids", 
      "09 Mechanical Properties of Fluids", "10 Thermal Properties of Matter", 
      "11 Thermodynamics", "12 Kinetic Theory", "13 Oscillations", "14 Waves"
    ],
    "Class 12": [
      "01 Electric Charges and Fields", "02 Electrostatic Potential and Capacitance", 
      "03 Current Electricity", "04 Moving Charges and Magnetism", 
      "05 Magnetism and Matter", "06 Electromagnetic Induction", 
      "07 Alternating Current", "08 Electromagnetic Waves", 
      "09 Ray Optics and Optical Instruments", "10 Wave Optics", 
      "11 Dual Nature of Radiation and Matter", "12 Atoms", 
      "13 Nuclei", "14 Semiconductor Electronics"
    ]
  },
  "Chemistry": {
    "Class 11": [
      "01 Some Basic Concepts of Chemistry", "02 Structure of Atom", 
      "03 Classification of Elements and Periodicity", "04 Chemical Bonding", 
      "05 Chemical Thermodynamics", "06 Equilibrium", "07 Redox Reactions", 
      "08 Organic Chemistry Basics", "09 Hydrocarbons"
    ],
    "Class 12": [
      "01 Solutions", "02 Electrochemistry", "03 Chemical Kinetics", 
      "04 d-and f-Block Elements", "05 Coordination Compounds", 
      "06 Haloalkanes and Haloarenes", "07 Alcohols Phenols and Ethers", 
      "08 Aldehydes Ketones and Carboxylic Acids", "09 Amines", "10 Biomolecules"
    ]
  },
  "Biology": {
    "Class 11": [
      "01 The Living World", "02 Biological Classification", "03 Plant Kingdom", 
      "04 Animal Kingdom", "05 Morphology of Flowering Plants", 
      "06 Anatomy of Flowering Plants", "07 Structural Organisation in Animals", 
      "08 Cell The Unit of Life", "09 Biomolecules", "10 Cell Cycle and Division", 
      "11 Photosynthesis", "12 Respiration in Plants", 
      "13 Plant Growth and Development", "14 Breathing and Exchange of Gases", 
      "15 Body Fluids and Circulation", "16 Excretory Products", 
      "17 Locomotion and Movement", "18 Neural Control", "19 Chemical Coordination"
    ],
    "Class 12": [
      "01 Sexual Reproduction in Flowering Plants", "02 Human Reproduction", 
      "03 Reproductive Health", "04 Principles of Inheritance", 
      "05 Molecular Basis of Inheritance", "06 Evolution", 
      "07 Human Health and Disease", "08 Microbes in Human Welfare", 
      "09 Biotechnology Principles", "10 Biotechnology Applications", 
      "11 Organisms and Populations", "12 Ecosystem", "13 Biodiversity and Conservation"
    ]
  }
} as const;

export type Subject = keyof typeof PRACTICE_STRUCTURE;
export type ClassLevel = keyof typeof PRACTICE_STRUCTURE["Physics"];
