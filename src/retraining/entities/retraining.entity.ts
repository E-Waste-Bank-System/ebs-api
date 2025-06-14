import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { DetectedObject } from '../../objects/entities/object.entity';

export enum RetrainingType {
  CORRECTION = 'correction',
  VALIDATION = 'validation',
  IMPROVEMENT = 'improvement',
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

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column()
  submitted_by: string;

  @Column({ default: false })
  is_processed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  processed_at?: Date;

  // Relations
  @ManyToOne(() => DetectedObject, (object) => object.retraining_data)
  @JoinColumn({ name: 'object_id' })
  object: DetectedObject;

  @Column()
  object_id: string;
} 