import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as detectionService from '../services/detectionService';
import * as retrainingService from '../services/retrainingService';
import { getAllDetectionsWithFilters } from '../services/detectionService';
import { uploadImage } from '../utils/gcs';
import env from '../config/env';
import axios from 'axios';
import { AuthRequest } from '../middlewares/auth';
import FormData from 'form-data';
import supabase from '../utils/supabase';

// Utility function to properly parse suggestion fragments into complete sentences
function parseSuggestionFragments(suggestionString: string): string[] {
  if (!suggestionString) return [];
  
  // Split by pipe separator
  const fragments = suggestionString.split('|').map(s => s.trim()).filter(s => s);
  
  if (fragments.length === 0) return [];
  
  const suggestions: string[] = [];
  let currentSuggestion = '';
  
  for (let i = 0; i < fragments.length; i++) {
    const fragment = fragments[i];
    
    // If current suggestion is empty, start a new one
    if (!currentSuggestion) {
      currentSuggestion = fragment;
    } else {
      // Check if this fragment should be combined with the previous one
      const shouldCombine = (
        // Previous fragment doesn't end with sentence-ending punctuation
        !/[.!?]$/.test(currentSuggestion.trim()) ||
        // Current fragment doesn't start with capital letter (likely a continuation)
        !/^[A-Z]/.test(fragment.trim()) ||
        // Previous fragment ends with comma, suggesting continuation
        /,$/.test(currentSuggestion.trim()) ||
        // Previous fragment is very short (likely incomplete)
        currentSuggestion.trim().length < 10
      );
      
      if (shouldCombine) {
        // Combine with previous fragment
        const needsSpace = !currentSuggestion.endsWith(' ') && !fragment.startsWith(' ');
        const needsComma = /^[a-z]/.test(fragment.trim()) && !/[.!?,:;]$/.test(currentSuggestion.trim());
        
        if (needsComma && needsSpace) {
          currentSuggestion += ', ' + fragment;
        } else if (needsSpace) {
          currentSuggestion += ' ' + fragment;
        } else {
          currentSuggestion += fragment;
        }
      } else {
        // Finish current suggestion and start a new one
        suggestions.push(currentSuggestion.trim());
        currentSuggestion = fragment;
      }
    }
  }
  
  // Don't forget to add the last suggestion
  if (currentSuggestion.trim()) {
    suggestions.push(currentSuggestion.trim());
  }
  
  return suggestions;
}

// Types for database entities
interface Scan {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

interface Object {
  id: string;
  user_id: string;
  scan_id: string;
  image_url: string;
  detection_source: string;
  category: string;
  confidence: number;
  regression_result: number | null;
  description: string | null;
  suggestion: string | null;
  risk_lvl: number;
  bbox_coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  is_validated: boolean;
  created_at: string;
  updated_at: string;
}

interface ScanWithObjects extends Scan {
  objects: Object[];
}

// Interface for Gemini API response
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// Database categories - consolidated categories for database storage
const CLASS_NAMES = [
  "AC",
  "Adaptor /Kilo",
  "Aki Motor",
  "Alat Tensi",
  "Alat Tes Vol",
  "Ant Miner Case",
  "Ant Miner Hashboard",
  "Antena",
  "Bantal Pemanas",
  "Baterai Laptop",
  "Batok Charger",
  "Blender",
  "Box Kabel",
  "Box Speaker Kecil",
  "Camera",
  "Catokan",
  "CCTV",
  "CD",
  "Charger Laptop",
  "Cooler",
  "DVD Player",
  "DVD ROM",
  "Flashdisk",
  "Game Boy",
  "Hair Dryer",
  "Handphone",
  "Hardisk",
  "Homic Wireless",
  "Jam Digital",
  "Jam Dinding",
  "Jam Tangan",
  "Kabel /Kilo",
  "Kabel Sambungan",
  "Keyboard",
  "Kipas",
  "Komponen CPU",
  "Komponen Kulkas",
  "Kompor Listrik",
  "Lampu",
  "Laptop",
  "Magicom",
  "Mesin Cuci",
  "Mesin Facial",
  "Mesin Fax",
  "Mesin Jahit",
  "Mesin Kasir",
  "Mesin Pijat",
  "Microfon",
  "Microwave",
  "Mixer",
  "Modem",
  "Monitor",
  "Motherboard",
  "Mouse",
  "Multi Tester",
  "Neon Box",
  "Notebook Cooler",
  "Oven",
  "Panel Surya",
  "Pompa Air",
  "Power Bank",
  "Power Supply",
  "Printer",
  "PS2",
  "Radio",
  "Raket Nyamuk",
  "Remot",
  "Router",
  "Saklar Lampu",
  "Senter",
  "Seterika",
  "Solder",
  "Sound Blaster",
  "Speaker",
  "Stabilizer",
  "Stik Ps",
  "Stop Kontak",
  "Tabung Debu",
  "Teko Listrik",
  "Telefon",
  "Timbangan Badan",
  "Tinta",
  "TV",
  "Ultrasonic",
  "UPS",
  "Vacum Cleaner",
  "VGA",
  "Walkie Talkie",
  "Wireless Charger"
];

// Map YOLO class names to our consolidated database categories
const YOLO_TO_CATEGORY_MAP: { [key: string]: string } = {
  // Computing Devices
  'Computer-Keyboard': 'Keyboard',
  'Electronic-Keyboard': 'Keyboard',
  'Computer-Mouse': 'Mouse',
  'Desktop-PC': 'Komponen CPU',
  'Server': 'Komponen CPU',
  'PCB': 'Komponen CPU',
  'HDD': 'Hardisk',
  'SSD': 'Hardisk',
  'USB-Flash-Drive': 'Flashdisk',
  'Laptop': 'Laptop',

  // Display Devices
  'Flat-Panel-Monitor': 'Monitor',
  'CRT-Monitor': 'Monitor',
  'Digital-Oscilloscope': 'Monitor',
  'Patient-Monitoring-System': 'Monitor',
  'Projector': 'Monitor',
  'Flat-Panel-TV': 'TV',
  'CRT-TV': 'TV',
  'TV-Remote-Control': 'Remot',
  
  // Mobile Devices
  'Smartphone': 'Handphone',
  'Bar-Phone': 'Handphone',
  'Smart-Watch': 'Jam Tangan',
  'Tablet': 'Handphone',
  'Camera': 'Camera',
  'PlayStation-5': 'PS2',
  'Xbox-Series-X': 'PS2',
  
  // Audio Devices
  'Speaker': 'Speaker',
  'Headphone': 'Speaker',
  'Music-Player': 'Speaker',
  'Electric-Guitar': 'Speaker',
  
  // Power Devices
  'Power-Adapter': 'Adaptor /Kilo',
  'Battery': 'Baterai Laptop',
  
  // Kitchen Devices
  'Microwave': 'Microwave',
  'Coffee-Machine': 'Oven',
  'Oven': 'Oven',
  'Stove': 'Kompor Listrik',
  'Toaster': 'Oven',
  
  // Cooling Devices
  'Refrigerator': 'Komponen Kulkas',
  'Freezer': 'Komponen Kulkas',
  'Cooled-Dispenser': 'Komponen Kulkas',
  'Non-Cooled-Dispenser': 'Komponen Kulkas',
  'Cooling-Display': 'Komponen Kulkas',

  // Home Devices
  'Clothes-Iron': 'Seterika',
  'Boiler': 'Kompor Listrik',
  'Hair-Dryer': 'Hair Dryer',
  'Rotary-Mower': 'Kipas',
  'Soldering-Iron': 'Solder',
  'Vacuum-Cleaner': 'Vacum Cleaner',
  'Washing-Machine': 'Mesin Cuci',
  'Dishwasher': 'Mesin Cuci',
  'Tumble-Dryer': 'Mesin Cuci',

  // Air Control
  'Ceiling-Fan': 'Kipas',
  'Floor-Fan': 'Kipas',
  'Exhaust-Fan': 'Kipas',
  'Range-Hood': 'Kipas',
  'Air-Conditioner': 'AC',
  'Dehumidifier': 'AC',

  // Office Equipment
  'Printer': 'Printer',
  'Calculator': 'Alat Tes Vol',

  // Networking
  'Router': 'Router',
  'Network-Switch': 'Router',

  // Lighting
  'LED-Bulb': 'Lampu',
  'Table-Lamp': 'Lampu',
  'Straight-Tube-Fluorescent-Lamp': 'Lampu',
  'Compact-Fluorescent-Lamps': 'Lampu',
  'Christmas-Lights': 'Lampu',
  'Neon-Sign': 'Neon Box',
  'Street-Lamp': 'Lampu',

  // Health Devices
  'Blood-Pressure-Monitor': 'Alat Tensi',
  'Electrocardiograph-Machine': 'Monitor',
  'Glucose-Meter': 'Alat Tes Vol',
  'Pulse-Oximeter': 'Alat Tes Vol',

  // Vehicle
  'Drone': 'Kipas',
  'Electric-Bicycle': 'Aki Motor',

  // Energy
  'Photovoltaic-Panel': 'Panel Surya',
  'Telephone-Set': 'Telefon',
  'Flashlight': 'Senter',
  'Smoke-Detector': 'Monitor'
};

const DEFAULT_SUGGESTIONS: { [key: string]: string[] } = {
  'default': [
    'Bawa ke pusat daur ulang elektronik terdekat',
    'Pisahkan komponen sebelum mendaur ulang dengan benar',
    'Jangan membuang di tempat sampah rumah tangga'
  ]
};

export async function createDetection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Image file is required' });
      return;
    }

    const { user_id } = req.body;
    if (!user_id) {
      res.status(400).json({ message: 'user_id is required' });
      return;
    }

    console.log('Starting detection creation process for user:', user_id);

    try {
      const imageUrl = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
      console.log('Image uploaded successfully:', imageUrl);

      try {
        const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.geminiApiKey}`;
        const imageBase64 = req.file.buffer.toString('base64');
        
        const validationPrompt = `Analyze this image and determine if it contains electronic waste (e-waste) or electronic devices.
If it contains e-waste, respond with "CONFIRMED" followed by the most likely category from this list: ${CLASS_NAMES.join(', ')}.
If it does not contain e-waste, respond with "NOT_EWASTE".
Respond in this exact format without additional explanations:

Status: <CONFIRMED or NOT_EWASTE>
Category: <category name if CONFIRMED, or NONE if NOT_EWASTE>`;

        const geminiValidationRes = await axios.post<GeminiResponse>(GEMINI_API_URL, {
          contents: [
            {
              parts: [
                { text: validationPrompt },
                {
                  inline_data: {
                    mime_type: req.file.mimetype,
                    data: imageBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.9,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 2500
          }
        });

        const validationText = geminiValidationRes.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const statusMatch = validationText.match(/Status:\s*(.+?)(?=\n|$)/i);
        const categoryMatch = validationText.match(/Category:\s*(.+?)(?=\n|$)/i);
        
        const status = statusMatch ? statusMatch[1].trim() : '';
        const geminiCategory = categoryMatch ? categoryMatch[1].trim() : '';

        if (status !== 'CONFIRMED' || !CLASS_NAMES.includes(geminiCategory)) {
          res.status(200).json({
            message: 'No e-waste detected'
          });
          return;
        }

      const formData = new FormData();
      formData.append('file', req.file.buffer, req.file.originalname);
      
      console.log('Sending request to YOLO service...');
      const yoloRes = await axios.post(env.yoloUrl, formData, {
        headers: formData.getHeaders(),
      });
      console.log('YOLO service response received');
      
      const yoloData = yoloRes.data as any;
      const predictions = yoloData.predictions || [];
        
        if (!predictions || predictions.length === 0) {
          res.status(200).json({
            message: 'No e-waste detected'
          });
          return;
        }
      
      console.log('Creating scan record...');
      try {
        const scan = await detectionService.createScan(user_id);
        const scanId = scan.id;
        console.log('Scan record created:', scanId);
        
        const predictionsArray = [];

        for (const yoloPred of predictions) {
          try {
            const detectionId = uuidv4();
            const classIdx = typeof yoloPred?.class === 'number' ? yoloPred.class : null;
            const yoloClassName = yoloPred?.class_name || '';
            
            let category = YOLO_TO_CATEGORY_MAP[yoloClassName] || '';
            
            if (!category && classIdx !== null && classIdx >= 0 && classIdx < CLASS_NAMES.length) {
              category = CLASS_NAMES[classIdx];
            }            
            let validatedCategory = category;
            let detectionSource: string;
            
            // Only use Gemini's category if YOLO didn't detect anything
            if (!category) {
              detectionSource = 'Gemini';
              validatedCategory = geminiCategory;
            } else {
              detectionSource = 'YOLO';
              validatedCategory = category;
            }
            
            console.log('Processing prediction:', { 
              detectionId, 
              yoloClassName,
              yoloCategory: category,
              geminiCategory,
              finalCategory: validatedCategory,
              detectionSource
            });
            
            const confidence = yoloPred?.confidence !== undefined ? yoloPred.confidence : 0.1;
            
            let regression_result: number | null = null;
            let description: string | null = null;
            let suggestionArray: string[] = [];
            let risk_lvl: number | null = null;

              let originalPrice: number | null = null;
              let correctedPrice: number | null = null;
              try {
                const priceResponse = await axios.post(`${env.yoloUrl.replace('/object', '')}/price`, {
                  object: validatedCategory
                });
                regression_result = (priceResponse.data as { price: number }).price;
                correctedPrice = regression_result;
              } catch (priceErr) {
                console.error('Price prediction failed:', priceErr);
                regression_result = null;
                correctedPrice = null;
              }

              if (validatedCategory !== yoloClassName) {
                try {
                  const originalPriceResponse = await axios.post(`${env.yoloUrl.replace('/object', '')}/price`, {
                    object: yoloClassName
                  });
                  originalPrice = (originalPriceResponse.data as { price: number }).price;
                } catch (priceErr) {
                  console.error('Original price prediction failed:', priceErr);
                  originalPrice = null;
                }
              }

            const bbox = yoloPred?.bbox || [0, 0, 0, 0];
            const bbox_coordinates = {
              x: bbox[0],
              y: bbox[1],
              width: bbox[2] - bbox[0],
              height: bbox[3] - bbox[1]
            };

            try {
                const enrichmentPrompt = `This image shows a ${validatedCategory} e-waste item.
Provide a description (10-40 words), up to 3 suggestions for handling, and a damage level (0-10).
Respond in this exact format without additional explanations:

Description: <short description 10-40 words in indonesian>
Suggestions: <suggestion1 exactly 7-15 words in indonesian>|<suggestion2 exactly 7-15 words in indonesian>|<suggestion3 exactly 7-15 words in indonesian>
Risk Level: <number 1-10>`;
              
                const geminiEnrichmentRes = await axios.post<GeminiResponse>(GEMINI_API_URL, {
                contents: [
                  {
                    parts: [
                        { text: enrichmentPrompt },
                      {
                        inline_data: {
                          mime_type: req.file.mimetype,
                          data: imageBase64
                        }
                      }
                    ]
                  }
                ],
                generationConfig: {
                  temperature: 0.9,
                  topP: 0.8,
                  topK: 40,
                    maxOutputTokens: 2500
                }
              });
              
                const enrichmentText = geminiEnrichmentRes.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                
                const descriptionMatch = enrichmentText.match(/Description:\s*(.+?)(?=\n|$)/i);
              description = descriptionMatch ? descriptionMatch[1].trim() : null;
              
                const suggestionsMatch = enrichmentText.match(/Suggestions:\s*(.+?)(?=\n|$)/i);
              if (suggestionsMatch) {
                suggestionArray = suggestionsMatch[1].split('|').map((s: string) => s.trim());
              }
              
                const riskMatch = enrichmentText.match(/Risk Level:\s*(\d+)/i);
              if (riskMatch) {
                const risk = parseInt(riskMatch[1]);
                if (!isNaN(risk) && risk >= 1 && risk <= 10) {
                  risk_lvl = risk;
                }
              }
            } catch (err) {
              const error = err as any;
              console.error("Gemini enrichment failed:", error?.response?.data || error?.message || error);
              description = null;
              suggestionArray = DEFAULT_SUGGESTIONS[validatedCategory] || DEFAULT_SUGGESTIONS.default;
              risk_lvl = null;
            }

            console.log('Creating detection record...');
            const detection = await detectionService.createDetection({
              id: detectionId,
              user_id,
              scan_id: scanId,
              image_url: imageUrl,
              detection_source: detectionSource,
              category: validatedCategory,
              confidence,
              regression_result,
              description,
              suggestion: suggestionArray.join(' | ') || '',
              risk_lvl
            });
            console.log('Detection record created successfully:', detectionId);
            
            // Create retraining data entry from the detection
            try {
              await retrainingService.createRetrainingData({
                image_url: imageUrl,
                original_category: yoloClassName,
                bbox_coordinates: {
                  x: bbox[0],
                  y: bbox[1],
                  width: bbox[2] - bbox[0],
                  height: bbox[3] - bbox[1]
                },
                confidence_score: confidence,
                corrected_category: validatedCategory !== yoloClassName ? validatedCategory : null,
                  original_price: originalPrice,
                  corrected_price: correctedPrice,
                model_version: 'YOLOv11',
                user_id,
                object_id: detectionId
              });
              console.log('Retraining data record created for detection:', detectionId);
            } catch (retrainErr) {
              console.error('Failed to create retraining data:', retrainErr);
            }
            
            predictionsArray.push({
              id: detectionId,
              category: validatedCategory,
              confidence,
              regression_result,
              description,
                suggestion: suggestionArray,
              risk_lvl,
              detection_source: detectionSource,
              image_url: imageUrl
            });
          } catch (err) {
            console.error('Error processing individual prediction:', {
              error: err,
              prediction: yoloPred
            });
            continue;
          }
        }

          // If no predictions were processed (all were filtered out), return no e-waste message
          if (predictionsArray.length === 0) {
            res.status(200).json({
              message: 'No e-waste detected'
            });
            return;
          }

        res.status(201).json({
          message: 'Detection created successfully',
          scan_id: scanId,
          predictions: predictionsArray
        });
      } catch (err) {
        console.error('Error creating scan record:', {
          error: err,
          userId: user_id
        });
        throw err;
        }
      } catch (err) {
        console.error('Error in Gemini validation:', err);
        res.status(200).json({
          message: 'No e-waste detected'
        });
        return;
      }
    } catch (err) {
      console.error('Error in detection creation process:', {
        error: err,
        userId: user_id,
        fileName: req.file?.originalname
      });
      throw err;
    }
  } catch (err) {
    console.error('Error in createDetection:', {
      error: err,
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined
    });
    next(err);
  }
}

export async function getAllDetections(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const category = req.query.category as string;
    const detection_source = req.query.detection_source as string;

    // First, get all scans with pagination
    const { data: scans, error: scansError } = await supabase
      .from('scans')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (scansError) {
      throw scansError;
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('scans')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }

    // Get objects for each scan
    const scansWithObjects: ScanWithObjects[] = [];
    for (const scan of scans) {
      // Get objects for this scan
      const { data: objects, error: objectsError } = await supabase
        .from('objects')
        .select('*')
        .eq('scan_id', scan.id)
        .order('created_at', { ascending: false });

      if (objectsError) {
        throw objectsError;
      }

      // Filter objects if category or detection_source is provided
      let filteredObjects = objects;
      if (category || detection_source) {
        filteredObjects = objects.filter(obj => {
          const categoryMatch = !category || obj.category === category;
          const sourceMatch = !detection_source || obj.detection_source === detection_source;
          return categoryMatch && sourceMatch;
        });
      }

      // Only include scans that have objects after filtering
      if (filteredObjects.length > 0) {
        // Transform suggestion fields from pipe-separated strings to arrays with intelligent parsing
        const transformedObjects = filteredObjects.map(obj => ({
          ...obj,
          suggestion: obj.suggestion ? parseSuggestionFragments(obj.suggestion) : []
        }));
        
        scansWithObjects.push({
          ...scan,
          objects: transformedObjects
        });
      }
    }

    // Calculate total pages
    const total = count || 0;
    const last_page = Math.ceil(total / limit);
  
    res.json({
      data: scansWithObjects,
      total,
      current_page: page,
      last_page,
      per_page: limit
    });
  } catch (err) {
    next(err);
  }
}

export async function getDetectionsByUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId;
    
    // Get all scans for the user
    const { data: scans, error: scansError } = await supabase
      .from('scans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (scansError) {
      throw scansError;
    }

    // Get objects for each scan
    const scansWithObjects: ScanWithObjects[] = [];
    for (const scan of scans) {
      const { data: objects, error: objectsError } = await supabase
        .from('objects')
        .select('*')
        .eq('scan_id', scan.id)
        .order('created_at', { ascending: false });

      if (objectsError) {
        throw objectsError;
      }

      // Transform suggestion fields from pipe-separated strings to arrays with intelligent parsing
      const transformedObjects = (objects || []).map(obj => ({
        ...obj,
        suggestion: obj.suggestion ? parseSuggestionFragments(obj.suggestion) : []
      }));

      scansWithObjects.push({
          ...scan,
        objects: transformedObjects
    });
    }
    
    res.json(scansWithObjects);
  } catch (err) {
    next(err);
  }
}

export async function getDetectionById(req: Request, res: Response, next: NextFunction) {
  try {
    const objectId = req.params.id;
    
    // Get the specific object
    const { data: object, error: objectError } = await supabase
      .from('objects')
      .select(`
        *,
        scan:scans (
          id,
          user_id,
          status,
          created_at,
          updated_at
        )
      `)
      .eq('id', objectId)
      .single();

    if (objectError) {
      throw objectError;
    }

    if (!object) {
      res.status(404).json({ message: 'Detection not found' });
      return;
    }

    // Transform suggestion from pipe-separated string to array with intelligent parsing
    const transformedObject = {
      ...object,
      suggestion: object.suggestion ? parseSuggestionFragments(object.suggestion) : []
    };

    res.json(transformedObject);
  } catch (err) {
    next(err);
  }
}

export async function deleteDetection(req: Request, res: Response, next: NextFunction) {
  try {
    await detectionService.deleteDetection(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function updateDetection(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const fields = req.body;
    
    if (req.user && req.user.id) {
      fields.user_id = req.user.id;
    }
    
    const updated = await detectionService.updateDetection(id, fields);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function updateDetectionImage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Image file is required' });
      return;
    }

    const { id } = req.params;
    
    const detection = await detectionService.getDetectionById(id);
    
    if (!detection) {
      res.status(404).json({ message: 'Detection not found' });
      return;
    }
    
    const imageUrl = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
    
    const updated = await detectionService.updateDetection(id, { 
      user_id: req.user?.id,
      image_url: imageUrl
    });
    
    res.json(updated);
  } catch (err) {
    next(err);
  }
} 