import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as detectionService from '../services/detectionService';
import { getAllDetectionsWithFilters } from '../services/detectionService';
import { uploadImage } from '../utils/gcs';
import env from '../config/env';
import axios from 'axios';
import { getErrorMessage } from '../utils/error-utils';
import { AuthRequest } from '../middlewares/auth';
import FormData from 'form-data';

const CLASS_NAMES = [
  'Battery', 'Body Weight Scale', 'Calculator', 'Clock', 'DVD Player', 'DVD ROM', 'Electronic Socket', 'Fan', 'Flashlight', 'Fridge', 'GPU', 'Handphone', 'Harddisk', 'Insect Killer', 'Iron', 'Keyboard', 'Lamp', 'Laptop', 'Laptop Charger', 'Microphone', 'Microwave', 'Monitor', 'Motherboard', 'Mouse', 'PC Case', 'Power Supply', 'Powerbank', 'Printer', 'Printer Ink', 'Radio', 'Rice Cooker', 'Router', 'Solar Panel', 'Speaker', 'Television', 'Toaster', 'Walkie Talkie', 'Washing Machine'
];

const DEFAULT_SUGGESTIONS: { [key: string]: string[] } = {
  'Battery': [
    'Bawa ke tempat daur ulang khusus baterai',
    'Lindungi terminal baterai dengan isolasi sebelum dibuang',
    'Jangan membuang baterai di tempat sampah biasa'
  ],
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

    // Get user_id from request body
    const { user_id } = req.body;
    if (!user_id) {
      res.status(400).json({ message: 'user_id is required' });
      return;
    }

    const imageUrl = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);
    const yoloRes = await axios.post(env.yoloUrl, formData, {
      headers: formData.getHeaders(),
    });
    const yoloData = yoloRes.data as any;
    const yoloPred = yoloData.predictions && yoloData.predictions[0];
    const classIdx = typeof yoloPred?.class === 'number' ? yoloPred.class : null;
    let category = (classIdx !== null && classIdx >= 0 && classIdx < CLASS_NAMES.length) ? CLASS_NAMES[classIdx] : '';
    
    const confidence = yoloPred?.confidence !== undefined ? yoloPred.confidence : 0.1;
    
    let detectionSource = 'YOLO';
    
    let regression_result: number | undefined = undefined;
    try {
      if (category && confidence !== null) {
        const regressionRes = await axios.post(env.regressionUrl, { label: category, confidence });
        const regressionData = regressionRes.data as any;
        regression_result = regressionData.price;
      }
    } catch (err) {
      regression_result = undefined;
    }
    let description: string | undefined = undefined, suggestion: string[] = [], risk_lvl: number | undefined = undefined, validatedCategory: string = category;
    try {
      const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.geminiApiKey}`;
      
      const imageBase64 = req.file.buffer.toString('base64');
      
      let prompt = '';
      const useLowConfidencePrompt = classIdx === null || confidence < 0.65;
      
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
      description = descriptionMatch ? descriptionMatch[1].trim() : undefined;
      
      const suggestionMatch = generatedText.match(/Suggestions:\s*(.+?)(?=\n|$)/i);
      
      if (suggestionMatch && suggestionMatch[1]) {
        suggestion = suggestionMatch[1].split(',').map((s: string) => s.trim()).slice(0, 3);
        
        suggestion = suggestion.map((sugg, index) => {
          const wordCount = sugg.split(/\s+/).filter(word => word.length > 0).length;
          if (wordCount < 5) {
            const defaultArray = DEFAULT_SUGGESTIONS[validatedCategory] || DEFAULT_SUGGESTIONS.default;
            return defaultArray[index % defaultArray.length];
          }
          return sugg;
        });
        
        while (suggestion.length < 3) {
          const defaultArray = DEFAULT_SUGGESTIONS[validatedCategory] || DEFAULT_SUGGESTIONS.default;
          suggestion.push(defaultArray[suggestion.length % defaultArray.length]);
        }
      } else {
        suggestion = DEFAULT_SUGGESTIONS[validatedCategory] || DEFAULT_SUGGESTIONS.default;
      }
      
      const riskMatch = generatedText.match(/Risk Level:\s*(\d+)/i);
      risk_lvl = riskMatch ? parseInt(riskMatch[1], 10) : undefined;
      
      if (description) {
        description = description.split(' ').slice(0, 40).join(' ');
      }
      
      if (Array.isArray(suggestion)) {
        suggestion = suggestion.slice(0, 3);
      }
      
      if (typeof risk_lvl === 'number') {
        risk_lvl = Math.max(1, Math.min(10, Math.round(risk_lvl)));
      }
      
    } catch (err) {
      const error = err as any;
      console.error("Gemini enrichment failed:", error?.response?.data || error?.message || error);
      description = undefined;
      suggestion = DEFAULT_SUGGESTIONS[category] || DEFAULT_SUGGESTIONS.default;
      risk_lvl = undefined;
      validatedCategory = category;
    }

    const detection = await detectionService.createDetection({
      id: uuidv4(),
      user_id,
      image_url: imageUrl,
      category: validatedCategory || 'Unknown',
      confidence,
      regression_result,
      description,
      suggestion: suggestion.join(' | '),
      risk_lvl: risk_lvl || 1,
      detection_source: detectionSource,
    });
    res.status(201).json(detection);
  } catch (err) {
    const error = err as any;
    console.error('Detection creation failed:', {
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      response: error?.response?.data,
      sqlMessage: error?.message || '',
    });
    
    if (error?.code === '23502' || error?.message?.includes('not-null constraint')) {
      res.status(500).json({ 
        message: 'Failed to create detection due to missing required information',
        details: 'The system could not process the image properly. Please try with a clearer image.'
      });
    } else {
      next(err);
    }
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

export async function updateDetection(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const fields = req.body;
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
    
    // Upload image to GCS
    const imageUrl = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
    
    // Update the detection with the new image URL
    const updated = await detectionService.updateDetection(id, { image_url: imageUrl });
    
    res.json(updated);
  } catch (err) {
    next(err);
  }
} 