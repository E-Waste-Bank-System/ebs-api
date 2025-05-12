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
    const category = (classIdx !== null && classIdx >= 0 && classIdx < CLASS_NAMES.length) ? CLASS_NAMES[classIdx] : '';
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
    // Call Gemini API for validation, description, suggestion, risk_lvl
    let description: string | undefined = undefined, suggestion: string[] = [], risk_lvl: number | undefined = undefined, validatedCategory: string = category;
    try {
      const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.geminiApiKey}`;
      const geminiRes = await axios.post(GEMINI_API_URL, {
        contents: [
          {
            parts: [
              { text: `Image URL: ${imageUrl}\nYOLO Result: ${JSON.stringify(yoloData.predictions)}\nCategory: ${category}\nPrompt: Validasi kategori e-waste, berikan hingga 3 saran singkat, deskripsi (maks 40 kata), dan tingkat risiko (1-10).\nBalas hanya dengan format berikut (tanpa penjelasan tambahan):\n\nDeskripsi: <deskripsi singkat maksimal 40 kata>\nSaran: <saran1 maksimal 10 kata>, <saran2 maksimal 10 kata>, <saran3 maksimal 10 kata >\nTingkat Risiko: <angka 1-10>` }
            ]
          }
        ]
      });
      const geminiData = geminiRes.data as any;
      const generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log("Gemini generated text:", generatedText);
      // Parse the generated text for description, suggestions, and risk level (strict template)
      const descriptionMatch = generatedText.match(/Deskripsi:\s*(.+)/i);
      description = descriptionMatch ? descriptionMatch[1].trim() : undefined;
      const suggestionMatch = generatedText.match(/Saran:\s*(.+)/i);
      suggestion = suggestionMatch ? suggestionMatch[1].split(',').map((s: string) => s.trim()).slice(0, 3) : [];
      const riskMatch = generatedText.match(/Tingkat Risiko:\s*(\d+)/i);
      risk_lvl = riskMatch ? parseInt(riskMatch[1], 10) : undefined;
      // Enforce limits
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
      suggestion = [];
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