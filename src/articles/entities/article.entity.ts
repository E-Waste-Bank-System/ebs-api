import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Profile } from '../../profiles/entities/profile.entity';

export enum ArticleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('articles')
export class Article extends BaseEntity {
  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column('jsonb')
  content: any;

  @Column({ nullable: true })
  excerpt?: string;

  @Column({ nullable: true })
  featured_image?: string;

  @Column({
    type: 'enum',
    enum: ArticleStatus,
    default: ArticleStatus.DRAFT,
  })
  status: ArticleStatus;

  @Column('text', { array: true, default: [] })
  tags: string[];

  @Column({ default: 0 })
  view_count: number;

  @Column({ default: false })
  is_featured: boolean;

  @Column({ nullable: true })
  meta_title?: string;

  @Column({ type: 'text', nullable: true })
  meta_description?: string;

  @Column({ type: 'timestamp', nullable: true })
  published_at?: Date;

  // Relations
  @ManyToOne(() => Profile, (profile) => profile.articles)
  @JoinColumn({ name: 'author_id' })
  author: Profile;

  @Column()
  author_id: string;
} 