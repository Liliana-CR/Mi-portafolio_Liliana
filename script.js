// ========== CONFIGURACIÓN DE SUPABASE ==========
const SUPABASE_URL = 'https://coxfocyzsoiokhqedftr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_abVcVRLBYZujewoB3xsezQ_3ZugrMF1';

// ========== APLICACIÓN PRINCIPAL ==========
class PortafolioApp {
    constructor() {
        this.currentPage = 'inicio';
        this.isLoggedIn = false;
        this.semanas = {};
        this.supabase = null;
        this.pdfDoc = null;
        this.currentPageNum = 1;
        this.totalPages = 1;
        this.currentZoom = 1.5;
        this.currentPdfUrl = null;
        this.unidadesAbiertas = {};
        
        this.unidades = [
            { id: 1, nombre: 'Unidad I', tema: 'Introducción a la arquitectura de B.D' },
            { id: 2, nombre: 'Unidad II', tema: 'SQL Avanzado' },
            { id: 3, nombre: 'Unidad III', tema: 'Transacciones y Concurrencia' },
            { id: 4, nombre: 'Unidad IV', tema: 'NoSQL y Tendencias' }
        ];
        
        this.init();
    }

    async init() {
        this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase inicializado');
        
        await this.cargarSemanas();
        this.setupNavigation();
        this.setupLogin();
        this.setupAdminPanel();
        this.setupFileUpload();
        this.renderUnidades();
        this.updateProgress();
        this.checkAuthState();
        
        this.setupSobreMiButtons();
        this.setupFloatingAssistant();
        this.setupMusicOnSobremi();
        this.setupPdfViewerButtons();
        
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        }
    }

    setupPdfViewerButtons() {
        setTimeout(() => {
            console.log('🔄 Conectando botones del visor PDF...');
            
            const zoomInBtn = document.getElementById('zoomInBtn');
            const zoomOutBtn = document.getElementById('zoomOutBtn');
            const cerrarBtn = document.getElementById('cerrarVisorBtn');
            const prevBtn = document.getElementById('prevPageBtn');
            const nextBtn = document.getElementById('nextPageBtn');
            
            if (zoomInBtn) {
                zoomInBtn.onclick = () => {
                    console.log('🔍 Zoom In');
                    this.zoomIn();
                };
            }
            
            if (zoomOutBtn) {
                zoomOutBtn.onclick = () => {
                    console.log('🔍 Zoom Out');
                    this.zoomOut();
                };
            }
            
            if (cerrarBtn) {
                cerrarBtn.onclick = () => {
                    console.log('❌ Cerrar visor');
                    this.cerrarVisorPDF();
                };
            }
            
            if (prevBtn) {
                prevBtn.onclick = () => {
                    console.log('⬅️ Página anterior');
                    this.prevPage();
                };
            }
            
            if (nextBtn) {
                nextBtn.onclick = () => {
                    console.log('➡️ Página siguiente');
                    this.nextPage();
                };
            }
            
            console.log('✅ Botones del visor PDF conectados');
        }, 500);
    }

    async cargarSemanas() {
        try {
            const { data, error } = await this.supabase
                .from('semanas')
                .select('*');
            
            if (error) throw error;
            
            this.semanas = {};
            if (data) {
                data.forEach(item => {
                    this.semanas[item.id] = item;
                });
            }
            console.log('✅ Datos cargados:', Object.keys(this.semanas).length);
        } catch (error) {
            console.error('Error:', error);
            this.semanas = {};
        }
    }

    setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo(link.dataset.page);
            });
        });
    }

    navigateTo(page) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) link.classList.add('active');
        });

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

        if (page === 'inicio') {
            document.getElementById('inicio-page').classList.add('active');
            this.updateProgress();
        } else if (page === 'trabajos') {
            document.getElementById('trabajos-page').classList.add('active');
            this.renderUnidades();
        } else if (page === 'login') {
            if (this.isLoggedIn) {
                document.getElementById('admin-page').classList.add('active');
                this.renderSemanasList();
            } else {
                document.getElementById('login-page').classList.add('active');
            }
        }
        this.currentPage = page;
    }

    setupFileUpload() {
        const archivosInput = document.getElementById('archivosInput');
        const filesPreview = document.getElementById('filesPreview');
        
        if (archivosInput) {
            archivosInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    let totalSize = 0;
                    const fileList = files.map(f => {
                        const size = (f.size / 1024).toFixed(0);
                        totalSize += f.size;
                        return `<i class="fas fa-file"></i> ${f.name} (${size} KB)`;
                    }).join('<br>');
                    const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
                    filesPreview.innerHTML = `<div><strong>${files.length} archivo(s):</strong><br>${fileList}<br><small>Total: ${totalMB} MB</small></div>`;
                }
            });
        }
    }

    setupLogin() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;

                if (username === 'admin' && password === 'admin123') {
                    this.isLoggedIn = true;
                    localStorage.setItem('isLoggedIn', 'true');
                    this.navigateTo('login');
                    this.renderSemanasList();
                    this.showNotification('¡Bienvenida! ✨', 'success');
                } else {
                    this.showNotification('Credenciales incorrectas', 'error');
                }
            });
        }

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.isLoggedIn = false;
            localStorage.removeItem('isLoggedIn');
            this.navigateTo('inicio');
            this.showNotification('Sesión cerrada', 'info');
        });
    }

    setupAdminPanel() {
        const unidadSelect = document.getElementById('unidadSelect');
        const semanaSelect = document.getElementById('semanaSelect');

        unidadSelect?.addEventListener('change', () => {
            const unidad = unidadSelect.value;
            semanaSelect.innerHTML = '<option value="">Seleccionar semana</option>';
            if (unidad) {
                const inicio = (unidad - 1) * 4 + 1;
                for (let i = 0; i < 4; i++) {
                    const semanaNum = inicio + i;
                    const option = document.createElement('option');
                    option.value = semanaNum;
                    option.textContent = `Semana ${semanaNum}`;
                    semanaSelect.appendChild(option);
                }
            }
        });

        document.getElementById('uploadForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarSemana();
        });
    }

    async guardarSemana() {
        const unidad = document.getElementById('unidadSelect').value;
        const semana = document.getElementById('semanaSelect').value;
        const titulo = document.getElementById('tituloSemana').value;
        const descripcion = document.getElementById('descripcionSemana').value;
        const archivos = Array.from(document.getElementById('archivosInput').files);

        if (!unidad || !semana || !titulo || archivos.length === 0) {
            this.showNotification('Completa todos los campos', 'error');
            return;
        }

        this.showNotification('Subiendo... ☁️', 'info');
        const key = `${unidad}-${semana}`;
        const fechaActual = new Date().toISOString().split('T')[0];
        
        try {
            const nuevosArchivos = [];
            for (const file of archivos) {
                let nombreLimpio = file.name
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
                    .replace(/\s+/g, '_')
                    .replace(/_+/g, '_');
                
                nombreLimpio = nombreLimpio.replace(/^_+|_+$/g, '');
                
                const filePath = `${key}/${Date.now()}_${nombreLimpio}`;
                const { error: uploadError } = await this.supabase.storage
                    .from('portafolio-archivos')
                    .upload(filePath, file);
                
                if (uploadError) throw uploadError;
                
                const { data: urlData } = this.supabase.storage
                    .from('portafolio-archivos')
                    .getPublicUrl(filePath);
                
                nuevosArchivos.push({
                    nombre: file.name,
                    tipo: file.type,
                    tamaño: file.size,
                    url: urlData.publicUrl,
                    fecha: fechaActual
                });
            }
            
            const semanaExistente = this.semanas[key];
            let archivosExistentes = [];
            if (semanaExistente && semanaExistente.archivos) {
                archivosExistentes = semanaExistente.archivos;
            }
            
            const archivosCombinados = [...archivosExistentes];
            for (const nuevo of nuevosArchivos) {
                const yaExiste = archivosCombinados.some(a => a.nombre === nuevo.nombre);
                if (!yaExiste) {
                    archivosCombinados.push(nuevo);
                }
            }

            const { error: insertError } = await this.supabase
                .from('semanas')
                .upsert({
                    id: key,
                    unidad: parseInt(unidad),
                    semana: parseInt(semana),
                    titulo: titulo,
                    descripcion: descripcion || 'Sin descripción',
                    fecha: fechaActual,
                    archivos: archivosCombinados
                });
            
            if (insertError) throw insertError;
            
            await this.cargarSemanas();
            this.showNotification('¡Guardado! 🎉', 'success');
            
            document.getElementById('uploadForm').reset();
            document.getElementById('filesPreview').innerHTML = '';
            this.renderSemanasList();
            this.renderUnidades();
            this.updateProgress();
            
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Error: ' + error.message, 'error');
        }
    }

    renderUnidades() {
        const container = document.getElementById('unidadesContainer');
        if (!container) return;
        container.innerHTML = '';

        this.unidades.forEach(unidad => {
            let semanasHtml = '';
            let semanasCompletadas = 0;
            let totalSemanas = 0;
            
            for (let i = 1; i <= 4; i++) {
                const semanaNum = (unidad.id - 1) * 4 + i;
                const key = `${unidad.id}-${semanaNum}`;
                const semana = this.semanas[key];
                totalSemanas++;
                
                if (semana) {
                    semanasCompletadas++;
                    const totalArchivos = semana.archivos ? semana.archivos.length : 0;
                    semanasHtml += `
                        <div class="semana-item">
                            <div class="semana-header">
                                <span class="semana-titulo">Semana ${semanaNum}: ${semana.titulo}</span>
                                <span class="semana-estado estado-completado">✅ Completado</span>
                            </div>
                            <p class="semana-descripcion">${semana.descripcion || 'Sin descripción'}</p>
                            <div class="archivos-container">
                                ${semana.archivos ? semana.archivos.slice(0, 2).map(a => `<span class="archivo-tag"><i class="fas fa-file"></i> ${a.nombre.substring(0, 25)}${a.nombre.length > 25 ? '...' : ''}</span>`).join('') : ''}
                                ${totalArchivos > 2 ? `<span class="archivo-tag">+${totalArchivos - 2} más</span>` : ''}
                            </div>
                            <button class="btn-ver" onclick="app.verSemana('${key}')">Ver detalles (${totalArchivos} archivos)</button>
                        </div>
                    `;
                } else {
                    semanasHtml += `
                        <div class="semana-item">
                            <div class="semana-header">
                                <span class="semana-titulo">Semana ${semanaNum}</span>
                                <span class="semana-estado estado-pendiente">⏳ Pendiente</span>
                            </div>
                            <p class="semana-descripcion">Trabajo no entregado</p>
                        </div>
                    `;
                }
            }
            
            const estadoUnidad = semanasCompletadas === totalSemanas ? '✅ Completada' : `${semanasCompletadas}/${totalSemanas}`;
            const unidadId = `unidad-${unidad.id}`;
            const estaAbierta = this.unidadesAbiertas[unidadId] !== undefined ? this.unidadesAbiertas[unidadId] : true;
            
            container.innerHTML += `
                <div class="unidad-section" id="${unidadId}">
                    <div class="unidad-header unidad-${unidad.id}" onclick="app.toggleUnidad(this)">
                        <div>
                            <h3>${unidad.nombre}</h3>
                            <p>${unidad.tema}</p>
                        </div>
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <span class="unidad-count">${estadoUnidad}</span>
                            <span class="toggle-icon ${estaAbierta ? '' : 'rotate'}">▼</span>
                        </div>
                    </div>
                    <div class="semanas-wrapper ${estaAbierta ? 'open' : ''}">
                        <div class="semanas-list">${semanasHtml}</div>
                    </div>
                </div>
            `;
        });
    }

    toggleUnidad(headerElement) {
        const wrapper = headerElement.nextElementSibling;
        const icon = headerElement.querySelector('.toggle-icon');
        const unidadSection = headerElement.closest('.unidad-section');
        
        if (wrapper.classList.contains('open')) {
            wrapper.classList.remove('open');
            if (icon) icon.classList.add('rotate');
            if (unidadSection) this.unidadesAbiertas[unidadSection.id] = false;
        } else {
            wrapper.classList.add('open');
            if (icon) icon.classList.remove('rotate');
            if (unidadSection) this.unidadesAbiertas[unidadSection.id] = true;
        }
    }

    verSemana(key) {
        const semana = this.semanas[key];
        if (!semana) return;

        const modal = document.getElementById('modalSemana');
        document.getElementById('modalTitulo').innerHTML = `Unidad ${semana.unidad} - ${semana.titulo}`;
        document.getElementById('modalDescripcion').innerHTML = semana.descripcion || 'Sin descripción';
        
        const archivosList = document.getElementById('modalArchivosList');
        archivosList.innerHTML = '';
        
        if (semana.archivos && semana.archivos.length > 0) {
            semana.archivos.forEach((archivo, index) => {
                const sizeKB = (archivo.tamaño / 1024).toFixed(0);
                archivosList.innerHTML += `
                    <div class="archivo-item">
                        <div class="archivo-info">
                            <i class="fas ${archivo.tipo && archivo.tipo.includes('pdf') ? 'fa-file-pdf' : 'fa-file'}" style="font-size: 1.5rem; color: ${archivo.tipo && archivo.tipo.includes('pdf') ? '#ef4444' : '#6B21A8'};"></i>
                            <div>
                                <strong>${archivo.nombre}</strong><br>
                                <small>${sizeKB} KB • ${archivo.fecha}</small>
                            </div>
                        </div>
                        <div class="archivo-acciones">
                            <button class="btn-ver-archivo" onclick="app.visualizarArchivo('${key}', ${index})">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn-descargar-archivo" onclick="app.descargarArchivo('${key}', ${index})">
                                <i class="fas fa-download"></i> Descargar
                            </button>
                        </div>
                    </div>
                `;
            });
        } else {
            archivosList.innerHTML = '<p>No hay archivos adjuntos</p>';
        }
        
        document.getElementById('pdfViewer').style.display = 'none';
        this.pdfDoc = null;
        modal.style.display = 'block';
    }

    async visualizarArchivo(key, index) {
        const semana = this.semanas[key];
        const archivo = semana.archivos[index];
        
        if (archivo.tipo === 'application/pdf') {
            this.showNotification(`📄 Cargando PDF: ${archivo.nombre}`, 'info');
            
            const pdfViewer = document.getElementById('pdfViewer');
            const pdfTitle = document.getElementById('pdfTitle');
            
            pdfViewer.style.display = 'block';
            pdfTitle.textContent = archivo.nombre;
            
            try {
                const loadingTask = pdfjsLib.getDocument(archivo.url);
                this.pdfDoc = await loadingTask.promise;
                this.totalPages = this.pdfDoc.numPages;
                this.currentPageNum = 1;
                this.currentPdfUrl = archivo.url;
                
                await this.renderPage(1);
                
                document.getElementById('pageInfo').textContent = `Página 1 de ${this.totalPages}`;
                const prevBtn = document.getElementById('prevPageBtn');
                const nextBtn = document.getElementById('nextPageBtn');
                if (prevBtn) prevBtn.disabled = true;
                if (nextBtn) nextBtn.disabled = this.totalPages <= 1;
                
                pdfViewer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                this.showNotification(`✅ PDF cargado: ${this.totalPages} páginas`, 'success');
                
            } catch (error) {
                console.error('Error cargando PDF:', error);
                this.showNotification('Error al cargar el PDF', 'error');
            }
        } else {
            window.open(archivo.url, '_blank');
        }
    }

    async renderPage(pageNum) {
        if (!this.pdfDoc) return;
        
        const page = await this.pdfDoc.getPage(pageNum);
        const canvas = document.getElementById('pdfCanvas');
        const ctx = canvas.getContext('2d');
        
        const viewport = page.getViewport({ scale: this.currentZoom });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        document.getElementById('pageInfo').textContent = `Página ${pageNum} de ${this.totalPages}`;
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        if (prevBtn) prevBtn.disabled = pageNum <= 1;
        if (nextBtn) nextBtn.disabled = pageNum >= this.totalPages;
    }

    async nextPage() {
        if (this.pdfDoc && this.currentPageNum < this.totalPages) {
            this.currentPageNum++;
            await this.renderPage(this.currentPageNum);
        }
    }

    async prevPage() {
        if (this.pdfDoc && this.currentPageNum > 1) {
            this.currentPageNum--;
            await this.renderPage(this.currentPageNum);
        }
    }

    zoomIn() {
        this.currentZoom += 0.25;
        if (this.pdfDoc) {
            this.renderPage(this.currentPageNum);
        }
    }

    zoomOut() {
        if (this.currentZoom > 0.5) {
            this.currentZoom -= 0.25;
            if (this.pdfDoc) {
                this.renderPage(this.currentPageNum);
            }
        }
    }

    cerrarVisorPDF() {
        document.getElementById('pdfViewer').style.display = 'none';
        
        const canvas = document.getElementById('pdfCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        this.pdfDoc = null;
        this.currentPageNum = 1;
        this.totalPages = 1;
        this.currentZoom = 1.5;
        
        this.showNotification('Visor cerrado', 'info');
    }

    descargarArchivo(key, index) {
        const semana = this.semanas[key];
        const archivo = semana.archivos[index];
        
        const link = document.createElement('a');
        link.href = archivo.url;
        link.download = archivo.nombre;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification(`📥 Descargando: ${archivo.nombre}`, 'success');
    }

    cerrarModal() {
        document.getElementById('modalSemana').style.display = 'none';
        document.getElementById('pdfViewer').style.display = 'none';
        this.pdfDoc = null;
    }

    renderSemanasList() {
        const container = document.getElementById('semanasList');
        if (!container) return;

        const semanasArray = Object.entries(this.semanas);
        if (semanasArray.length === 0) {
            container.innerHTML = '<p>No hay semanas configuradas</p>';
            return;
        }

        container.innerHTML = '';
        semanasArray.sort((a, b) => {
            const [unidadA, semanaA] = a[0].split('-').map(Number);
            const [unidadB, semanaB] = b[0].split('-').map(Number);
            return unidadA - unidadB || semanaA - semanaB;
        }).forEach(([key, semana]) => {
            const totalArchivos = semana.archivos ? semana.archivos.length : 0;
            let totalSize = 0;
            if (semana.archivos && semana.archivos.length > 0) {
                totalSize = semana.archivos.reduce((sum, a) => sum + (a.tamaño || 0), 0);
            }
            const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
            
            container.innerHTML += `
                <div class="semana-admin-item">
                    <div>
                        <strong>Unidad ${semana.unidad} - Semana ${semana.semana}</strong>
                        <p>${semana.titulo}</p>
                        <small>${totalArchivos} archivo(s) - ${sizeMB} MB</small>
                    </div>
                    <button class="btn-delete" onclick="app.eliminarSemana('${key}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            `;
        });
    }

    async eliminarSemana(key) {
        if (confirm('¿Eliminar esta semana y TODOS sus archivos?')) {
            try {
                await this.supabase.from('semanas').delete().eq('id', key);
                await this.cargarSemanas();
                this.renderSemanasList();
                this.renderUnidades();
                this.updateProgress();
                this.showNotification('Semana eliminada', 'success');
            } catch (error) {
                this.showNotification('Error al eliminar', 'error');
            }
        }
    }

    updateProgress() {
        const totalSemanas = 16;
        const completadas = Object.keys(this.semanas).length;
        const porcentaje = (completadas / totalSemanas) * 100;
        
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const progressPercentage = document.getElementById('progressPercentage');
        
        if (progressBar) progressBar.style.width = `${porcentaje}%`;
        if (progressText) progressText.textContent = `${completadas} de ${totalSemanas} semanas completadas`;
        if (progressPercentage) progressPercentage.textContent = `${porcentaje.toFixed(0)}%`;
    }

    checkAuthState() {
        this.isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6';
        
        notification.style.cssText = `
            position: fixed; bottom: 20px; right: 20px;
            background: ${bgColor}; color: white; padding: 1rem 1.5rem;
            border-radius: 10px; z-index: 1001; animation: slideIn 0.3s ease;
            font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    // ========== BOTONES SOBRE MÍ ==========
    setupSobreMiButtons() {
        const sobreMiBtnInicio = document.getElementById('sobreMiBtnInicio');
        const sobreMiBtnTrabajos = document.getElementById('sobreMiBtnTrabajos');
        const closeSobremiBtn = document.getElementById('closeSobremiBtn');
        const sobremiPage = document.getElementById('sobremi-page');
        
        const showSobremi = () => {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            sobremiPage.classList.add('active');
            document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        };
        
        if (sobreMiBtnInicio) sobreMiBtnInicio.addEventListener('click', showSobremi);
        if (sobreMiBtnTrabajos) sobreMiBtnTrabajos.addEventListener('click', showSobremi);
        
        if (closeSobremiBtn) {
            closeSobremiBtn.addEventListener('click', () => {
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.getElementById('inicio-page').classList.add('active');
                document.querySelector('.nav-link[data-page="inicio"]').classList.add('active');
            });
        }
    }

    // ========== ASISTENTE FLOTANTE ==========
    setupFloatingAssistant() {
        const toggle = document.getElementById('assistantToggle');
        const windowEl = document.getElementById('assistantWindow');
        const closeBtn = document.getElementById('closeAssistant');
        const input = document.getElementById('assistantInput');
        const sendBtn = document.getElementById('sendAssistantMsg');
        const messages = document.getElementById('assistantMessages');
        
        if (!toggle || !windowEl) return;
        
        toggle.addEventListener('click', () => {
            if (windowEl.style.display === 'none' || windowEl.style.display === '') {
                windowEl.style.display = 'block';
                if (messages.children.length === 0) {
                    this.addWelcomeMessage();
                }
            } else {
                windowEl.style.display = 'none';
            }
        });
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                windowEl.style.display = 'none';
            });
        }
        
        this.assistantKnowledge = {
            'saludos': ['hola', 'buenas', 'hey', 'hi', 'hello', 'que tal'],
            'despedidas': ['adiós', 'chao', 'nos vemos', 'hasta luego', 'bye'],
            'transacciones': {
                keywords: ['transaccion', 'acid', 'atomicidad', 'consistencia', 'aislamiento', 'durabilidad'],
                response: '🪼 **Transacciones ACID**: Atomicidad (todo o nada), Consistencia (reglas de integridad), Aislamiento (no interfieren), Durabilidad (persisten los cambios).'
            },
            'normalizacion': {
                keywords: ['normalizacion', '1nf', '2nf', '3nf', 'bcnf'],
                response: '🪼 **Formas Normales**: 1NF (valores atómicos), 2NF (dependencia completa), 3NF (sin transitivas), BCNF (caso estricto).'
            },
            'joins': {
                keywords: ['join', 'inner join', 'left join', 'right join'],
                response: '🪼 **JOINs**: INNER (solo coincidencias), LEFT (todos izquierda), RIGHT (todos derecha), FULL (todos los registros).'
            }
        };
        
        const getResponse = (question) => {
            const q = question.toLowerCase();
            
            if (this.assistantKnowledge.saludos.some(w => q.includes(w))) {
                return '¡Hola! 🪻 Soy LilyBot. ¿En qué puedo ayudarte con Base de Datos II?';
            }
            if (this.assistantKnowledge.despedidas.some(w => q.includes(w))) {
                return '¡Hasta luego! Éxito en tus estudios 💪';
            }
            if (q.includes('gracias')) {
                return '¡De nada! Estoy aquí para ayudarte 🎉';
            }
            
            for (const [topic, data] of Object.entries(this.assistantKnowledge)) {
                if (data.keywords && data.keywords.some(k => q.includes(k))) {
                    return data.response;
                }
            }
            
            return 'No encontré información sobre eso. Pregúntame sobre: transacciones ACID, normalización, JOINs SQL, NoSQL, índices, vistas, procedimientos, triggers.';
        };
        
        const addMessage = (text, isUser = false) => {
            const msgDiv = document.createElement('div');
            msgDiv.className = `assistant-message ${isUser ? 'user' : 'bot'}`;
            msgDiv.innerHTML = `
                <div class="message-bubble">
                    ${!isUser ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>'}
                    <p>${text.replace(/\n/g, '<br>')}</p>
                </div>
            `;
            messages.appendChild(msgDiv);
            messages.scrollTop = messages.scrollHeight;
        };
        
        const sendMessage = () => {
            const question = input.value.trim();
            if (!question) return;
            
            addMessage(question, true);
            input.value = '';
            
            const typingDiv = document.createElement('div');
            typingDiv.className = 'assistant-message bot';
            typingDiv.id = 'typingIndicator';
            typingDiv.innerHTML = `<div class="message-bubble"><i class="fas fa-robot"></i><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
            messages.appendChild(typingDiv);
            messages.scrollTop = messages.scrollHeight;
            
            setTimeout(() => {
                const typing = document.getElementById('typingIndicator');
                if (typing) typing.remove();
                addMessage(getResponse(question), false);
            }, 800);
        };
        
        if (sendBtn) sendBtn.addEventListener('click', sendMessage);
        if (input) input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    addWelcomeMessage() {
        const messages = document.getElementById('assistantMessages');
        if (!messages) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'assistant-message bot';
        msgDiv.innerHTML = `
            <div class="message-bubble">
                <i class="fas fa-robot"></i>
                <p><strong>¡Hola! 🪻</strong><br><br>Soy <strong>LilyBot</strong>, tu asistente de <strong>Base de Datos II</strong>.<br><br>Pregúntame sobre transacciones, normalización, JOINs, NoSQL, índices y más.</p>
            </div>
        `;
        messages.appendChild(msgDiv);
        
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'suggestions-container';
        suggestionsDiv.innerHTML = `
            <div class="quick-questions">
                <span class="quick-q" data-q="Qué es la normalización">📊 Normalización</span>
                <span class="quick-q" data-q="Tipos de JOIN en SQL">🔗 JOINs</span>
                <span class="quick-q" data-q="Qué son las transacciones ACID">⚡ ACID</span>
            </div>
        `;
        messages.appendChild(suggestionsDiv);
        
        suggestionsDiv.querySelectorAll('.quick-q').forEach(q => {
            q.addEventListener('click', () => {
                const input = document.getElementById('assistantInput');
                if (input) {
                    input.value = q.dataset.q;
                    const sendBtn = document.getElementById('sendAssistantMsg');
                    if (sendBtn) sendBtn.click();
                }
            });
        });
    }

    // ========== MÚSICA ==========
    setupMusicOnSobremi() {
        const playBtn = document.getElementById('playMusicBtn');
        const stopBtn = document.getElementById('stopMusicBtn');
        const audio = document.getElementById('lanaMusic');
        
        if (!playBtn || !stopBtn || !audio) return;
        
        audio.volume = 0.5;
        
        playBtn.addEventListener('click', () => {
            audio.play().catch(error => {
                console.log('Error:', error);
                this.showNotification('🎵 Haz clic en la página primero', 'info');
            });
            playBtn.style.display = 'none';
            stopBtn.style.display = 'flex';
        });
        
        stopBtn.addEventListener('click', () => {
            audio.pause();
            audio.currentTime = 0;
            stopBtn.style.display = 'none';
            playBtn.style.display = 'flex';
        });
    }
}

// Inicializar la aplicación
const app = new PortafolioApp();

// Cerrar modales al hacer clic fuera
window.onclick = (e) => {
    const modal = document.getElementById('modalSemana');
    if (e.target === modal) app.cerrarModal();
};