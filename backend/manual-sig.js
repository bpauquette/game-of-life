import crypto from 'crypto';

const cells = [
  {x:4,y:0},{x:5,y:0},{x:12,y:0},{x:13,y:0},
  {x:3,y:1},{x:5,y:1},{x:12,y:1},{x:14,y:1},
  {x:3,y:2},{x:12,y:2},
  {x:2,y:3},{x:3,y:3},{x:12,y:3},{x:13,y:3},
  {x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:12,y:4},{x:13,y:4},{x:14,y:4},
  {x:3,y:5},{x:4,y:5},{x:5,y:5},{x:12,y:5},{x:13,y:5},{x:14,y:5},
  {x:3,y:6},{x:4,y:6},{x:5,y:6},{x:12,y:6},{x:13,y:6},{x:14,y:6},
  {x:2,y:7},{x:3,y:7},{x:4,y:7},{x:5,y:7},{x:12,y:7},{x:13,y:7},{x:14,y:7},
  {x:2,y:8},{x:3,y:8},{x:12,y:8},{x:13,y:8},
  {x:3,y:9},{x:12,y:9},
  {x:3,y:10},{x:5,y:10},{x:12,y:10},{x:14,y:10},
  {x:4,y:11},{x:5,y:11},{x:12,y:11},{x:13,y:11}
];

// no sort

const cellString = cells.map(c => `${c.x},${c.y}`).join(';');

console.log('Cell string no sort:', cellString.slice(0,100) + '...');

const hash = crypto.createHash('sha256').update(cellString).digest('hex');
console.log('Hash:', hash);