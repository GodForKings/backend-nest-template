import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common';

export class UserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Поисковый запрос (по email, имени или телефону)',
    example: 'иван',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
