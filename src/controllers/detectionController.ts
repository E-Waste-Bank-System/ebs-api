import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as detectionService from '../services/detectionService';
import { getAllDetectionsWithFilters } from '../services/detectionService';
import { uploadImage } from '../utils/gcs';
import env from '../config/env';
import axios from 'axios';
import { AuthRequest } from '../middlewares/auth';
import FormData from 'form-data';

// Database categories - consolidated categories for database storage
const CLASS_NAMES = [
  // Computing Devices
  'Keyboard', 'Mouse', 'Computer', 'Laptop', 'Storage',
  // Display Devices
  'Monitor', 'Television',
  // Mobile Devices
  'Phone', 'Console', 'Camera',
  // Audio Devices
  'Speaker', 'Headphone',
  // Power Devices
  'Adapter', 'Battery',
  // Kitchen Devices
  'Microwave', 'Oven', 'Toaster',
  // Cooling Devices
  'Refrigerator',
  // Home Devices
  'Iron', 'Washer', 'Vacuum',
  // Air Control
  'Fan', 'AirConditioner',
  // Office Equipment
  'Printer', 'Calculator',
  // Networking
  'Router',
  // Lighting
  'Lamp',
  // Health Devices
  'Monitor', 'Meter',
  // Vehicle
  'Vehicle',
  // Energy
  'Panel'
];

// Map YOLO class names to our consolidated database categories
const YOLO_TO_CATEGORY_MAP: { [key: string]: string } = {
  // Computing Devices
  'Computer-Keyboard': 'Keyboard',
  'Electronic-Keyboard': 'Keyboard',
  'Computer-Mouse': 'Mouse',
  'Desktop-PC': 'Computer',
  'Server': 'Computer',
  'PCB': 'Computer',
  'HDD': 'Storage',
  'SSD': 'Storage',
  'USB-Flash-Drive': 'Storage',
  'Laptop': 'Laptop',

  // Display Devices
  'Flat-Panel-Monitor': 'Monitor',
  'CRT-Monitor': 'Monitor',
  'Digital-Oscilloscope': 'Monitor',
  'Patient-Monitoring-System': 'Monitor',
  'Projector': 'Monitor',
  'Flat-Panel-TV': 'Television',
  'CRT-TV': 'Television',
  'TV-Remote-Control': 'Television',
  
  // Mobile Devices
  'Smartphone': 'Phone',
  'Bar-Phone': 'Phone',
  'Smart-Watch': 'Phone',
  'Tablet': 'Phone',
  'Camera': 'Camera',
  'PlayStation-5': 'Console',
  'Xbox-Series-X': 'Console',
  
  // Audio Devices
  'Speaker': 'Speaker',
  'Headphone': 'Headphone',
  'Music-Player': 'Speaker',
  'Electric-Guitar': 'Speaker',
  
  // Power Devices
  'Power-Adapter': 'Adapter',
  'Battery': 'Battery',
  
  // Kitchen Devices
  'Microwave': 'Microwave',
  'Coffee-Machine': 'Oven',
  'Oven': 'Oven',
  'Stove': 'Oven',
  'Toaster': 'Toaster',
  
  // Cooling Devices
  'Refrigerator': 'Refrigerator',
  'Freezer': 'Refrigerator',
  'Cooled-Dispenser': 'Refrigerator',
  'Non-Cooled-Dispenser': 'Refrigerator',
  'Cooling-Display': 'Refrigerator',

  // Home Devices
  'Clothes-Iron': 'Iron',
  'Boiler': 'Heater',
  'Hair-Dryer': 'Hair Dryer',
  'Rotary-Mower': 'Rotary Mower',
  'Soldering-Iron': 'Iron',
  'Vacuum-Cleaner': 'Vacuum',
  'Washing-Machine': 'Washer',
  'Dishwasher': 'Washer',
  'Tumble-Dryer': 'Washer',

  // Air Control
  'Ceiling-Fan': 'Fan',
  'Floor-Fan': 'Fan',
  'Exhaust-Fan': 'Fan',
  'Range-Hood': 'Fan',
  'Air-Conditioner': 'AirConditioner',
  'Dehumidifier': 'AirConditioner',

  // Office Equipment
  'Printer': 'Printer',
  'Calculator': 'Calculator',

  // Networking
  'Router': 'Router',
  'Network-Switch': 'Router',

  // Lighting
  'LED-Bulb': 'Lamp',
  'Table-Lamp': 'Lamp',
  'Straight-Tube-Fluorescent-Lamp': 'Lamp',
  'Compact-Fluorescent-Lamps': 'Lamp',
  'Christmas-Lights': 'Lamp',
  'Neon-Sign': 'Lamp',
  'Street-Lamp': 'Lamp',

  // Health Devices
  'Blood-Pressure-Monitor': 'Monitor',
  'Electrocardiograph-Machine': 'Monitor',
  'Glucose-Meter': 'Meter',
  'Pulse-Oximeter': 'Meter',

  // Vehicle
  'Drone': 'Vehicle',
  'Electric-Bicycle': 'Vehicle',

  // Energy
  'Photovoltaic-Panel': 'Panel',
  'Telephone-Set': 'Phone',
  'Flashlight': 'Lamp',
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

      const formData = new FormData();
      formData.append('file', req.file.buffer, req.file.originalname);
      
      console.log('Sending request to YOLO service...');
      const yoloRes = await axios.post(env.yoloUrl, formData, {
        headers: formData.getHeaders(),
      });
      console.log('YOLO service response received');
      
      const yoloData = yoloRes.data as any;
      const predictions = yoloData.predictions || [];
      
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
            
            console.log('Processing prediction:', { 
              detectionId, 
              yoloClassName,
              mappedCategory: category,
              classIdx 
            });
            
            const confidence = yoloPred?.confidence !== undefined ? yoloPred.confidence : 0.1;
            let detectionSource = 'YOLO';
            
            // If confidence is low or category mapping failed, use Gemini for validation
            const useLowConfidencePrompt = !category || confidence < 0.65;
            
            let regression_result: number | null = null;
            try {
              if (category && confidence !== null) {
                console.log('Sending request to regression service...');
                const regressionRes = await axios.post(env.regressionUrl, { label: category, confidence });
                const regressionData = regressionRes.data as any;
                regression_result = regressionData.price;
                console.log('Regression result received:', regression_result);
              }
            } catch (err) {
              console.error('Regression service error:', err);
              regression_result = null;
            }

            let description: string | null = null, 
                suggestion: string[] = [], 
                risk_lvl: number | null = null, 
                validatedCategory: string = category;

            try {
              const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.geminiApiKey}`;
              
              const imageBase64 = req.file.buffer.toString('base64');
              
              let prompt = '';
              if (useLowConfidencePrompt) {
                prompt = `Analyze this e-waste image and classify it into one of these categories: ${CLASS_NAMES.join(', ')}.
Then provide a description (10-40 words), up to 3 suggestions for handling, and a risk level (1-10).
Respond in this exact format without additional explanations:

Category: <1-2 word of category>
Description: <short description 10-40 words in indonesian>
Suggestions: <suggestion1 exactly 10-20 words in indonesian>, <suggestion2 exactly 10-20 words in indonesian>, <suggestion3 exactly 7-15 words in indonesian>
Risk Level: <number 1-10>`;
              } else {
                prompt = `This image shows a ${category} e-waste item with ${(confidence * 100).toFixed(2)}% detection confidence.
Provide a description (10-40 words), up to 3 suggestions for handling, and a risk level (1-10).
Respond in this exact format without additional explanations:

Description: <short description 10-40 words in indonesian>
Suggestions: <suggestion1 exactly 7-15 words in indonesian>, <suggestion2 exactly 7-15 words in indonesian>, <suggestion3 exactly 7-15 words in indonesian>
Risk Level: <number 1-10>`;
              }
              
              const geminiRes = await axios.post(GEMINI_API_URL, {
                contents: [
                  {
                    parts: [
                      { text: prompt },
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
                  maxOutputTokens: 1000
                }
              });
              
              const geminiData = geminiRes.data as any;
              const generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
              console.log("Gemini generated text:", generatedText);
              
              if (useLowConfidencePrompt) {
                const categoryMatch = generatedText.match(/Category:\s*(.+?)(?=\n|$)/i);
                if (categoryMatch && categoryMatch[1]) {
                  const geminiCategory = categoryMatch[1].trim();
                  if (CLASS_NAMES.includes(geminiCategory)) {
                    validatedCategory = geminiCategory;
                    detectionSource = 'Gemini Interfered';
                  } else {
                    const closestMatch = CLASS_NAMES.find(name => 
                      name.toLowerCase() === geminiCategory.toLowerCase());
                    if (closestMatch) {
                      validatedCategory = closestMatch;
                      detectionSource = 'Gemini Interfered';
                    }
                  }
                }
              }
              
              const descriptionMatch = generatedText.match(/Description:\s*(.+?)(?=\n|$)/i);
              description = descriptionMatch ? descriptionMatch[1].trim() : null;
              
              const suggestionsMatch = generatedText.match(/Suggestions:\s*(.+?)(?=\n|$)/i);
              if (suggestionsMatch) {
                suggestion = suggestionsMatch[1].split(',').map((s: string) => s.trim());
              }
              
              const riskMatch = generatedText.match(/Risk Level:\s*(\d+)/i);
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
              suggestion = DEFAULT_SUGGESTIONS[category] || DEFAULT_SUGGESTIONS.default;
              risk_lvl = null;
              validatedCategory = category;
            }

            console.log('Creating detection record...');
            await detectionService.createDetection({
              id: detectionId,
              user_id,
              scan_id: scanId,
              image_url: imageUrl,
              detection_source: detectionSource,
              category: validatedCategory,
              confidence,
              regression_result,
              description,
              suggestion: suggestion.join(' | '),
              risk_lvl: risk_lvl
            });
            console.log('Detection record created successfully:', detectionId);
            
            predictionsArray.push({
              id: detectionId,
              category: validatedCategory,
              confidence,
              regression_result,
              description,
              suggestion,
              risk_lvl,
              detection_source: detectionSource
            });
          } catch (err) {
            console.error('Error processing individual prediction:', {
              error: err,
              prediction: yoloPred
            });
            continue;
          }
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
  
    res.json({
      data,
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
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getDetectionById(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await detectionService.getDetectionById(req.params.id);
    res.json(data);
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