const fs = require('fs');
const readline = require('readline');
const { execSync } = require('child_process');

async function restore1245Development() {
  const fileStream = fs.createReadStream('C:/Users/anura/.gemini/antigravity/brain/f5b27705-a392-4d9e-a834-4017b10513d9/.system_generated/logs/transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let content = '';

  for await (const line of rl) {
    const parsed = JSON.parse(line);
    const step = parsed.step_index;

    if (step === 10679 && parsed.tool_calls) {
      for (const tc of parsed.tool_calls) {
        if (tc.name === 'write_to_file' && tc.args.TargetFile && tc.args.TargetFile.includes('MahaAgridootFieldApp.tsx')) {
          content = tc.args.CodeContent;
        }
      }
    }

    if (step > 10679 && step <= 10808 && parsed.tool_calls) {
      for (const tc of parsed.tool_calls) {
        if (tc.args && tc.args.TargetFile && tc.args.TargetFile.includes('MahaAgridootFieldApp.tsx')) {
          if (tc.name === 'replace_file_content') {
            content = content.replace(tc.args.TargetContent, tc.args.ReplacementContent);
          } else if (tc.name === 'multi_replace_file_content') {
            const chunks = typeof tc.args.ReplacementChunks === 'string' ? JSON.parse(tc.args.ReplacementChunks) : tc.args.ReplacementChunks;
            for (const chunk of chunks) {
              content = content.replace(chunk.TargetContent, chunk.ReplacementContent);
            }
          }
        }
      }
    }
  }

  const appFilePath = 'e:/project-bolt-sb1-qsboyjjv/project/src/modules/agridoot/MahaAgridootFieldApp.tsx';
  fs.writeFileSync(appFilePath, content, 'utf8');
  console.log('Restored step 10807 base file to MahaAgridootFieldApp.tsx');

  const scratchDir = 'C:/Users/anura/.gemini/antigravity/brain/f5b27705-a392-4d9e-a834-4017b10513d9/scratch';
  const scripts = [
    'update_app.js',
    'update_drawer.js',
    'update_screens.js',
    'fix_jsx.js',
    'cleanup_old_screens.js',
    'fix_extra_ternary.js',
    'apply_ux_experiment.js',
    'apply_accordion_experiment.js',
    'apply_final_hybrid_layout.js',
    'apply_v2_refinement.js'
  ];

  for (const s of scripts) {
    const fullPath = scratchDir + '/' + s;
    console.log('Executing ' + s + '...');
    try {
      execSync('node "' + fullPath + '"');
      console.log('Successfully executed ' + s);
    } catch (err) {
      console.error('Error executing ' + s + ':', err.message);
    }
  }

  let currentApp = fs.readFileSync(appFilePath, 'utf8');
  if (!currentApp.includes('TrendingUp')) {
    currentApp = currentApp.replace(
      /import\s+\{([^}]+)\}\s+from\s+'lucide-react';/,
      (match, p1) => 'import { ' + p1.trim() + ', TrendingUp } from \'lucide-react\';'
    );
    console.log('Added TrendingUp to lucide-react imports');
  }

  fs.writeFileSync(appFilePath, currentApp, 'utf8');
  console.log('Successfully recreated 12:45 PM development state!');
}

restore1245Development();
