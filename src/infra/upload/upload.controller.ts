import {
  Controller,
  Delete,
  FileTypeValidator,
  HttpStatus,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Authorization } from '../../common';
import { UploadService } from './upload.service';
import { DeleteFileQueryDto } from './dto/delete-file-query.dto';

@ApiTags('Upload')
@Controller('upload')
@Authorization(Role.ADMIN)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Загрузить изображение в публичное хранилище (Доступ: ADMIN)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Изображение успешно загружено',
    schema: {
      type: 'object',
      properties: {
        fileName: { type: 'string', example: 'photo.jpg' },
        filePath: { type: 'string', example: '/uploads/public/uuid.jpg' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Файл не прошел валидацию (размер > 10MB или неподдерживаемый формат)',
  })
  uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|avif|svg)$/i }),
        ],
      }),
    )
    file: {
      originalname: string;
      buffer: Buffer;
    },
  ) {
    return this.uploadService.saveFile(file, 'public');
  }

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Загрузить приватный файл PDF/ZIP/DOC (Доступ: ADMIN)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Файл успешно загружен',
    schema: {
      type: 'object',
      properties: {
        fileName: { type: 'string', example: 'document.pdf' },
        filePath: { type: 'string', example: '/uploads/private/uuid.pdf' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Файл не прошел валидацию (размер > 50MB или неподдерживаемый формат)',
  })
  uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /(pdf|zip|rar|doc|docx|epub|txt)$/i,
          }),
        ],
      }),
    )
    file: {
      originalname: string;
      buffer: Buffer;
    },
  ) {
    return this.uploadService.saveFile(file, 'private');
  }

  @Delete('file')
  @ApiOperation({
    summary: 'Удалить загруженный файл с диска (Доступ: ADMIN)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Файл успешно удален',
  })
  async deleteFile(@Query() query: DeleteFileQueryDto) {
    await this.uploadService.deleteFile(query.filePath);
    return { success: true };
  }
}
