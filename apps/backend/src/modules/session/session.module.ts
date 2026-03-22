import { Module, forwardRef } from '@nestjs/common';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { IngestModule } from '@ingest/ingest.module';
import { CollectionModule } from '@collection/collection.module';

@Module({
  imports: [IngestModule, forwardRef(() => CollectionModule)],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule { }
