document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form').forEach(form => {
    // Capture submission before any navigation; no data leaves the browser.
    form.addEventListener('submit', event => {
      event.preventDefault();
      let status = form.querySelector('.demo-status');
      if (!status) { status = document.createElement('p'); status.className = 'demo-status'; status.setAttribute('role', 'status'); form.append(status); }
      status.textContent = 'Demo only: your message has not been sent or saved.';
    });
  });
});
