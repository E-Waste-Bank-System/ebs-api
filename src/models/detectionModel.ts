/**
 * @swagger
 * components:
 *   schemas:
 *     Detection:
 *       type: object
 *       required:
 *         - id
 *         - user_id
 *         - scan_id
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the object detection
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID of the user who created the detection
 *         scan_id:
 *           type: string
 *           format: uuid
 *           description: ID of the scan this detection belongs to
 *         image_url:
 *           type: string
 *           description: URL of the detected image
 *         detection_source:
 *           type: string
 *           nullable: true
 *           description: Source of the detection (e.g., 'YOLO', 'Gemini Interfered')
 *         category:
 *           type: string
 *           description: Category of the detected e-waste
 *         confidence:
 *           type: number
 *           format: float
 *           description: Confidence score of the detection
 *         regression_result:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Estimated price from regression model
 *         description:
 *           type: string
 *           nullable: true
 *           description: Detailed description of the detection (max 40 words)
 *         suggestion:
 *           type: string
 *           nullable: true
 *           description: Suggestions for handling the e-waste (up to 3 points, stored as pipe-separated string)
 *         risk_lvl:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           nullable: true
 *           description: Risk level of the e-waste (1-10)
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the detection was created
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the detection was last updated
 */

/**
 * Scan model representing a group of objects
 */
interface Scan {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface Detection {
  id: string;
  user_id: string;
  scan_id: string;
  image_url: string;
  detection_source: string | null;
  category: string;
  confidence: number;
  regression_result: number | null;
  description: string | null;
  suggestion: string | null; // Stored as pipe-separated string in DB
  risk_lvl: number | null;
  scans?: Scan;    // Related scan data
  created_at: string;
  updated_at?: string;
} 