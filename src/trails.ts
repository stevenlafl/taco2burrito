import { promises as fs } from 'fs';

// Class Definitions from previous code
class CVector3 implements Position {
  x: number;
  y: number;
  z: number;

  constructor(values: Float32Array) {
    this.x = values[0];
    this.y = values[1];
    this.z = values[2];
  }
}

export class GW2Trail {
  positions: CVector3[];
  mapId: number;

  constructor() {
    this.positions = [];
    this.mapId = 0;
  }

  importPositions(f: DataView, keepPoints: boolean): boolean {
    this.mapId = f.getInt32(4, true);

    if (!keepPoints) {
      this.positions.length = 0;  // Clears the array (flush)
    }

    const dataOffset = 8;  // Skipping the first 8 bytes (includes mapId)
    const elementSize = 12;  // Each vector of 3 floats takes 12 bytes (3 * Float32 = 12 bytes)

    let length = (f.byteLength - dataOffset) / elementSize;

    for (let x = 0; x < length; x++) {
      const baseIndex = dataOffset + x * elementSize;
      const values = new Float32Array(f.buffer, baseIndex, 3);
      this.positions.push(new CVector3(values));  // Add new CVector3 to positions
    }

    // Since you want the Build function to be ignored, we omit that part here
    //console.log(`Positions imported: ${this.positions.length}`);

    return true;
  }

  async loadTrail(filePath: string): Promise<void> {
    // Read file data as a buffer (binary data)
    const fileBuffer = await fs.readFile(filePath);

    // Create a DataView from the file's buffer
    const dataView = new DataView(fileBuffer.buffer);

    // Call the importPositions method
    this.importPositions(dataView, true);
  }

  getPositions(): CVector3[] {
    return this.positions;
  }

  getMapId(): number {
    return this.mapId;
  }
}

// // Path to the file (relative or absolute)
// const trailFilePath = path.join(__dirname, 'tw_mc_trails_shiverpeaks_wayfarerfoothills_toggletrail.trl');

// // Call the async function to load file and invoke the imported method
// loadAndProcessTrail(trailFilePath, true);