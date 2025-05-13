import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as detectionService from '../services/detectionService';
import { uploadImage } from '../utils/gcs';
import env from '../config/env';
import axios from 'axios';
import { getErrorMessage } from '../utils/error-utils';
import { AuthRequest } from '../middlewares/auth';
import FormData from 'form-data';

// Map YOLO class index to category name
const CLASS_NAMES = [
  'Battery', 'Body Weight Scale', 'Calculator', 'Clock', 'DVD Player', 'DVD ROM', 'Electronic Socket', 'Fan', 'Flashlight', 'Fridge', 'GPU', 'Handphone', 'Harddisk', 'Insect Killer', 'Iron', 'Keyboard', 'Lamp', 'Laptop', 'Laptop Charger', 'Microphone', 'Microwave', 'Monitor', 'Motherboard', 'Mouse', 'PC Case', 'Power Supply', 'Powerbank', 'Printer', 'Printer Ink', 'Radio', 'Rice Cooker', 'Router', 'Solar Panel', 'Speaker', 'Television', 'Toaster', 'Walkie Talkie', 'Washing Machine'
];

// Default suggestions for each category if Gemini response is too short
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

export async function createDetection(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ message: 'Image file is required' });
      return;
    }
    // Upload image to GCS
    const imageUrl = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
    // Call YOLO API (cv_model/predict) with multipart/form-data
    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);
    const yoloRes = await axios.post(env.yoloUrl, formData, {
      headers: formData.getHeaders(),
    });
    const yoloData = yoloRes.data as any;
    const yoloPred = yoloData.predictions && yoloData.predictions[0];
    const classIdx = typeof yoloPred?.class === 'number' ? yoloPred.class : null;
    let category = (classIdx !== null && classIdx >= 0 && classIdx < CLASS_NAMES.length) ? CLASS_NAMES[classIdx] : '';
    const confidence = yoloPred?.confidence ?? null;
    // Call regression API (optional, fallback to null)
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
      
      // Convert buffer to base64
      const imageBase64 = req.file.buffer.toString('base64');
      
      // Different prompt based on confidence level
      let prompt = '';
      const useLowConfidencePrompt = confidence === null || confidence < 0.65;
      
      if (useLowConfidencePrompt) {
        prompt = `Analyze this e-waste image and classify it into one of these categories: ${CLASS_NAMES.join(', ')}.
Then provide a description (10-40 words), up to 3 suggestions for handling, and a risk level (1-10).
Respond in this exact format without additional explanations:

Category: <1-2 word of category>
Description: <short description 10-40 words in indonesian>
Suggestions: <suggestion1 exactly 7-15 words in indonesian>, <suggestion2 exactly 7-15 words in indonesian>, <suggestion3 exactly 7-15 words in indonesian>
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
        ]
      });
      
      const geminiData = geminiRes.data as any;
      const generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log("Gemini generated text:", generatedText);
      
      // Extract category if confidence is low
      if (useLowConfidencePrompt) {
        const categoryMatch = generatedText.match(/Category:\s*(.+?)(?=\n|$)/i);
        if (categoryMatch && categoryMatch[1]) {
          const geminiCategory = categoryMatch[1].trim();
          // Check if it's one of our valid categories
          if (CLASS_NAMES.includes(geminiCategory)) {
            validatedCategory = geminiCategory;
          } else {
            // Find closest match if needed
            const closestMatch = CLASS_NAMES.find(name => 
              name.toLowerCase() === geminiCategory.toLowerCase());
            if (closestMatch) {
              validatedCategory = closestMatch;
            }
          }
        }
      }
      
      const descriptionMatch = generatedText.match(/Description:\s*(.+?)(?=\n|$)/i);
      description = descriptionMatch ? descriptionMatch[1].trim() : undefined;
      
      const suggestionMatch = generatedText.match(/Suggestions:\s*(.+?)(?=\n|$)/i);
      
      if (suggestionMatch && suggestionMatch[1]) {
        suggestion = suggestionMatch[1].split(',').map((s: string) => s.trim()).slice(0, 3);
        
        // Check if suggestions meet minimum word count and replace if needed
        suggestion = suggestion.map((sugg, index) => {
          const wordCount = sugg.split(/\s+/).filter(word => word.length > 0).length;
          if (wordCount < 5) {
            // Use default suggestion based on category or fallback to generic
            const defaultArray = DEFAULT_SUGGESTIONS[validatedCategory] || DEFAULT_SUGGESTIONS.default;
            return defaultArray[index % defaultArray.length];
          }
          return sugg;
        });
        
        // If we have fewer than 3 suggestions, add default ones
        while (suggestion.length < 3) {
          const defaultArray = DEFAULT_SUGGESTIONS[validatedCategory] || DEFAULT_SUGGESTIONS.default;
          suggestion.push(defaultArray[suggestion.length % defaultArray.length]);
        }
      } else {
        // No suggestions found, use defaults
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
    // Save detection
    const detection = await detectionService.createDetection({
      id: uuidv4(),
      user_id: req.user.id,
      image_url: imageUrl,
      category: validatedCategory,
      confidence,
      regression_result,
      description,
      suggestion: suggestion.join(' | '), // Store as string, or change DB to array if supported
      risk_lvl,
    });
    res.status(201).json(detection);
  } catch (err) {
    next(err);
  }
}

export async function getAllDetections(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await detectionService.getAllDetections();
    res.json(data);
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