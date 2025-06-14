import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Profile } from '../../profiles/entities/profile.entity';
import { DetectedObject } from '../../objects/entities/object.entity';

export enum ScanStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('scans')
export class Scan extends BaseEntity {
  @Column()
  image_url: string;

  @Column({ nullable: true })
  original_filename?: string;

  @Column({
    type: 'enum',
    enum: ScanStatus,
    default: ScanStatus.PROCESSING,
  })
  status: ScanStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error_message?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_estimated_value: number;

  @Column({ default: 0 })
  objects_count: number;

  @Column({ type: 'timestamp', nullable: true })
  processed_at?: Date;

  // Relations
  @ManyToOne(() => Profile, (profile) => profile.scans)
  @JoinColumn({ name: 'user_id' })
  user: Profile;

  @Column()
  user_id: string;

  @OneToMany(() => DetectedObject, (object) => object.scan)
  objects: DetectedObject[];
} 