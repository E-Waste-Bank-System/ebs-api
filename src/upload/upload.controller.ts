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

@ApiTags('File Upload')
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
      Upload files to Google Cloud Storage and get a public URL.
      
      **Supported file types:**
      - Images: JPG, JPEG, PNG, GIF, WebP
      - Documents: PDF
      - Maximum file size: 10MB
      
      **Usage:**
      - For article featured images
      - For user avatars
      - For general file storage needs
      
      The file will be stored in Google Cloud Storage and a public URL will be returned.
    `
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload with optional path',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (max 10MB)'
        },
        path: {
          type: 'string',
          description: 'Optional custom path/folder for the file',
          example: 'articles/featured-images'
        }
      },
      required: ['file']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
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
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - file missing or invalid format',
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 413,
    description: 'File too large - exceeds 10MB limit',
    type: ErrorResponseDto
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