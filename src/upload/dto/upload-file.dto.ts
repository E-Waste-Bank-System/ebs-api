import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadFileRequestDto {
  @ApiPropertyOptional({
    description: 'Optional custom folder path for organization',
    example: 'articles/featured-images',
    pattern: '^[a-zA-Z0-9/_-]+$'
  })
  path?: string;
}

export class UploadFileResponseDto {
  @ApiProperty({
    description: 'Public URL of the uploaded file',
    example: 'https://storage.googleapis.com/ebs-storage/uploads/2024/01/15/image-123.jpg',
    format: 'uri',
  })
  url: string;
} 