import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RetrainingData, Dataset, AnnotationTask, DatasetStatus, AnnotationStatus } from './entities/retraining.entity';
import { DetectedObject } from '../objects/entities/object.entity';
import * as archiver from 'archiver';
import { Readable } from 'stream';

@Injectable()
export class RetrainingService {
  constructor(
    @InjectRepository(RetrainingData)
    private retrainingRepository: Repository<RetrainingData>,
    @InjectRepository(Dataset)
    private datasetRepository: Repository<Dataset>,
    @InjectRepository(AnnotationTask)
    private annotationTaskRepository: Repository<AnnotationTask>,
    @InjectRepository(DetectedObject)
    private objectRepository: Repository<DetectedObject>,
  ) {}

  async create(data: Partial<RetrainingData>): Promise<RetrainingData> {
    const retraining = this.retrainingRepository.create(data);
    return await this.retrainingRepository.save(retraining);
  }

  async findAll(): Promise<RetrainingData[]> {
    return await this.retrainingRepository.find({
      relations: ['object', 'object.scan', 'object.scan.user', 'dataset', 'annotation_task'],
      order: { created_at: 'DESC' },
    });
  }

  async remove(id: string): Promise<void> {
    const retraining = await this.retrainingRepository.findOne({
      where: { id },
    });

    if (!retraining) {
      throw new NotFoundException('Retraining data not found');
    }

    await this.retrainingRepository.remove(retraining);
  }

  async createDataset(data: {
    name: string;
    description?: string;
    created_by: string;
    configuration?: any;
  }): Promise<Dataset> {
    const dataset = this.datasetRepository.create({
      ...data,
      status: DatasetStatus.DRAFT,
    });
    return await this.datasetRepository.save(dataset);
  }

  async getDatasets(): Promise<Dataset[]> {
    return await this.datasetRepository.find({
      relations: ['annotation_tasks'],
      order: { created_at: 'DESC' },
    });
  }

  async getDataset(id: string): Promise<Dataset> {
    const dataset = await this.datasetRepository.findOne({
      where: { id },
      relations: ['annotation_tasks', 'retraining_data'],
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    return dataset;
  }

  async updateDataset(id: string, data: Partial<Dataset>): Promise<Dataset> {
    const dataset = await this.getDataset(id);
    Object.assign(dataset, data);
    return await this.datasetRepository.save(dataset);
  }

  async deleteDataset(id: string): Promise<void> {
    const dataset = await this.getDataset(id);
    
    if (dataset.status === DatasetStatus.TRAINING) {
      throw new BadRequestException('Cannot delete dataset while training is in progress');
    }

    await this.datasetRepository.remove(dataset);
  }

  async addImagesToDataset(datasetId: string, objectIds: string[]): Promise<AnnotationTask[]> {
    console.log('=== addImagesToDataset called ===');
    console.log('datasetId:', datasetId);
    console.log('objectIds:', objectIds);
    console.log('objectIds length:', objectIds?.length);
    console.log('objectIds type:', typeof objectIds);
    
    if (!objectIds || objectIds.length === 0) {
      throw new BadRequestException('No object IDs provided');
    }

    const dataset = await this.getDataset(datasetId);
    console.log('Dataset found:', dataset.id, dataset.name);
    
    // Use query builder to ensure scan relation is loaded
    const objects = await this.objectRepository
      .createQueryBuilder('object')
      .leftJoinAndSelect('object.scan', 'scan')
      .where('object.id IN (:...objectIds)', { objectIds })
      .getMany();

    console.log(`Found ${objects.length} objects for dataset ${datasetId}`);
    console.log('Requested object IDs:', objectIds);
    console.log('Found object IDs:', objects.map(obj => obj.id));
    console.log('Objects with scan:', objects.map(obj => ({ 
      id: obj.id, 
      hasScan: !!obj.scan, 
      scanImageUrl: obj.scan?.image_url 
    })));

    if (objects.length !== objectIds.length) {
      const foundIds = objects.map(obj => obj.id);
      const missingIds = objectIds.filter(id => !foundIds.includes(id));
      console.error('Missing object IDs:', missingIds);
      throw new BadRequestException(`Objects not found: ${missingIds.join(', ')}`);
    }

    const tasks: AnnotationTask[] = [];
    
    for (const object of objects) {
      // Extra defensive checks
      if (!object) {
        console.error('Object is null or undefined');
        continue;
      }

      if (!object.scan) {
        console.error(`Object ${object.id} does not have associated scan data`);
        throw new BadRequestException(`Object ${object.id} does not have associated scan data`);
      }

      if (!object.scan.image_url) {
        console.error(`Object ${object.id} scan does not have image_url`);
        throw new BadRequestException(`Object ${object.id} scan does not have image_url`);
      }

      try {
        const task = this.annotationTaskRepository.create({
          dataset_id: datasetId,
          object_id: object.id,
          image_url: object.scan.image_url,
          original_filename: object.scan.original_filename || null,
          status: AnnotationStatus.PENDING,
          annotations: [{
            id: `ai_${object.id}`,
            category: object.category,
            bbox: object.bounding_box,
            confidence: object.confidence_score,
            is_ai_generated: true,
            verified: false,
          }],
        });
        
        const savedTask = await this.annotationTaskRepository.save(task);
        tasks.push(savedTask);
        console.log(`Successfully created task for object ${object.id}`);
      } catch (error) {
        console.error(`Error creating task for object ${object.id}:`, error);
        throw error;
      }
    }

    await this.updateDatasetCounters(datasetId);
    
    return tasks;
  }

  async getAnnotationTasks(datasetId: string): Promise<AnnotationTask[]> {
    return await this.annotationTaskRepository.find({
      where: { dataset_id: datasetId },
      relations: ['source_object', 'source_object.scan'],
      order: { created_at: 'ASC' },
    });
  }

  async getAnnotationTask(id: string): Promise<AnnotationTask> {
    const task = await this.annotationTaskRepository.findOne({
      where: { id },
      relations: ['dataset', 'source_object', 'source_object.scan'],
    });

    if (!task) {
      throw new NotFoundException('Annotation task not found');
    }

    return task;
  }

  async updateAnnotationTask(id: string, data: {
    annotations?: any[];
    status?: AnnotationStatus;
    notes?: string;
    assigned_to?: string;
  }): Promise<AnnotationTask> {
    const task = await this.getAnnotationTask(id);
    
    if (data.annotations) {
      task.annotations = data.annotations;
    }
    
    if (data.status) {
      task.status = data.status;
      if (data.status === AnnotationStatus.COMPLETED) {
        task.completed_at = new Date();
      }
    }
    
    if (data.notes) {
      task.notes = data.notes;
    }
    
    if (data.assigned_to) {
      task.assigned_to = data.assigned_to;
      task.assigned_at = new Date();
      task.status = AnnotationStatus.IN_PROGRESS;
    }

    const updatedTask = await this.annotationTaskRepository.save(task);
    
    await this.updateDatasetCounters(task.dataset_id);
    
    return updatedTask;
  }

  async assignAnnotationTask(taskId: string, userId: string): Promise<AnnotationTask> {
    return await this.updateAnnotationTask(taskId, {
      assigned_to: userId,
    });
  }

  async startTraining(datasetId: string): Promise<Dataset> {
    const dataset = await this.getDataset(datasetId);
    
    if (dataset.status === DatasetStatus.TRAINING) {
      throw new BadRequestException('Training already in progress');
    }

    const completedTasks = await this.annotationTaskRepository.count({
      where: { 
        dataset_id: datasetId, 
        status: AnnotationStatus.COMPLETED 
      },
    });

    if (completedTasks < 10) {
      throw new BadRequestException('Need at least 10 completed annotations to start training');
    }

    dataset.status = DatasetStatus.TRAINING;
    dataset.training_started_at = new Date();
    
    return await this.datasetRepository.save(dataset);
  }

  async completeTraining(datasetId: string, metrics: {
    final_map?: number;
    precision?: number;
    recall?: number;
    epochs_completed?: number;
    best_weights_path?: string;
  }): Promise<Dataset> {
    const dataset = await this.getDataset(datasetId);
    
    dataset.status = DatasetStatus.COMPLETED;
    dataset.training_completed_at = new Date();
    dataset.training_metrics = metrics;
    
    return await this.datasetRepository.save(dataset);
  }

  async failTraining(datasetId: string, error: string): Promise<Dataset> {
    const dataset = await this.getDataset(datasetId);
    
    dataset.status = DatasetStatus.FAILED;
    dataset.training_completed_at = new Date();
    dataset.training_metrics = { 
      final_map: 0,
      precision: 0,
      recall: 0,
      epochs_completed: 0,
      best_weights_path: `error: ${error}`
    };
    
    return await this.datasetRepository.save(dataset);
  }

  async exportDatasetForTraining(datasetId: string): Promise<{
    images: Array<{ url: string; annotations: any[] }>;
    classes: string[];
  }> {
    const tasks = await this.annotationTaskRepository.find({
      where: { 
        dataset_id: datasetId, 
        status: AnnotationStatus.COMPLETED 
      },
      relations: ['source_object', 'source_object.scan'],
    });

    const images = tasks.map(task => ({
      url: task.image_url,
      annotations: task.annotations || [],
    }));

    const classes = Array.from(new Set(
      tasks.flatMap(task => 
        task.annotations?.map(ann => ann.category) || []
      )
    ));

    return { images, classes };
  }

  async exportYoloDataset(objectIds: string[]): Promise<Readable> {
    console.log('Exporting YOLO dataset for objects:', objectIds);
    
    if (!objectIds || objectIds.length === 0) {
      throw new BadRequestException('No object IDs provided for export');
    }

    // Fetch objects with their scan data
    const objects = await this.objectRepository
      .createQueryBuilder('object')
      .leftJoinAndSelect('object.scan', 'scan')
      .where('object.id IN (:...objectIds)', { objectIds })
      .getMany();

    console.log(`Found ${objects.length} objects out of ${objectIds.length} requested`);
    
    if (objects.length === 0) {
      throw new NotFoundException('No objects found for export');
    }

    // Group objects by category and assign class IDs
    const categoriesSet = new Set(objects.map(obj => obj.category));
    const categories = Array.from(categoriesSet).sort();
    const categoryToId = new Map<string, number>();
    categories.forEach((category, index) => {
      categoryToId.set(category, index);
    });

    console.log('Categories found:', categories);
    console.log('Category mapping:', Object.fromEntries(categoryToId));

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    // Create classes.txt content
    const classesContent = categories.join('\n');
    archive.append(classesContent, { name: 'classes.txt' });

    // Create data.yaml for YOLO
    const dataYaml = `# YOLO Dataset Configuration
path: .
train: images
val: images
test: images

# Classes
nc: ${categories.length}
names: [${categories.map(cat => `'${cat}'`).join(', ')}]
`;
    archive.append(dataYaml, { name: 'data.yaml' });

    // Process each object
    for (const object of objects) {
      if (!object.scan?.image_url) {
        console.warn(`Skipping object ${object.id} - no image URL`);
        continue;
      }

              try {
          // Fetch the image
          const fetch = (await import('node-fetch')).default;
          const imageResponse = await fetch(object.scan.image_url);
          
          if (!imageResponse.ok) {
            console.warn(`Failed to fetch image for object ${object.id}: ${imageResponse.status} ${imageResponse.statusText}`);
            continue;
          }

          const imageBuffer = await imageResponse.buffer();
          const imageFilename = `${object.id}.jpg`;
          
          // Add image to archive
          archive.append(imageBuffer, { name: `images/${imageFilename}` });

          // Create YOLO label file
          const classId = categoryToId.get(object.category);
          if (classId === undefined) {
            console.warn(`Unknown category for object ${object.id}: ${object.category}`);
            continue;
          }
          
          const bbox = object.bounding_box;
          if (!bbox || typeof bbox.x !== 'number' || typeof bbox.y !== 'number' || 
              typeof bbox.width !== 'number' || typeof bbox.height !== 'number') {
            console.warn(`Invalid bounding box for object ${object.id}:`, bbox);
            continue;
          }
          
          // YOLO format: class_id center_x center_y width height (all normalized 0-1)
          const yoloLabel = `${classId} ${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`;
          const labelFilename = `${object.id}.txt`;
          
          // Add label to archive
          archive.append(yoloLabel, { name: `labels/${labelFilename}` });

          console.log(`Added object ${object.id} with label: ${yoloLabel}`);
        } catch (error) {
          console.error(`Error processing object ${object.id}:`, error);
          // Continue with other objects
        }
    }

    // Create README.md with instructions
    const readmeContent = `# YOLO Dataset Export

This dataset contains ${objects.length} e-waste objects in YOLO v11 format.

## Structure
- \`images/\` - Training images (JPG format)
- \`labels/\` - YOLO label files (TXT format)
- \`classes.txt\` - List of class names
- \`data.yaml\` - YOLO configuration file

## Classes (${categories.length} total)
${categories.map((cat, idx) => `${idx}: ${cat}`).join('\n')}

## Label Format
Each label file contains one line per object:
\`class_id center_x center_y width height\`

All coordinates are normalized (0.0 - 1.0) relative to image dimensions.

## Usage with YOLOv11
\`\`\`bash
# Train a new model
yolo detect train data=data.yaml model=yolo11n.pt epochs=100

# Continue training from checkpoint
yolo detect train data=data.yaml model=yolo11s.pt resume=True
\`\`\`

Generated by EBS (E-waste Detection System)
`;
    archive.append(readmeContent, { name: 'README.md' });

    // Finalize the archive
    archive.finalize();
    
    console.log(`YOLO dataset export completed: ${categories.length} categories, ${objects.length} objects processed`);
    console.log('Archive structure: images/, labels/, classes.txt, data.yaml, README.md');

    return archive;
  }

  private async updateDatasetCounters(datasetId: string): Promise<void> {
    const totalImages = await this.annotationTaskRepository.count({
      where: { dataset_id: datasetId },
    });

    const annotatedImages = await this.annotationTaskRepository.count({
      where: { 
        dataset_id: datasetId, 
        status: AnnotationStatus.COMPLETED 
      },
    });

    const totalAnnotations = await this.annotationTaskRepository
      .createQueryBuilder('task')
      .where('task.dataset_id = :datasetId', { datasetId })
      .andWhere('task.annotations IS NOT NULL')
      .getCount();

    await this.datasetRepository.update(datasetId, {
      total_images: totalImages,
      annotated_images: annotatedImages,
      total_annotations: totalAnnotations,
    });
  }
} 