import { 
  Controller, 
  Post, 
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';

import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { ErrorResponseDto } from '../common/dto/response.dto';

@ApiTags('📁 File Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Upload file to cloud storage',
    description: `
      Upload files to Google Cloud Storage and receive a public URL.
      
      **Supported File Types:**
      - **Images**: JPG, JPEG, PNG, GIF, WebP
      - **Documents**: PDF, TXT
      
      **Specifications:**
      - Maximum file size: 10MB
      - Files are stored in Google Cloud Storage
      - Public URLs returned for immediate access
      - Automatic content type detection
      
      **Use Cases:**
      - Article featured images
      - User profile avatars  
      - Document attachments
      - General file storage needs
      
      **Storage Organization:**
      Files can be organized using the optional \`path\` parameter to specify
      custom folders (e.g., 'articles/featured-images', 'profiles/avatars').
    `
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload with optional path organization',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (JPG, PNG, GIF, WebP, PDF, TXT - max 10MB)',
          example: 'featured-image.jpg'
        },
        path: {
          type: 'string',
          description: 'Optional custom folder path for organization',
          example: 'articles/featured-images',
          pattern: '^[a-zA-Z0-9/_-]+$'
        }
      },
      required: ['file']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully to cloud storage',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          format: 'uri',
          description: 'Public URL of the uploaded file',
          example: 'https://storage.googleapis.com/ebs-storage/uploads/2024/01/15/image-123.jpg'
        }
      }
    },
    example: {
      url: 'https://storage.googleapis.com/ebs-storage/articles/featured-images/sustainable-tech-guide.jpg'
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - file missing, invalid format, or validation error',
    type: ErrorResponseDto,
    example: {
      statusCode: 400,
      message: 'File is required',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/upload'
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 413,
    description: 'Payload too large - file exceeds 10MB limit',
    type: ErrorResponseDto,
    example: {
      statusCode: 413,
      message: 'File too large',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/upload'
    }
  })
  @ApiResponse({
    status: 415,
    description: 'Unsupported media type - invalid file format',
    type: ErrorResponseDto,
    example: {
      statusCode: 415,
      message: 'File type not allowed. Only images and PDFs are supported.',
      timestamp: '2024-01-15T10:30:00.000Z',
      path: '/api/v1/upload'
    }
  })
  async uploadFile(
    @UploadedFile() file: any,
    @Body() body: { path?: string },
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const url = await this.uploadService.uploadFile(file, body.path);
    return { url };
  }
} 