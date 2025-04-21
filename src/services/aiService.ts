import axios from 'axios';
import FormData from 'form-data';
import env from '../config/env';

export async function runInference(
  buffer: Buffer,
  originalName: string,
  mimetype: string
): Promise<any> {
  const form = new FormData();
  form.append('image', buffer, { filename: originalName, contentType: mimetype });

  const response = await axios.post(env.YOLO_URL, form, {
    headers: form.getHeaders(),
  });
  return response.data;
}

export async function runEstimate(
  category: string,
  weight: number
): Promise<any> {
  const response = await axios.post(
    env.REGRESSION_URL,
    { category, weight },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return response.data;
}