import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { DetectedObject } from '../../objects/entities/object.entity';

export enum RetrainingType {
  CORRECTION = 'correction',
  VALIDATION = 'validation',
  IMPROVEMENT = 'improvement',
  ANNOTATION = 'annotation',
}

export enum DatasetStatus {
  DRAFT = 'draft',
  ANNOTATING = 'annotating',
  READY = 'ready',
  TRAINING = 'training',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum AnnotationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REVIEWED = 'reviewed',
  REJECTED = 'rejected',
}

@Entity('datasets')
export class Dataset extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: DatasetStatus,
    default: DatasetStatus.DRAFT,
  })
  status: DatasetStatus;

  @Column({ type: 'jsonb', nullable: true })
  configuration?: {
    train_split: number;
    val_split: number;
    test_split: number;
    augmentation_config?: Record<string, any>;
    model_config?: Record<string, any>;
  };

  @Column({ default: 0 })
  total_images: number;

  @Column({ default: 0 })
  annotated_images: number;

  @Column({ default: 0 })
  total_annotations: number;

  @Column()
  created_by: string;

  @Column({ type: 'timestamp', nullable: true })
  training_started_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  training_completed_at?: Date;

  @Column({ type: 'jsonb', nullable: true })
  training_metrics?: {
    final_map?: number;
    precision?: number;
    recall?: number;
    epochs_completed?: number;
    best_weights_path?: string;
  };

  @OneToMany(() => AnnotationTask, (task) => task.dataset)
  annotation_tasks: AnnotationTask[];

  @OneToMany(() => RetrainingData, (retraining) => retraining.dataset)
  retraining_data: RetrainingData[];
}

@Entity('annotation_tasks')
export class AnnotationTask extends BaseEntity {
  @ManyToOne(() => Dataset, (dataset) => dataset.annotation_tasks)
  @JoinColumn({ name: 'dataset_id' })
  dataset: Dataset;

  @Column()
  dataset_id: string;

  @ManyToOne(() => DetectedObject, { nullable: true })
  @JoinColumn({ name: 'object_id' })
  source_object?: DetectedObject;

  @Column({ nullable: true })
  object_id?: string;

  @Column()
  image_url: string;

  @Column({ nullable: true })
  original_filename?: string;

  @Column({
    type: 'enum',
    enum: AnnotationStatus,
    default: AnnotationStatus.PENDING,
  })
  status: AnnotationStatus;

  @Column({ type: 'jsonb', nullable: true })
  annotations?: Array<{
    id: string;
    category: string;
    bbox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    confidence?: number;
    is_ai_generated: boolean;
    verified: boolean;
  }>;

  @Column({ nullable: true })
  assigned_to?: string;

  @Column({ type: 'timestamp', nullable: true })
  assigned_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => RetrainingData, (retraining) => retraining.annotation_task)
  retraining_data: RetrainingData[];
}

@Entity('retraining_data')
export class RetrainingData extends BaseEntity {
  @Column({
    type: 'enum',
    enum: RetrainingType,
  })
  type: RetrainingType;

  @Column()
  original_category: string;

  @Column({ nullable: true })
  corrected_category?: string;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  original_confidence: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  corrected_value?: number;

  @Column({ type: 'jsonb', nullable: true })
  correction_data?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  annotation_data?: {
    original_bbox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    corrected_bbox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    quality_score?: number;
    reviewer_notes?: string;
  };

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column()
  submitted_by: string;

  @Column({ default: false })
  is_processed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  processed_at?: Date;

  // Relations
  @ManyToOne(() => DetectedObject, (object) => object.retraining_data, { nullable: true })
  @JoinColumn({ name: 'object_id' })
  object?: DetectedObject;

  @Column({ nullable: true })
  object_id?: string;

  @ManyToOne(() => Dataset, (dataset) => dataset.retraining_data, { nullable: true })
  @JoinColumn({ name: 'dataset_id' })
  dataset?: Dataset;

  @Column({ nullable: true })
  dataset_id?: string;

  @ManyToOne(() => AnnotationTask, (task) => task.retraining_data, { nullable: true })
  @JoinColumn({ name: 'annotation_task_id' })
  annotation_task?: AnnotationTask;

  @Column({ nullable: true })
  annotation_task_id?: string;
} 