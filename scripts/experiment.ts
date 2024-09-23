import path from 'path';
import { GW2Trail } from '../src/trails';

// // Path to the file (relative or absolute)
const trailFilePath = path.join(__dirname, 'tw_mc_trails_shiverpeaks_wayfarerfoothills_toggletrail.trl');

// Call the async function to load file and invoke the imported method

async function main() {
    let gwTrail = new GW2Trail();
    await gwTrail.loadTrail(trailFilePath);
    let positions = await gwTrail.getPositions();
    console.log(positions);
}

main();