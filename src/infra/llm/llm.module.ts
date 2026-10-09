import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';

/** Инфраструктурный модуль генеративного ИИ */
@Module({
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
