/*
 * end-portal.js — Minecraft-style End Portal background (WebGL, no dependencies)
 *
 * Re-implements the vanilla effect: one starfield texture is sampled 16 times,
 * each layer with its own scale / rotation / drift / tint, then summed.
 *
 * Usage:
 *   <script src="end-portal.js"></script>
 *   <script>EndPortal.mount();</script>                       // fullscreen, behind everything
 *   <script>EndPortal.mount({ target: '#hero' });</script>    // inside one element
 *   <script>EndPortal.mount({ texture: 'end_portal.png' });</script> // use your own texture
 *
 * Options: target, texture, brightness (default 2.6), speed (default 3), pixelRatio (default 1),
 *          zoom (1; >1 = larger, fewer features), skipLayers (0; drop N finest layers),
 *          contrast (1; >1 suppresses faint haze), debug
 */
(function (global) {
  'use strict';

  var VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform float uBright;',
    'uniform float uSpeed;',
    'uniform float uZoom;',
    'uniform float uSkip;',
    'uniform float uContrast;',
    'uniform sampler2D uTex;',
    '',
    'const float TAU = 6.28318530718;',
    '',
    'vec3 layerTint(float i) {',
    '  // dim teal / green / blue-ish tints, cycled per layer',
    '  vec3 a = vec3(0.022, 0.098, 0.111);',
    '  vec3 b = vec3(0.012, 0.096, 0.028);',
    '  vec3 c = vec3(0.028, 0.102, 0.100);',
    '  vec3 d = vec3(0.018, 0.070, 0.140);',
    '  float h = fract(i * 0.61803) * 4.0;',
    '  vec3 col = mix(a, b, clamp(h, 0.0, 1.0));',
    '  col = mix(col, c, clamp(h - 1.0, 0.0, 1.0));',
    '  col = mix(col, d, clamp(h - 2.0, 0.0, 1.0));',
    '  col = mix(col, a, clamp(h - 3.0, 0.0, 1.0));',
    '  return col;',
    '}',
    '',
    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / (uRes.y * uZoom); // height-normalised; zoom > 1 = bigger, fewer features',
    '  float gameTime = uTime * uSpeed / 1200.0;',
    '  vec3 col = vec3(0.004, 0.020, 0.024);         // base void tint',
    '',
    '  for (int n = 0; n < 16; n++) {',
    '    if (float(n) < uSkip) continue;             // skip the finest (noisiest) layers',
    '    float l = float(n + 1);',
    '    vec2 q = uv * 0.5 + 0.25;',
    '    q += vec2(17.0 / l, (2.0 + l / 1.5) * (gameTime * 1.5));',
    '    float ang = radians((l * l * 4321.0 + l * 9.0) * 2.0);',
    '    float s = (4.5 - l / 4.0) * 2.0;',
    '    mat2 rot = mat2(cos(ang), sin(ang), -sin(ang), cos(ang));',
    '    vec2 p = (rot * q) * s;',
    '    col += texture2D(uTex, fract(p)).rgb * layerTint(l);',
    '  }',
    '',
    '  col = pow(clamp(col * uBright, 0.0, 1.0), vec3(uContrast)); // contrast > 1 kills faint haze, keeps bright dots',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  // Procedural stand-in texture: sparse bright pixels on black, 256x256.
  function makeStarTexture() {
    var S = 256, c = document.createElement('canvas');
    c.width = c.height = S;
    var ctx = c.getContext('2d');
    var img = ctx.createImageData(S, S);
    var seed = 20111118;
    function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    var palette = [[190, 255, 245], [90, 230, 210], [60, 200, 255], [120, 255, 170], [255, 255, 255]];
    function put(x, y, k) {
      x = (x + S) % S; y = (y + S) % S;
      var i = (y * S + x) * 4, col = palette[(rnd() * palette.length) | 0];
      img.data[i] = col[0] * k; img.data[i + 1] = col[1] * k; img.data[i + 2] = col[2] * k; img.data[i + 3] = 255;
    }
    var n, x, y, k;
    for (n = 0; n < 220; n++) { put((rnd() * S) | 0, (rnd() * S) | 0, 0.35 + rnd() * 0.65); }
    for (n = 0; n < 45; n++) {
      x = (rnd() * S) | 0; y = (rnd() * S) | 0; k = 0.6 + rnd() * 0.4;
      put(x, y, k); put(x + 1, y, k * 0.8); put(x, y + 1, k * 0.8); put(x + 1, y + 1, k * 0.6);
    }
    for (var i = 3; i < img.data.length; i += 4) img.data[i] = 255;
    ctx.putImageData(img, 0, 0);
    return c;
  }

  function mount(opts) {
    opts = opts || {};
    var target = typeof opts.target === 'string' ? document.querySelector(opts.target) : opts.target;
    var fullscreen = !target;
    var host = target || document.body;

    var canvas = document.createElement('canvas');
    canvas.className = 'end-portal-canvas';
    canvas.style.cssText = 'position:' + (fullscreen ? 'fixed' : 'absolute') +
      ';inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;image-rendering:pixelated;';
    if (!fullscreen && getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.insertBefore(canvas, host.firstChild);

    var gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) {
      console.warn('[EndPortal] v3: WebGL context unavailable (disabled, blocklisted GPU, or hardware acceleration off). Removing canvas so the CSS fallback shows.');
      canvas.remove(); return null;
    }
    console.info('[EndPortal] v3: mounted ' + (fullscreen ? 'fullscreen' : 'on element') +
      ', canvas ' + canvas.clientWidth + 'x' + canvas.clientHeight + (opts.texture ? ', texture requested: ' + opts.texture : ', built-in stars'));

    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); }
      return s;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    function upload(src) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      // Vanilla's portal shader reads raw RGB and ignores alpha, so never let the
      // browser premultiply, flip or colour-convert the data on upload.
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    }
    upload(makeStarTexture());

    if (opts.texture) { // optional: your own end_portal.png
      var im = new Image();
      var url = new URL(opts.texture, document.baseURI);
      // Only request CORS for genuinely cross-origin http(s) URLs. Forcing it on
      // same-origin / file:// / data: URLs makes the load fail outright.
      if (/^https?:$/.test(url.protocol) && url.origin !== location.origin) im.crossOrigin = 'anonymous';
      im.onerror = function () {
        console.warn('[EndPortal] could not load texture "' + url.href + '" (404, wrong path, or blocked). Using built-in stars.');
      };
      im.onload = function () {
        function done(how) {
          console.info('[EndPortal] v4: custom texture applied via ' + how + ' (' + im.naturalWidth + 'x' + im.naturalHeight + ')');
          if (reduce) frame(performance.now());
        }
        function fail(e) {
          console.warn('[EndPortal] texture loaded but WebGL refused it (' + e.name + '). ' +
            (location.protocol === 'file:'
              ? 'You are on file:// — browsers treat every file as cross-origin, so the canvas is tainted. Serve the page over http, e.g. `python3 -m http.server`.'
              : 'The image is cross-origin without CORS headers; host it on the same origin or send Access-Control-Allow-Origin.'));
        }
        function viaCanvas() { // fallback; also used to resize non-256px images
          try {
            var c = document.createElement('canvas'); c.width = c.height = 256; // power of two for REPEAT
            var cx = c.getContext('2d'); cx.imageSmoothingEnabled = false;
            cx.drawImage(im, 0, 0, 256, 256);
            upload(c); done('canvas (alpha may be premultiplied)');
          } catch (e) { fail(e); }
        }
        try {
          if (opts.debug) { // what does the browser actually see in this PNG?
            var d = document.createElement('canvas'); d.width = im.naturalWidth; d.height = im.naturalHeight;
            var dx = d.getContext('2d'); dx.drawImage(im, 0, 0);
            var px = dx.getImageData(0, 0, d.width, d.height).data, aMin = 255, aMax = 0, aLow = 0, lit = 0, mx = 0;
            for (var i = 0; i < px.length; i += 4) {
              if (px[i + 3] < aMin) aMin = px[i + 3];
              if (px[i + 3] > aMax) aMax = px[i + 3];
              if (px[i + 3] < 255) aLow++;
              var m = Math.max(px[i], px[i + 1], px[i + 2]);
              if (m > mx) mx = m;
              if (m > 32) lit++;
            }
            console.info('[EndPortal] debug: ' + d.width + 'x' + d.height + ', alpha ' + aMin + '..' + aMax +
              ', pixels with alpha<255: ' + aLow + ', pixels with rgb>32 (after premultiply): ' + lit + ', max channel: ' + mx);
          }
          if (im.naturalWidth === 256 && im.naturalHeight === 256 && global.createImageBitmap) {
            // Raw upload: no premultiplied alpha, no colour-profile conversion.
            global.createImageBitmap(im, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })
              .then(function (bm) { upload(bm); done('ImageBitmap (raw RGB)'); })
              .catch(function (e) { console.warn('[EndPortal] ImageBitmap path failed (' + e.name + '), using canvas path'); viaCanvas(); });
          } else { viaCanvas(); }
        } catch (e) { fail(e); }
      };
      im.src = url.href;
    }

    var uRes = gl.getUniformLocation(prog, 'uRes');
    var uTime = gl.getUniformLocation(prog, 'uTime');
    var uBright = gl.getUniformLocation(prog, 'uBright');
    var uSpeed = gl.getUniformLocation(prog, 'uSpeed');
    gl.uniform1i(gl.getUniformLocation(prog, 'uTex'), 0);
    gl.uniform1f(uBright, opts.brightness != null ? opts.brightness : 2.6);
    gl.uniform1f(uSpeed, opts.speed != null ? opts.speed : 1.0);
    gl.uniform1f(gl.getUniformLocation(prog, 'uZoom'), opts.zoom != null ? opts.zoom : 1.0);
    gl.uniform1f(gl.getUniformLocation(prog, 'uSkip'), opts.skipLayers != null ? opts.skipLayers : 0.0);
    gl.uniform1f(gl.getUniformLocation(prog, 'uContrast'), opts.contrast != null ? opts.contrast : 1.0);

    var ratio = opts.pixelRatio != null ? opts.pixelRatio : 1;
    function resize() {
      var w = Math.max(1, Math.floor(canvas.clientWidth * ratio));
      var h = Math.max(1, Math.floor(canvas.clientHeight * ratio));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    }

    var reduce = global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var raf = 0, t0 = performance.now(), running = true;
    function frame(now) {
      resize();
      gl.uniform1f(uTime, (now - t0) / 1000 + 30.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (running && !reduce) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running && !reduce) raf = requestAnimationFrame(frame); else cancelAnimationFrame(raf);
    });
    global.addEventListener('resize', function () { if (reduce) frame(performance.now()); });

    return { canvas: canvas, destroy: function () { running = false; cancelAnimationFrame(raf); canvas.remove(); } };
  }

  global.EndPortal = { mount: mount };
})(window);