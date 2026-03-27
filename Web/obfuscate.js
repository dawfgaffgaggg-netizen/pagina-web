export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { content, engine } = req.body;
  if (!content) return res.status(400).json({ success: false, error: 'No content provided' });

  try {
    let obfuscated;
    switch (engine) {
      case 'minify':  obfuscated = obfMinify(content); break;
      case 'weak':    obfuscated = obfWeak(content); break;
      case 'strong':  obfuscated = obfStrong(content); break;
      default:        obfuscated = obfMedium(content);
    }
    return res.status(200).json({ success: true, obfuscated, engine });
  } catch (err) {
    console.error(err.message);
    return res.status(200).json({ success: true, obfuscated: content, engine: 'fallback' });
  }
}

function obfMinify(code) {
  return code
    .replace(/--\[\[[\s\S]*?\]\]/g, '')
    .replace(/--[^\n]*/g, '')
    .replace(/\n\s*\n/g, '\n')
    .replace(/  +/g, ' ')
    .trim();
}

function obfWeak(code) {
  const minified = obfMinify(code);
  const encoded = minified.replace(/"([^"\\]*)"/g, (_, s) => {
    if (!s) return '""';
    const chars = Array.from(s).map(c => c.charCodeAt(0)).join(',');
    return `string.char(${chars})`;
  });
  return `-- OceanHub Weak Protection\n${encoded}`;
}

function obfMedium(code) {
  const weak = obfWeak(code);
  const junk = genJunk(6);
  const varName = randVar();
  const varF = randVar();
  return `-- OceanHub Medium Protection
${junk}
local ${varF} = loadstring(${weak})
if ${varF} then pcall(${varF}) end`;
}

// STRONG: base64-style encoding compatible with all Roblox executors
function obfStrong(code) {
  const minified = obfMinify(code);
  const bytes = Array.from(minified).map(c => c.charCodeAt(0));
  
  const varA = randVar(), varB = randVar(), varC = randVar();
  const varD = randVar(), varE = randVar();
  const junk1 = genJunk(4);
  const junk2 = genJunk(4);

  // Split into chunks of char codes
  const chunks = [];
  for (let i = 0; i < bytes.length; i += 50) {
    chunks.push(bytes.slice(i, i + 50).join(','));
  }

  const tables = chunks.map((chunk, i) => {
    const v = randVar();
    return `local ${v}={${chunk}}`;
  });
  const tableVars = tables.map((_, i) => {
    const v = randVar();
    return v;
  });

  // Simpler approach: just encode as string.char calls
  const charCalls = [];
  for (let i = 0; i < bytes.length; i += 50) {
    charCalls.push(`string.char(${bytes.slice(i, i + 50).join(',')})`);
  }

  return `-- OceanHub Strong Protection
${junk1}
local ${varA} = ${charCalls.join('..')}
${junk2}
local ${varB} = loadstring(${varA})
if ${varB} then
  local ${varC},${varD} = pcall(${varB})
  if not ${varC} then
    local ${varE} = ${varD}
  end
end`;
}

function randVar() {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const len = Math.floor(Math.random() * 4) + 4;
  return '_' + Array.from({length: len}, () => letters[Math.floor(Math.random() * letters.length)]).join('');
}

function genJunk(lines) {
  const ops = [
    () => `local ${randVar()} = ${Math.floor(Math.random()*9999)} + ${Math.floor(Math.random()*9999)}`,
    () => `local ${randVar()} = string.len(string.char(${Math.floor(Math.random()*90)+32}))`,
    () => `local ${randVar()} = math.floor(${(Math.random()*100).toFixed(4)})`,
    () => `local ${randVar()} = tostring(${Math.floor(Math.random()*999)})`,
  ];
  return Array.from({length: lines}, () => ops[Math.floor(Math.random()*ops.length)]()).join('\n');
}
