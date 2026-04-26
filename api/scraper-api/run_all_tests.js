const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const providers = [
  '4khdhub', 'animepahe', 'animesalt', 'castel', 'desiremovies', 'hdhub4u', 
  'kmmovies', 'movies4u', 'netmirror', 'themovie', 'uhdmovies', 'vega', 
  'zeefliz', 'zinkmovies', 'mod', 'ph', 'adult', 'hentai'
];

providers.forEach(p => {
  const file = path.join(__dirname, 'app', 'api', p, 'test_extraction.js');
  if (fs.existsSync(file)) {
    console.log(`\n============== RUNNING TEST FOR ${p} ==============`);
    try {
      const output = execSync(`node "${file}"`, { encoding: 'utf8' });
      console.log(output.trim());
    } catch (e) {
      console.log(`Error running ${p}:`, e.message);
    }
  }
});
