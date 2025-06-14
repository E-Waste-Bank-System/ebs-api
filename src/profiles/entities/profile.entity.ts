import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserRole } from '../../common/enums/role.enum';
import { Scan } from '../../scans/entities/scan.entity';
import { Article } from '../../articles/entities/article.entity';

@Entity('profiles')
export class Profile extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  full_name: string;

  @Column({ nullable: true })
  avatar_url?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_login_at?: Date;

  @Column({ default: false })
  email_verified: boolean;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ type: 'jsonb', default: '{}' })
  preferences: Record<string, any>;

  // Relations
  @OneToMany(() => Scan, (scan) => scan.user)
  scans: Scan[];

  @OneToMany(() => Article, (article) => article.author)
  articles: Article[];
} 