import { Module } from '@nestjs/common';
import { IndexNowService } from './index-now.service';
import { IndexNowSitemapService } from './index-now-sitemap.service';
import { IndexNowListener } from './index-now.listener';
import { IndexNowController } from './index-now.controller';

@Module({
  controllers: [IndexNowController],
  providers: [IndexNowService, IndexNowSitemapService, IndexNowListener],
  exports: [IndexNowService, IndexNowSitemapService],
})
export class IndexNowModule {}
