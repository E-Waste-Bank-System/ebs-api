import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Scan } from '../../scans/entities/scan.entity';
import { RetrainingData } from '../../retraining/entities/retraining.entity';

@Entity('detected_objects')
export class DetectedObject extends BaseEntity {
  @Column({ nullable: true })
  name?: string;

  @Column()
  category: string;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  confidence_score: number;

  @Column({ type: 'jsonb' })
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimated_value?: number;

  @Column({ type: 'int', default: 1 })
  risk_level: number;

  @Column({ type: 'int', default: 1 })
  damage_level: number;

  @Column({ default: false })
  is_validated: boolean;

  @Column({ nullable: true })
  validated_by?: string;

  @Column({ type: 'timestamp', nullable: true })
  validated_at?: Date;

  @Column({ type: 'text', nullable: true })
  validation_notes?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', array: true, nullable: true })
  suggestions?: string[];

  @Column({ type: 'jsonb', nullable: true })
  ai_metadata?: Record<string, any>;

  // Relations
  @ManyToOne(() => Scan, (scan) => scan.objects)
  @JoinColumn({ name: 'scan_id' })
  scan: Scan;

  @Column()
  scan_id: string;

  @OneToMany(() => RetrainingData, (retraining) => retraining.object)
  retraining_data: RetrainingData[];
} 