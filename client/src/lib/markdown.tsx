export function renderMarkdown(markdown: string | null | undefined): React.ReactNode {
  // Return an empty div if markdown is null or undefined
  if (!markdown) {
    return <div></div>;
  }
  
  // Use a simple regex-based renderer for now
  // In a production app, you would use a proper markdown library like marked or react-markdown
  
  // Handle paragraphs
  let html = markdown
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />');
  
  // Handle code blocks
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Handle bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Handle italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Handle links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline">$1</a>');
  
  // Handle headers
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-5 mb-2">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-6 mb-3">$1</h1>');
  
  // Wrap in paragraphs if not already
  if (!html.startsWith('<h') && !html.startsWith('<p>')) {
    html = `<p>${html}</p>`;
  }
  
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
