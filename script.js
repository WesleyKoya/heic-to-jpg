(function(){
  const MAX_CONCURRENT = 10;
  const QUALITY = 1; // qualidade máxima, sem perda adicional

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const chooseBtn = document.getElementById('chooseBtn');
  const grid = document.getElementById('grid');
  const emptyState = document.getElementById('emptyState');
  const zipBtn = document.getElementById('zipBtn');
  const clearBtn = document.getElementById('clearBtn');

  let frames = [];
  let counter = 0;
  let activeCount = 0;
  let pendingQueue = [];

  chooseBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); fileInput.click(); }
  });

  fileInput.addEventListener('change', (e) => {
    addFiles(e.target.files);
    fileInput.value = '';
  });

  ['dragenter','dragover'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault(); e.stopPropagation();
      dropzone.classList.add('is-dragging');
    });
  });
  ['dragleave','drop'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault(); e.stopPropagation();
      dropzone.classList.remove('is-dragging');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    if(e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  });

  function isHeic(file){
    const name = (file.name || '').toLowerCase();
    return name.endsWith('.heic') || name.endsWith('.heif') ||
           file.type === 'image/heic' || file.type === 'image/heif';
  }

  function escapeHtml(str){
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function formatBytes(bytes){
    if(!bytes && bytes !== 0) return '—';
    if(bytes < 1024) return bytes + ' B';
    if(bytes < 1024*1024) return (bytes/1024).toFixed(0) + ' KB';
    return (bytes/(1024*1024)).toFixed(1) + ' MB';
  }

  function uniqueJpgName(baseName){
    let name = baseName.replace(/\.(heic|heif)$/i, '') + '.jpg';
    const existing = new Set(frames.map(f => f.jpgName));
    let candidate = name;
    let n = 2;
    while(existing.has(candidate)){
      candidate = name.replace(/\.jpg$/, '') + '-' + n + '.jpg';
      n++;
    }
    return candidate;
  }

  function addFiles(fileList){
    const valid = Array.from(fileList).filter(isHeic);
    if(valid.length === 0 && fileList.length > 0){
      alert('Nenhum arquivo .HEIC ou .HEIF válido foi encontrado na seleção.');
      return;
    }
    valid.forEach(file => {
      const frame = {
        id: 'f' + (counter++),
        file,
        status: 'queued',
        originalSize: file.size,
        convertedBlob: null,
        convertedUrl: null,
        convertedSize: null,
        error: null,
        jpgName: uniqueJpgName(file.name)
      };
      frames.push(frame);
      pendingQueue.push(frame.id);
    });
    render();
    processQueue();
  }

  function processQueue(){
    while(activeCount < MAX_CONCURRENT && pendingQueue.length > 0){
      const id = pendingQueue.shift();
      const frame = frames.find(f => f.id === id);
      if(!frame) continue;
      activeCount++;
      frame.status = 'converting';
      convertFrame(frame);
    }
    render();
  }

  async function convertFrame(frame){
    try{
      if(typeof heic2any === 'undefined'){
        throw new Error('biblioteca não carregada — verifique sua conexão');
      }
      const result = await heic2any({ blob: frame.file, toType: 'image/jpeg', quality: QUALITY });
      const blob = Array.isArray(result) ? result[0] : result;
      frame.convertedBlob = blob;
      frame.convertedUrl = URL.createObjectURL(blob);
      frame.convertedSize = blob.size;
      frame.status = 'done';
    }catch(err){
      frame.status = 'error';
      frame.error = (err && err.message) ? err.message : 'falha na conversão';
    }finally{
      activeCount--;
      processQueue();
    }
  }

  function removeFrame(id){
    const idx = frames.findIndex(f => f.id === id);
    if(idx === -1) return;
    if(frames[idx].convertedUrl) URL.revokeObjectURL(frames[idx].convertedUrl);
    frames.splice(idx, 1);
    pendingQueue = pendingQueue.filter(pid => pid !== id);
    render();
  }

  clearBtn.addEventListener('click', () => {
    frames.forEach(f => { if(f.convertedUrl) URL.revokeObjectURL(f.convertedUrl); });
    frames = [];
    pendingQueue = [];
    render();
  });

  zipBtn.addEventListener('click', async () => {
    const done = frames.filter(f => f.status === 'done');
    if(done.length === 0) return;
    zipBtn.disabled = true;
    const originalLabel = zipBtn.textContent;
    zipBtn.textContent = 'Compactando…';
    try{
      const zip = new JSZip();
      done.forEach(f => zip.file(f.jpgName, f.convertedBlob));
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mesa-de-luz-fotos.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }catch(err){
      alert('Não foi possível gerar o .zip: ' + (err && err.message ? err.message : 'erro desconhecido'));
    }finally{
      zipBtn.textContent = originalLabel;
      updateBulkButtons();
    }
  });

  function updateBulkButtons(){
    const hasDone = frames.some(f => f.status === 'done');
    zipBtn.disabled = !hasDone;
    clearBtn.disabled = frames.length === 0;
  }

  function render(){
    emptyState.style.display = frames.length === 0 ? 'block' : 'none';
    grid.innerHTML = frames.map(frameHtml).join('');

    frames.forEach(f => {
      const rm = document.getElementById('rm-' + f.id);
      if(rm) rm.addEventListener('click', () => removeFrame(f.id));
    });

    updateBulkButtons();
  }

  function frameHtml(f){
    let thumbInner = '<div class="spinner"></div>';
    if(f.status === 'queued'){
      thumbInner = '<div class="queue-dot"></div>';
    }else if(f.status === 'done'){
      thumbInner = '<img src="' + f.convertedUrl + '" alt="' + escapeHtml(f.jpgName) + '">';
    }else if(f.status === 'error'){
      thumbInner = '<span class="err-mark">&times;</span>';
    }

    let metaLine;
    if(f.status === 'queued'){
      metaLine = '<div class="fmeta">na fila…</div>';
    }else if(f.status === 'converting'){
      metaLine = '<div class="fmeta">revelando…</div>';
    }else if(f.status === 'done'){
      metaLine = '<div class="fmeta status-done">' + formatBytes(f.originalSize) + ' → ' + formatBytes(f.convertedSize) + ' · pronto</div>';
    }else{
      metaLine = '<div class="fmeta status-error">erro: ' + escapeHtml(f.error) + '</div>';
    }

    const dlHref = f.status === 'done' ? f.convertedUrl : '#';
    const dlClass = f.status === 'done' ? 'dl-btn' : 'dl-btn disabled';
    const dlDownload = f.status === 'done' ? ' download="' + escapeHtml(f.jpgName) + '"' : '';

    return '' +
      '<div class="frame">' +
        '<div class="thumb">' + thumbInner + '</div>' +
        '<div class="fname" title="' + escapeHtml(f.file.name) + '">' + escapeHtml(f.jpgName) + '</div>' +
        metaLine +
        '<div class="frame-actions">' +
          '<a class="' + dlClass + '" href="' + dlHref + '"' + dlDownload + '>Baixar</a>' +
          '<button class="rm-btn" id="rm-' + f.id + '" type="button" aria-label="Remover">&times;</button>' +
        '</div>' +
      '</div>';
  }

  render();
})();
