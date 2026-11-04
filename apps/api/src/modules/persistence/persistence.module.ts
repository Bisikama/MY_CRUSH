import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaStore } from './prisma.store';
import { PlatformStore } from './store';

@Global()
@Module({
  providers: [PrismaService, { provide: PlatformStore, useClass: PrismaStore }],
  exports: [PrismaService, PlatformStore],
})
export class PersistenceModule {}
