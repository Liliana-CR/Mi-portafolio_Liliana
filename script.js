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
        
        // NUEVAS FUNCIONALIDADES
        this.setupSobreMiButtons();
        this.setupFloatingAssistant();
        this.setupMusicOnSobremi();
        
        // 🔧 CORRECCIÓN: Conectar botones del visor PDF
        this.setupPdfViewerButtons();
        
        // Configurar PDF.js
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        }
    }

    // 🔧 NUEVA FUNCIÓN: Conectar botones del visor PDF
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
            for (let i = 1; i <= 4; i++) {
                const semanaNum = (unidad.id - 1) * 4 + i;
                const key = `${unidad.id}-${semanaNum}`;
                const semana = this.semanas[key];
                
                if (semana) {
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
            
            container.innerHTML += `
                <div class="unidad-section">
                    <div class="unidad-header unidad-${unidad.id}">
                        <div><h3>${unidad.nombre}</h3><p>${unidad.tema}</p></div>
                    </div>
                    <div class="semanas-list">${semanasHtml}</div>
                </div>
            `;
        });
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
        
        const archivosList = document.getElementById('modalArchivosList');
        if (archivosList) {
            archivosList.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
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

    // ========== ASISTENTE FLOTANTE (TU VERSIÓN ORIGINAL) ==========
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
        
        // BASE DE CONOCIMIENTO COMPLETA
        this.assistantKnowledge = {
            'saludos': ['hola', 'buenas', 'hey', 'hi', 'hello', 'que tal', 'cómo estás', 'saludos'],
            'despedidas': ['adiós', 'chao', 'nos vemos', 'hasta luego', 'bye', 'gracias por todo'],
            'transacciones': {
                keywords: ['transaccion', 'transacciones', 'acid', 'atomicidad', 'consistencia', 'aislamiento', 'durabilidad', 'commit', 'rollback'],
                response: '🪼 **Transacciones ACID**\n\n• **Atomicidad**: La transacción se completa completamente o no se realiza ningún cambio.\n• **Consistencia**: Mantiene todas las reglas de integridad de la BD.\n• **Aislamiento**: Transacciones simultáneas no interfieren entre sí.\n• **Durabilidad**: Los cambios persisten incluso tras fallos del sistema.\n\n💡 Los comandos COMMIT guarda cambios, ROLLBACK los deshace.'
            },
            'normalizacion': {
                keywords: ['normalizacion', 'forma normal', '1nf', '2nf', '3nf', 'bcnf', 'redundancia', 'anomalia', 'dependencia funcional'],
                response: '🪼 **Formas Normales**\n\n• **1NF**: Valores atómicos (no repite grupos)\n• **2NF**: Dependencia completa de la clave primaria\n• **3NF**: Sin dependencias transitivas\n• **BCNF**: Caso más estricto de 3NF\n\n✅ La normalización elimina redundancias y anomalías de inserción/actualización/eliminación.'
            },
            'joins': {
                keywords: ['join', 'inner join', 'left join', 'right join', 'full join', 'cross join', 'unir tablas'],
                response: '🪼 **Tipos de JOIN en SQL**\n\n• **INNER JOIN**: Solo registros que coinciden en ambas tablas\n• **LEFT JOIN**: Todos los registros de la izquierda + coincidencias\n• **RIGHT JOIN**: Todos los registros de la derecha + coincidencias\n• **FULL OUTER JOIN**: Todos los registros de ambas tablas\n• **CROSS JOIN**: Producto cartesiano'
            },
            'subconsultas': {
                keywords: ['subconsulta', 'subquery', 'consulta anidada', 'exists', 'in', 'any', 'all'],
                response: '🪼 **Subconsultas**\n\n• **Escalar**: Devuelve 1 valor (usada en SELECT/WHERE)\n• **Fila**: Devuelve 1 fila\n• **Tabla**: Devuelve tabla (usada en FROM)\n\nOperadores: IN, EXISTS, ANY, ALL, comparadores (=, >, <)'
            },
            'indices': {
                keywords: ['indice', 'indices', 'index', 'btree', 'hash', 'rendimiento', 'optimizacion', 'query tuning', 'plan de ejecucion'],
                response: '🪼 **Índices y Optimización**\n\n• **B-Tree**: General, ordenado, búsquedas por rango\n• **Hash**: Búsquedas exactas (equidad)\n• **Bitmap**: Columnas con pocos valores distintos\n• **Full-text**: Búsqueda de texto\n\n💡 Los índices aceleran SELECT pero ralentizan INSERT/UPDATE/DELETE.'
            },
            'vistas': {
                keywords: ['vista', 'view', 'vista materializada', 'materialized view'],
                response: '🪼 **Vistas (VIEWS)**\n\n• **Vista estándar**: Consulta almacenada, datos en tiempo real\n• **Vista materializada**: Datos almacenados físicamente, mejor rendimiento\n\n✅ Usos: Seguridad, simplificación, reutilización de consultas complejas.'
            },
            'procedimientos': {
                keywords: ['procedimiento', 'stored procedure', 'funcion almacenada', 'function', 'pl/sql', 'plpgsql'],
                response: '🪼 **Procedimientos Almacenados**\n\n• Bloque de código SQL ejecutable en el servidor\n• Ventajas: Menor tráfico red, reutilización, seguridad\n• Pueden tener parámetros (IN, OUT, INOUT)\n• Pueden contener variables, condicionales, bucles\n\nEjemplo: `CREATE PROCEDURE nombre(param INT) LANGUAGE SQL AS $$ ... $$`'
            },
            'triggers': {
                keywords: ['trigger', 'disparador', 'evento', 'before', 'after', 'instead of'],
                response: '🪼 **Triggers (Disparadores)**\n\n• Se ejecutan automáticamente ante eventos: INSERT, UPDATE, DELETE\n• **Timing**: BEFORE, AFTER, INSTEAD OF\n• **Nivel**: FOR EACH ROW o FOR EACH STATEMENT\n\n✅ Usos: Auditoría, validaciones complejas, integridad referencial avanzada, logging.'
            },
            'nosql': {
                keywords: ['nosql', 'mongodb', 'redis', 'cassandra', 'neo4j', 'documento', 'clave-valor', 'columnas', 'grafos'],
                response: '🪼 **NoSQL - Tipos**\n\n• **Documentos** (MongoDB): JSON/BSON, flexible\n• **Clave-Valor** (Redis): Alta velocidad, caché\n• **Columnas** (Cassandra): Escritura rápida, big data\n• **Grafos** (Neo4j): Relaciones complejas\n\n✅ Usar NoSQL cuando: datos no estructurados, alta escalabilidad horizontal, consultas simples.'
            },
            'cap': {
                keywords: ['cap', 'teorema cap', 'consistencia', 'disponibilidad', 'tolerancia particion'],
                response: '🪼 **Teorema CAP**\n\nEn sistemas distribuidos solo puedes tener 2 de 3:\n\n• **C**onsistencia - Todos ven mismos datos\n• **A**vailability - El sistema siempre responde\n• **P**artition Tolerance - Funciona pese a fallos de red\n\nBases de datos: MongoDB (CP), Cassandra (AP), etc.'
            },
            'sqlvsnosql': {
                keywords: ['diferencia sql nosql', 'sql vs nosql', 'cuando usar sql', 'cuando usar nosql'],
                response: '🪼 **SQL vs NoSQL**\n\n| Característica | SQL | NoSQL |\n|---------------|-----|-------|\n| Esquema | Fijo, predefinido | Flexible, dinámico |\n| Escalabilidad | Vertical | Horizontal |\n| Relaciones | Sí (JOINs) | Limitadas |\n| ACID | Total | Parcial (BASE) |\n| Uso típico | Transacciones, reportes | Big data, tiempo real |'
            },
            'base': {
                keywords: ['base', 'base datos', 'fundamentos', 'bd', 'dbms', 'sgbd'],
                response: '🪼 **Fundamentos de Bases de Datos**\n\n• **DBMS/SGBD**: Sistema gestor (MySQL, PostgreSQL, Oracle)\n• **Modelos**: Relacional, jerárquico, red, orientado a objetos\n• **Lenguajes**: DDL (definición), DML (manipulación), DCL (control)\n• **ACID**: Propiedades clave de transacciones'
            },
            'backup': {
                keywords: ['backup', 'respaldo', 'restore', 'recuperacion', 'disaster recovery'],
                response: '🪼 **Backup y Recuperación**\n\n• **Backup completo**: Toda la BD\n• **Backup incremental**: Solo cambios desde último backup\n• **Backup diferencial**: Cambios desde último backup completo\n• **PITR**: Recuperación a un punto exacto en el tiempo\n\n✅ Estrategia 3-2-1: 3 copias, 2 medios, 1 fuera del sitio'
            },
            'seguridad': {
                keywords: ['seguridad', 'autenticacion', 'autorizacion', 'encriptacion', 'sql injection', 'inyeccion sql', 'permisos', 'grant', 'revoke'],
                response: '🪼 **Seguridad en BD**\n\n• **Autenticación**: Verificar identidad\n• **Autorización**: Permisos (GRANT/REVOKE)\n• **Prevención SQL Injection**: Parámetros, prepared statements\n• **Encriptación**: Datos en reposo y en tránsito\n• **Auditoría**: Logs de acciones'
            },
            'deadlock': {
                keywords: ['deadlock', 'bloqueo mutuo', 'interbloqueo', 'punto muerto', 'starvation'],
                response: '🪼 **Deadlock (Interbloqueo)**\n\nOcurre cuando dos o más transacciones esperan recursos que la otra tiene bloqueados.\n\n**Soluciones**:\n• Detección y aborto (victim)\n• Timeouts\n• Ordenación de recursos\n• Espera gráfica'
            },
            'isolation': {
                keywords: ['isolation level', 'nivel aislamiento', 'dirty read', 'phantom read', 'repeatable read', 'read uncommitted', 'read committed', 'serializable'],
                response: '🪼 **Niveles de Aislamiento**\n\n1. **READ UNCOMMITTED**: Lecturas sucias (dirty reads)\n2. **READ COMMITTED**: Lecturas no repetibles\n3. **REPEATABLE READ**: Lecturas fantasma (phantom reads)\n4. **SERIALIZABLE**: Máximo aislamiento (más lento)\n\nMayor nivel = más consistencia, menos concurrencia.'
            }
        };
        
        const getResponse = (question) => {
            const q = question.toLowerCase();
            
            if (this.assistantKnowledge.saludos.some(word => q.includes(word))) {
                return '¡Hola visitantes! ⋆🪻 Soy LilyBot. ¿En qué puedo ayudarte hoy con Base de Datos II? Puedes preguntarme sobre transacciones, normalización, SQL, NoSQL, índices, vistas, procedimientos, triggers, seguridad, backup, deadlocks, niveles de aislamiento y mucho más.';
            }
            
            if (this.assistantKnowledge.despedidas.some(word => q.includes(word))) {
                return '¡Hasta luego! Sigue estudiando mucho. Si necesitas ayuda, aquí estaré para ti. ¡Éxito en Base de Datos II!';
            }
            
            if (q.includes('gracias')) {
                return '¡De nada! 🎉 Me alegra poder ayudarte. Si tienes más dudas sobre Base de Datos II, no dudes en preguntar. ¡Tú puedes!';
            }
            
            for (const [topic, data] of Object.entries(this.assistantKnowledge)) {
                if (topic !== 'saludos' && topic !== 'despedidas' && data.keywords) {
                    if (data.keywords.some(keyword => q.includes(keyword))) {
                        return data.response;
                    }
                }
            }
            
            return '**No encontré información específica sobre eso.**\n\nPuedo ayudarte con:\n\n🔹 **Transacciones ACID**\n🔹 **Normalización** (1NF, 2NF, 3NF, BCNF)\n🔹 **JOINs y Subconsultas**\n🔹 **Índices y Optimización**\n🔹 **Vistas y Procedimientos**\n🔹 **Triggers**\n🔹 **NoSQL** (MongoDB, Redis, etc.)\n🔹 **Teorema CAP**\n🔹 **Backup y Seguridad**\n🔹 **Deadlocks y Niveles de Aislamiento**\n\n¿Podrías reformular tu pregunta? 😊';
        };
        
        const addMessage = (text, isUser = false) => {
            const msgDiv = document.createElement('div');
            msgDiv.className = `assistant-message ${isUser ? 'user' : 'bot'}`;
            
            let formattedText = text;
            if (!isUser) {
                formattedText = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            }
            
            msgDiv.innerHTML = `
                <div class="message-bubble">
                    ${!isUser ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>'}
                    <p>${formattedText}</p>
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
            typingDiv.innerHTML = `
                <div class="message-bubble">
                    <i class="fas fa-robot"></i>
                    <div class="typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            `;
            messages.appendChild(typingDiv);
            messages.scrollTop = messages.scrollHeight;
            
            setTimeout(() => {
                const typing = document.getElementById('typingIndicator');
                if (typing) typing.remove();
                const response = getResponse(question);
                addMessage(response, false);
            }, 800);
        };
        
        if (sendBtn) sendBtn.addEventListener('click', sendMessage);
        if (input) input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        if (messages.children.length === 0) {
            this.addWelcomeMessage();
        }
    }

    addWelcomeMessage() {
        const messages = document.getElementById('assistantMessages');
        if (!messages) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'assistant-message bot';
        msgDiv.innerHTML = `
            <div class="message-bubble">
                <i class="fas fa-robot"></i>
                <p><strong>¡Hola visitantes! 🪻</strong><br><br>
                Soy <strong>LilyBot</strong>, tu asistente personal de <strong>Base de Datos II</strong>.<br><br>
                Puedo ayudarte con dudas sobre:<br>
                🫧 Transacciones ACID<br>
                🫧 Normalización<br>
                🫧 JOINs SQL<br>
                🫧 NoSQL<br>
                🫧 Índices y Optimización<br>
                🫧 Procedimientos y Triggers<br>
                🫧 Seguridad, Backup y etc...</p>
            </div>
        `;
        messages.appendChild(msgDiv);
        
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'suggestions-container';
        suggestionsDiv.innerHTML = `
            <div class="suggestion-title">
                <i class="fas fa-lightbulb"></i> Preguntas sugeridas:
            </div>
            <div class="quick-questions">
                <span class="quick-q" data-q="Qué es la normalización de BD">📊 Normalización</span>
                <span class="quick-q" data-q="Tipos de JOIN en SQL">🔗 JOINs SQL</span>
                <span class="quick-q" data-q="Diferencia entre SQL y NoSQL">🍃 SQL vs NoSQL</span>
                <span class="quick-q" data-q="Cómo crear un índice en SQL">⚡ Índices</span>
                <span class="quick-q" data-q="Qué son los procedimientos almacenados">📦 Stored Procedures</span>
                <span class="quick-q" data-q="Para qué sirven los triggers">⚙️ Triggers</span>
                <span class="quick-q" data-q="Qué es el teorema CAP">🎯 Teorema CAP</span>
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

    // ========== MÚSICA EN PÁGINA SOBRE MÍ ==========
    setupMusicOnSobremi() {
        const playBtn = document.getElementById('playMusicBtn');
        const stopBtn = document.getElementById('stopMusicBtn');
        const audio = document.getElementById('lanaMusic');
        
        if (!playBtn || !stopBtn || !audio) return;
        
        audio.volume = 0.5;
        
        playBtn.addEventListener('click', () => {
            audio.play().catch(error => {
                console.log('Error:', error);
                this.showNotification('🎵 Haz clic en la página primero para activar la música', 'info');
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