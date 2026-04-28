import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

// We will parse the frontmatter to get description, name, etc.
// But we can actually just embed the SKILL.md content entirely and let 
// the runtime `parseFrontmatter` / `createSkillCommand` handle it!
// Or we can just dynamically write `bundledSkills.ts` replacements.
// Let's generate a TS file that simply calls `registerBundledSkill` 
// but we need to do the replacement of "Claude", "Superpowers", etc.

const dirsToScan = [
  'huashu-skills-master',
  'Skill_Seekers-main',
  'claude-skills-main',
  'superpowers-main'
].map(d => join(__dirname, d));

const allSkills: {
  repoName: string;
  skillName: string;
  skillDir: string;
  skillContent: string;
  files: Record<string, string>;
}[] = [];

function rebrand(text: string): string {
  let modified = text;
  modified = modified.replace(/Claude Code/gi, 'Neuron');
  modified = modified.replace(/Claude/gi, 'Neuron');
  modified = modified.replace(/Superpowers/gi, 'Neuron Skills');
  modified = modified.replace(/Anthropic/gi, 'Gitlawb'); // Optional, to keep it branded
  return modified;
}

function processDirectory(baseDir: string, dir: string, repoName: string) {
  try {
    const stat = statSync(dir);
    if (!stat.isDirectory()) return;
  } catch (e) {
    return; // Ignore missing/invalid dirs
  }

  const entries = readdirSync(dir);
  
  if (entries.includes('SKILL.md') || entries.includes('CLAUDE.md')) {
    const mainFile = entries.includes('SKILL.md') ? 'SKILL.md' : 'CLAUDE.md';
    const content = readFileSync(join(dir, mainFile), 'utf-8');
    const skillName = dir.split('/').pop()!;
    
    // Skip if we already have it to avoid conflicts
    if (allSkills.some(s => s.skillName === skillName)) {
      return;
    }

    const files: Record<string, string> = {};
    
    function walk(currentDir: string) {
      const filesExt = readdirSync(currentDir);
      for (const f of filesExt) {
        if (f.startsWith('.')) continue; // skip hidden
        const full = join(currentDir, f);
        if (statSync(full).isDirectory()) {
          walk(full);
        } else {
          if (f !== mainFile && (f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.js') || f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.sh') || f.endsWith('.ts'))) {
            const rel = relative(dir, full);
            const rebrandedContent = rebrand(readFileSync(full, 'utf-8'));
            files[rel] = rebrandedContent;
          }
        }
      }
    }
    walk(dir);

    allSkills.push({
      repoName,
      skillName,
      skillDir: dir,
      skillContent: rebrand(content),
      files
    });
  } else {
    // recursively check
    for (const e of entries) {
      if (e.startsWith('.')) continue; // skip hidden (.github, .git)
       // skip some massive directories if any
      if (e === 'node_modules') continue;
      processDirectory(baseDir, join(dir, e), repoName);
    }
  }
}

for (const dir of dirsToScan) {
  const repoName = dir.split('/').pop()!;
  processDirectory(dir, dir, repoName);
}

// Generate the TypeScript file
let out = `
import { registerBundledSkill } from '../../bundledSkills.js';
import { parseFrontmatter } from '../../../utils/frontmatterParser.js';
import { parseSkillFrontmatterFields, createSkillCommand } from '../../loadSkillsDir.js';

export function registerExternalSkills() {
`;

for (const skill of allSkills) {
  const contentSafe = JSON.stringify(skill.skillContent);
  const filesSafe = JSON.stringify(skill.files);
  out += `
  {
    const skillName = ${JSON.stringify(skill.skillName)};
    const markdownContent = ${contentSafe};
    const files = ${filesSafe};
    
    try {
      const { frontmatter, content: parsedContent } = parseFrontmatter(markdownContent, skillName);
      const parsed = parseSkillFrontmatterFields(frontmatter, parsedContent, skillName);
      
      const cmd = createSkillCommand({
        ...parsed,
        skillName,
        markdownContent: parsedContent,
        source: 'bundled',
        baseDir: undefined, // Bundled skills extract dir handled by registerBundledSkill
        loadedFrom: 'bundled',
        paths: undefined,
      });

      registerBundledSkill({
        name: skillName,
        description: cmd.description,
        aliases: cmd.aliases,
        whenToUse: cmd.whenToUse,
        argumentHint: cmd.argumentHint,
        allowedTools: cmd.allowedTools,
        model: cmd.model,
        disableModelInvocation: cmd.disableModelInvocation,
        userInvocable: true,
        isEnabled: cmd.isEnabled,
        hooks: cmd.hooks,
        context: cmd.context,
        agent: cmd.agent,
        files: files,
        getPromptForCommand: cmd.getPromptForCommand
      });
    } catch (e) {
      console.warn("Failed to register external bundled skill:", skillName, e);
    }
  }
`;
}

out += `
}
`;

writeFileSync(join(__dirname, '../src/skills/bundled/external/index.ts'), out);
console.log('Successfully generated external skills index! Count:', allSkills.length);
