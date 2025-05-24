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
  'Bar-Phone': 'Telefon',
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

      // First, validate with Gemini if this is e-waste
      try {
        const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${env.geminiApiKey}`;
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

        // If Gemini confirms it's e-waste, proceed with YOLO detection
        const formData = new FormData();
        formData.append('file', req.file.buffer, req.file.originalname);
        
        console.log('Sending request to YOLO service...');
        const yoloRes = await axios.post(env.yoloUrl, formData, {
          headers: formData.getHeaders(),
        });
        console.log('YOLO service response received');
        
        const yoloData = yoloRes.data as any;
        const predictions = yoloData.predictions || [];
        
        // Return early if no predictions found
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
              
              // Map YOLO class name to our category
              let category = YOLO_TO_CATEGORY_MAP[yoloClassName] || '';
              
              // If no mapping found, try using class index
              if (!category && classIdx !== null && classIdx >= 0 && classIdx < CLASS_NAMES.length) {
                category = CLASS_NAMES[classIdx];
              }

              // If YOLO category doesn't match Gemini's category, skip this prediction
              if (category !== geminiCategory) {
                continue;
              }
              
              console.log('Processing prediction:', { 
                detectionId, 
                yoloClassName,
                mappedCategory: category,
                classIdx 
              });
              
              const confidence = yoloPred?.confidence !== undefined ? yoloPred.confidence : 0.1;
              let detectionSource = 'YOLO + Gemini';
              
              let regression_result: number | null = null;
              let description: string | null = null;
              let suggestionArray: string[] = [];
              let risk_lvl: number | null = null;
              let validatedCategory = category;

              // Get price prediction for the validated category
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

              // Get original price prediction if category is different
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

              // Extract bounding box coordinates from YOLO prediction
              const bbox = yoloPred?.bbox || [0, 0, 0, 0];
              const bbox_coordinates = {
                x: bbox[0],
                y: bbox[1],
                width: bbox[2] - bbox[0],
                height: bbox[3] - bbox[1]
              };

              try {
                const enrichmentPrompt = `This image shows a ${category} e-waste item.
Provide a description (10-40 words), up to 3 suggestions for handling, and a risk level (1-10).
Respond in this exact format without additional explanations:

Description: <short description 10-40 words in indonesian>
Suggestions: <suggestion1 exactly 7-15 words in indonesian>, <suggestion2 exactly 7-15 words in indonesian>, <suggestion3 exactly 7-15 words in indonesian>
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
                  suggestionArray = suggestionsMatch[1].split(',').map((s: string) => s.trim());
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
                suggestionArray = DEFAULT_SUGGESTIONS[category] || DEFAULT_SUGGESTIONS.default;
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

    const { data, total, last_page } = await getAllDetectionsWithFilters(
      limit, 
      offset, 
      search, 
      category, 
      detection_source
    );
    
    // Transform suggestions from pipe-separated strings to arrays and get price predictions
    const transformedData = await Promise.all(data.map(async item => {
      let transformedItem = { ...item };
      
      // Always ensure suggestion is an array
      transformedItem.suggestion = item.suggestion ? item.suggestion.split(' | ') : [];

      // Get price prediction if not already present
      if (!item.regression_result && item.category) {
        try {
          const priceResponse = await axios.post(`${env.yoloUrl.replace('/object', '')}/price`, {
            object: item.category
          });
          transformedItem.regression_result = (priceResponse.data as { price: number }).price;
        } catch (priceErr) {
          console.error('Price prediction failed:', priceErr);
          transformedItem.regression_result = null;
        }
      }
      
      return transformedItem;
    }));
  
    res.json({
      data: transformedData,
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
    const data = await detectionService.getDetectionsByUser(req.params.userId);
    
    // Transform prediction suggestions from pipe-separated strings to arrays and get price predictions
    const transformedData = await Promise.all(data.map(async scan => {
      if (scan.prediction && Array.isArray(scan.prediction)) {
        const transformedPredictions = await Promise.all(scan.prediction.map(async pred => {
          let transformedPred = { ...pred };
          
          // Always ensure suggestion is an array
          transformedPred.suggestion = pred.suggestion ? pred.suggestion.split(' | ') : [];

          // Get price prediction if not already present
          if (!pred.regression_result && pred.category) {
            try {
              const priceResponse = await axios.post(`${env.yoloUrl.replace('/object', '')}/price`, {
                object: pred.category
              });
              transformedPred.regression_result = (priceResponse.data as { price: number }).price;
            } catch (priceErr) {
              console.error('Price prediction failed:', priceErr);
              transformedPred.regression_result = null;
            }
          }
          
          return transformedPred;
        }));
        
        return {
          ...scan,
          prediction: transformedPredictions
        };
      }
      return scan;
    }));
    
    res.json(transformedData);
  } catch (err) {
    next(err);
  }
}

export async function getDetectionById(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await detectionService.getDetectionById(req.params.id);
    
    if (!data) {
      res.status(404).json({ message: 'Detection not found' });
      return;
    }

    // Transform suggestion from pipe-separated string to array and get price prediction
    let responseData = { ...data };
    
    // Always ensure suggestion is an array
    responseData.suggestion = data.suggestion ? data.suggestion.split(' | ') : [];

    // Get price prediction if not already present
    if (!data.regression_result && data.category) {
      try {
        const priceResponse = await axios.post(`${env.yoloUrl.replace('/object', '')}/price`, {
          object: data.category
        });
        responseData.regression_result = (priceResponse.data as { price: number }).price;
      } catch (priceErr) {
        console.error('Price prediction failed:', priceErr);
        responseData.regression_result = null;
      }
    }

    res.json(responseData);
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
    
    // Make sure the user_id from the authenticated request is included
    // This ensures the updateDetection service can verify ownership
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
    
    // First get the detection to check it exists
    const detection = await detectionService.getDetectionById(id);
    
    if (!detection) {
      res.status(404).json({ message: 'Detection not found' });
      return;
    }
    
    // Upload the new image
    const imageUrl = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
    
    // Update the object image_url directly
    const updated = await detectionService.updateDetection(id, { 
      user_id: req.user?.id,
      image_url: imageUrl
    });
    
    res.json(updated);
  } catch (err) {
    next(err);
  }
} 