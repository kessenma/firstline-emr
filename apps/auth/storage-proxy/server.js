const http = require('http');
const https = require('https');
const zlib = require('zlib');

const RUSTFS_HOST = process.env.RUSTFS_HOST || 'rustfs-server';
const RUSTFS_PORT = process.env.RUSTFS_PORT || 9001;
const PROXY_PORT = process.env.PROXY_PORT || 3001;
const ACCESS_KEY = process.env.RUSTFS_ACCESS_KEY || 'admin';
const SECRET_KEY = process.env.RUSTFS_SECRET_KEY || 'YourSecurePassword123!';

// Auto-login script that will be injected into the login page
const AUTO_LOGIN_SCRIPT = `
<script>
(function() {
  const ACCESS_KEY = '${ACCESS_KEY}';
  const SECRET_KEY = '${SECRET_KEY}';
  let loginAttempted = false;
  let retryCount = 0;
  const maxRetries = 20;

  console.log('[Auto-Login] Script loaded, credentials ready');

  function setInputValue(input, value) {
    if (!input) return false;

    // Method 1: Native value setter (works with most frameworks)
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(input, value);

    // Method 2: Direct assignment
    input.value = value;

    // Trigger multiple events to ensure reactivity
    input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

    // For Vue 3, also try triggering on the compositionend
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: value }));

    return true;
  }

  function findInputs() {
    // Get all inputs on the page
    const allInputs = Array.from(document.querySelectorAll('input'));
    console.log('[Auto-Login] Found ' + allInputs.length + ' inputs');

    let accessKeyInput = null;
    let secretKeyInput = null;

    // Strategy 1: Find by type
    const textInputs = allInputs.filter(i => i.type === 'text' || !i.type);
    const passwordInputs = allInputs.filter(i => i.type === 'password');

    if (textInputs.length >= 1 && passwordInputs.length >= 1) {
      accessKeyInput = textInputs[0];
      secretKeyInput = passwordInputs[0];
    }

    // Strategy 2: Find by placeholder or name
    if (!accessKeyInput || !secretKeyInput) {
      for (const input of allInputs) {
        const placeholder = (input.placeholder || '').toLowerCase();
        const name = (input.name || '').toLowerCase();
        const id = (input.id || '').toLowerCase();

        if (placeholder.includes('access') || name.includes('access') || id.includes('access') ||
            placeholder.includes('username') || name.includes('username') || id.includes('username')) {
          accessKeyInput = input;
        }
        if (placeholder.includes('secret') || name.includes('secret') || id.includes('secret') ||
            placeholder.includes('password') || name.includes('password') || id.includes('password')) {
          secretKeyInput = input;
        }
      }
    }

    return { accessKeyInput, secretKeyInput };
  }

  function attemptAutoLogin() {
    if (loginAttempted) return;
    retryCount++;

    if (retryCount > maxRetries) {
      console.log('[Auto-Login] Max retries reached, giving up');
      return;
    }

    // Check if we're on the login page
    if (!window.location.pathname.includes('/auth/login')) {
      console.log('[Auto-Login] Not on login page, skipping');
      return;
    }

    const { accessKeyInput, secretKeyInput } = findInputs();
    const submitBtn = document.querySelector('button[type="submit"], form button, button:not([type="button"])');

    console.log('[Auto-Login] Attempt ' + retryCount + ': accessKey=' + !!accessKeyInput + ', secretKey=' + !!secretKeyInput + ', submit=' + !!submitBtn);

    if (accessKeyInput && secretKeyInput) {
      console.log('[Auto-Login] Found inputs, filling credentials...');

      // Fill the form
      setInputValue(accessKeyInput, ACCESS_KEY);
      setInputValue(secretKeyInput, SECRET_KEY);

      // Mark as attempted to prevent loops
      loginAttempted = true;

      console.log('[Auto-Login] Form filled, attempting auto-submit...');

      // Auto-submit after a delay to ensure Vue has processed the inputs
      setTimeout(() => {
        const submitBtn = document.querySelector('button[type="submit"], form button, button:not([type="button"])');
        if (submitBtn) {
          console.log('[Auto-Login] Clicking submit button');
          submitBtn.click();
        } else {
          const form = document.querySelector('form');
          if (form) {
            console.log('[Auto-Login] Submitting form directly');
            form.submit();
          }
        }
      }, 500);
    } else {
      // Retry after DOM updates (Vue might still be rendering)
      setTimeout(attemptAutoLogin, 300);
    }
  }

  // Start auto-login when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(attemptAutoLogin, 1500));
  } else {
    setTimeout(attemptAutoLogin, 1500);
  }

  // Also observe DOM changes in case Vue renders later
  const observer = new MutationObserver(() => {
    if (!loginAttempted && window.location.pathname.includes('/auth/login')) {
      attemptAutoLogin();
    }
  });
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
})();
</script>
`;

function proxyRequest(clientReq, clientRes) {
  // Health check endpoint - responds directly without proxying
  if (clientReq.url === '/health') {
    clientRes.writeHead(200, { 'Content-Type': 'text/plain' });
    clientRes.end('OK');
    return;
  }

  const options = {
    hostname: RUSTFS_HOST,
    port: RUSTFS_PORT,
    path: clientReq.url,
    method: clientReq.method,
    headers: { ...clientReq.headers }
  };

  // Remove Accept-Encoding so RustFS sends uncompressed responses.
  // This proxy needs to read/modify HTML bodies (for auto-login injection),
  // and Caddy handles compression on the way out to the browser.
  delete options.headers['accept-encoding'];
  delete options.headers['Accept-Encoding'];

  // Keep original host header for signature validation
  // RustFS validates S3 signatures using the Host header from the original request

  const proxyReq = http.request(options, (proxyRes) => {
    const contentType = proxyRes.headers['content-type'] || '';
    const contentEncoding = proxyRes.headers['content-encoding'] || '';
    const isHtml = contentType.includes('text/html');
    const isLoginPage = clientReq.url.includes('/auth/login') || clientReq.url === '/rustfs/console/' || clientReq.url === '/rustfs/console';

    // If it's the login page HTML, inject our auto-login script
    if (isHtml && isLoginPage) {
      const chunks = [];

      proxyRes.on('data', (chunk) => {
        chunks.push(chunk);
      });

      proxyRes.on('end', () => {
        let buffer = Buffer.concat(chunks);

        // Decompress if needed
        const decompress = () => {
          return new Promise((resolve, reject) => {
            if (contentEncoding === 'gzip') {
              zlib.gunzip(buffer, (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded.toString());
              });
            } else if (contentEncoding === 'deflate') {
              zlib.inflate(buffer, (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded.toString());
              });
            } else if (contentEncoding === 'br') {
              zlib.brotliDecompress(buffer, (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded.toString());
              });
            } else {
              resolve(buffer.toString());
            }
          });
        };

        decompress()
          .then((body) => {
            // Inject our script before closing body tag
            const modifiedBody = body.replace('</body>', AUTO_LOGIN_SCRIPT + '</body>');

            // Send uncompressed response
            const headers = { ...proxyRes.headers };
            delete headers['content-length'];
            delete headers['content-encoding'];
            delete headers['transfer-encoding'];

            clientRes.writeHead(proxyRes.statusCode, headers);
            clientRes.end(modifiedBody);
          })
          .catch((err) => {
            console.error('Decompression error:', err.message);
            // Fall back to passing through original response
            clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
            clientRes.end(buffer);
          });
      });
    } else {
      // Pass through response as-is
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(clientRes);
    }
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
    clientRes.end('Bad Gateway: Unable to connect to RustFS');
  });

  // Forward request body if present
  clientReq.pipe(proxyReq);
}

const server = http.createServer(proxyRequest);

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`Storage Auth Proxy running on port ${PROXY_PORT}`);
  console.log(`Proxying to RustFS at ${RUSTFS_HOST}:${RUSTFS_PORT}`);
  console.log(`Auto-login enabled with access key: ${ACCESS_KEY}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
});
