// Simple vanilla JS entrypoint for testing
const app = document.getElementById('app');
if (app) {
  app.innerHTML = `
    <div class="container">
      <h1>JS Entrypoint Test</h1>
      <p>This is bundled from a plain JS file!</p>
      <button id="testBtn">Click me</button>
    </div>
  `;
  
  const btn = document.getElementById('testBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      alert('Button clicked from bundled JS!');
    });
  }
}


