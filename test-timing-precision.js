// Test the precision of performance.now()
console.log('Testing performance.now() precision:');

let timestamps = [];
for (let i = 0; i < 10; i++) {
  timestamps.push(performance.now());
}

console.log('Timestamps:', timestamps);

let differences = [];
for (let i = 1; i < timestamps.length; i++) {
  differences.push(timestamps[i] - timestamps[i-1]);
}

console.log('Time differences:', differences);
console.log('Minimum difference:', Math.min(...differences));
console.log('Maximum difference:', Math.max(...differences));

// Test with a small delay
setTimeout(() => {
  const start = performance.now();
  setTimeout(() => {
    const end = performance.now();
    console.log('1ms setTimeout actual difference:', end - start);
  }, 1);
}, 100);