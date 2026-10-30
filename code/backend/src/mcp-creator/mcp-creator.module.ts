import { Module } from '@nestjs/common';
import { McpCreatorController } from './mcp-creator.controller.js';
import { McpCreatorService } from './mcp-creator.service.js';
import { ScannerService } from './scanner.service.js';
import { SynthesizerService } from './synthesizer.service.js';
import { ExecutorService } from './executor.service.js';
import { WordpressEnricherService } from './enrichers/wordpress-enricher.service.js';
import { GithubEnricherService } from './enrichers/github-enricher.service.js';

@Module({
  controllers: [McpCreatorController],
  providers: [
    McpCreatorService,
    ScannerService,
    SynthesizerService,
    ExecutorService,
    WordpressEnricherService,
    GithubEnricherService,
  ],
  exports: [McpCreatorService],
})
export class McpCreatorModule {}
