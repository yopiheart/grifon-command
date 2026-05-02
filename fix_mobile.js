const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));
files.push('../App.tsx');

for (const file of files) {
  const filePath = file.startsWith('../') ? path.join(__dirname, file) : path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 2. STANDARDIZE THE BACK BUTTONS
  // We need to replace various back buttons.
  // They usually look like: <button onClick={...} className="..."> <ChevronLeft ... /> ... </button>
  // Let's use a regex to find them.
  content = content.replace(
    /<button[^>]*onClick=\{[^}]*\}[^>]*>\s*<ChevronLeft[^>]*\/>\s*(DASHBOARD|EXIT|MISSION CONTROL|EXIT STUDIO|EXIT_VIEW|\[ EXIT_FORGE \])\s*<\/button>/g,
    (match) => {
      const onClickMatch = match.match(/onClick=\{([^}]+)\}/);
      const onClick = onClickMatch ? onClickMatch[1] : 'onBack';
      return `<button onClick={${onClick}} className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">\n                <ChevronLeft className="w-4 h-4" /> COMMAND CENTER\n              </button>`;
    }
  );

  // Also handle the one in App.tsx:
  content = content.replace(
    /<button[^>]*onClick=\{[^}]*\}[^>]*>\s*&lt; DASHBOARD\s*<\/button>/g,
    (match) => {
      const onClickMatch = match.match(/onClick=\{([^}]+)\}/);
      const onClick = onClickMatch ? onClickMatch[1] : '() => setActiveModule(null)';
      return `<button onClick={${onClick}} className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">\n                <ChevronLeft className="w-4 h-4" /> COMMAND CENTER\n              </button>`;
    }
  );

  // 3. STANDARDIZE HEADLINES
  // Find <h1 className="...">...</h1> and replace the className
  content = content.replace(
    /<h1 className="([^"]+)"/g,
    (match, p1) => {
      if (p1.includes('text-6xl')) return match; // Skip the main Grifon logo in App.tsx
      return `<h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 uppercase tracking-tight truncate"`;
    }
  );

  // 4. FIX TEXT OVERFLOW (BUTTONS & INPUTS)
  // Inputs/Textareas: Update placeholders and text to be text-sm
  content = content.replace(
    /<input([^>]+)className="([^"]+)"/g,
    (match, p1, p2) => {
      if (p2.includes('hidden') || p2.includes('opacity-0')) return match;
      let newClass = p2.replace(/text-lg|text-base/g, 'text-sm');
      if (!newClass.includes('text-sm')) newClass += ' text-sm';
      return `<input${p1}className="${newClass}"`;
    }
  );
  content = content.replace(
    /<textarea([^>]+)className="([^"]+)"/g,
    (match, p1, p2) => {
      let newClass = p2.replace(/text-lg|text-base/g, 'text-sm');
      if (!newClass.includes('text-sm')) newClass += ' text-sm';
      return `<textarea${p1}className="${newClass}"`;
    }
  );

  // 5. FIX DROPDOWNS (<select>)
  // Ensure all <select> tags have: className="... appearance-none truncate pr-10 text-sm md:text-base".
  // Ensure they are wrapped in a relative container with a custom <ChevronDown ... />
  // This is tricky with regex. Let's find <select ...> ... </select>
  // If it doesn't already have ChevronDown next to it, we wrap it.
  // We'll do this carefully.
  
  fs.writeFileSync(filePath, content, 'utf8');
}
