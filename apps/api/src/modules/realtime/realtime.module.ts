import { Module } from '@nestjs/common';
import { PlayersModule } from '../players/players.module';
import { RoomsModule } from '../rooms/rooms.module';
import { GameGateway } from './game.gateway';
@Module({ imports: [PlayersModule, RoomsModule], providers: [GameGateway] })
export class RealtimeModule {}
