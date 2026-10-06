import { Room } from './room';
import { RoomRewardType } from '../types';

export class DungeonManager {
  public sector: number = 1;
  public roomIndex: number = 1;
  public totalRoomsInSector: number = 5;
  public currentRoom: Room | null = null;

  constructor() {
    this.startNewRun();
  }

  public startNewRun() {
    this.sector = 1;
    this.roomIndex = 1;
    this.loadCurrentRoom();
  }

  public isBossRoom(): boolean {
    return this.roomIndex >= this.totalRoomsInSector;
  }

  public loadCurrentRoom(): Room {
    const isBoss = this.isBossRoom();
    const room = new Room(this.sector, isBoss);

    // Setup exit choices for when room is cleared
    let rewards: RoomRewardType[] = [];
    if (this.roomIndex + 1 >= this.totalRoomsInSector) {
      rewards = ['boss'];
    } else {
      const pool: RoomRewardType[] = ['cyberware', 'nanites', 'heal', 'overclock_core'];
      rewards = [
        'cyberware',
        pool[Math.floor(Math.random() * pool.length)],
        pool[Math.floor(Math.random() * pool.length)]
      ];
    }

    room.setupDoors(rewards);
    this.currentRoom = room;
    return room;
  }

  public advanceToRoom(rewardType: RoomRewardType) {
    if (this.isBossRoom()) {
      if (this.sector === 1) {
        // Advance to Sector 2
        this.sector = 2;
        this.roomIndex = 1;
      } else {
        // Run completed!
        return { victory: true };
      }
    } else {
      this.roomIndex++;
    }

    this.loadCurrentRoom();
    return { victory: false, rewardType };
  }
}
