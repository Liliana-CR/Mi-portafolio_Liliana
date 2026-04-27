import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 🔥 CONFIGURA
const supabaseUrl = 'https://dkvlhvogwsocnfscjxaw.supabase.co'
const supabaseKey = 'sb_publishable_iuCe8KyfJPvmmdbrFtQPuQ_T_CWQDVn'
const supabase = createClient(supabaseUrl, supabaseKey)

// ========== APP ==========
class PortafolioApp {
    constructor() {
        this.currentPage = 'inicio';
        this.isLoggedIn = false;
        this.semanas = {};

        this.unidades = [
            { id: 1, nombre: 'Unidad I', tema: 'Introducción a la arquitectura de B.D' },
            { id: 2, nombre: 'Unidad II', tema: 'SQL Avanzado' },
            { id: 3, nombre: 'Unidad III', tema: 'Transacciones y Concurrencia' },
            { id: 4, nombre: 'Unidad IV', tema: 'NoSQL y Tendencias' }
        ];

        // PDF
        this.pdfDoc = null;
        this.currentPageNum = 1;
        this.totalPages = 1;
        this.currentZoom = 1.5;

        this.init();
    }

    async init() {
        await this.loadSemanas();
        this.setupNavigation();
        this.setupLogin();
        this.setupAdminPanel();
        this.setupFileUpload();
        this.renderUnidades();
        this.updateProgress();
        this.checkAuthState();

        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }

    // 🔥 CARGAR DESDE SUPABASE
    async loadSemanas() {
        try {
            const { data, error } = await supabase.from('semanas').select('*');

            if (error) throw error;

            this.semanas = {};
            data.forEach(item => {
                const key = `${item.unidad}-${item.semana}`;
                this.semanas[key] = item;
            });

        } catch (e) {
            console.error(e);
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

    setupLogin() {
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const u = username.value;
            const p = password.value;

            if (u === 'admin' && p === 'admin123') {
                this.isLoggedIn = true;
                localStorage.setItem('isLoggedIn', 'true');
                this.navigateTo('login');
                this.showNotification('Bienvenida ✨', 'success');
            } else {
                this.showNotification('Error', 'error');
            }
        });

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.isLoggedIn = false;
            localStorage.removeItem('isLoggedIn');
            this.navigateTo('inicio');
        });
    }

    setupAdminPanel() {
        const unidadSelect = document.getElementById('unidadSelect');
        const semanaSelect = document.getElementById('semanaSelect');

        unidadSelect?.addEventListener('change', () => {
            semanaSelect.innerHTML = '<option value="">Seleccionar</option>';
            if (unidadSelect.value) {
                const inicio = (unidadSelect.value - 1) * 4 + 1;
                for (let i = 0; i < 4; i++) {
                    const s = inicio + i;
                    const opt = document.createElement('option');
                    opt.value = s;
                    opt.textContent = `Semana ${s}`;
                    semanaSelect.appendChild(opt);
                }
            }
        });

        document.getElementById('uploadForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarSemana();
        });
    }

    setupFileUpload() {
        document.getElementById('archivosInput')?.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            document.getElementById('filesPreview').innerHTML =
                files.map(f => f.name).join('<br>');
        });
    }

    // 🔥 GUARDAR EN SUPABASE
    async guardarSemana() {
        const unidad = unidadSelect.value;
        const semana = semanaSelect.value;
        const titulo = tituloSemana.value;
        const descripcion = descripcionSemana.value;
        const archivos = Array.from(archivosInput.files);

        if (!unidad || !semana || !titulo || archivos.length === 0) {
            this.showNotification('Completa todo', 'error');
            return;
        }

        try {
            const archivosData = await Promise.all(
                archivos.map(async (file) => {
                    const path = `archivos/${Date.now()}-${file.name}`;

                    await supabase.storage.from('archivos').upload(path, file);

                    const { data } = supabase.storage.from('archivos').getPublicUrl(path);

                    return {
                        nombre: file.name,
                        tipo: file.type,
                        url: data.publicUrl
                    };
                })
            );

            await supabase.from('semanas').insert([{
                unidad: parseInt(unidad),
                semana: parseInt(semana),
                titulo,
                descripcion,
                archivos: archivosData,
                fecha: new Date().toLocaleDateString()
            }]);

            this.showNotification('Guardado ☁️', 'success');

            await this.loadSemanas();
            this.renderUnidades();
            this.updateProgress();

        } catch (e) {
            console.error(e);
            this.showNotification('Error', 'error');
        }
    }

    renderUnidades() {
        const container = document.getElementById('unidadesContainer');
        if (!container) return;

        container.innerHTML = '';

        Object.values(this.semanas).forEach(semana => {
            const div = document.createElement('div');
            div.innerHTML = `
                <div style="background:white;padding:1rem;margin:1rem;border-radius:10px;">
                    <h3>Semana ${semana.semana} - ${semana.titulo}</h3>
                    <p>${semana.descripcion}</p>
                    ${semana.archivos.map(a => `<a href="${a.url}" target="_blank">${a.nombre}</a>`).join('<br>')}
                </div>
            `;
            container.appendChild(div);
        });
    }

    updateProgress() {
        const total = 16;
        const done = Object.keys(this.semanas).length;
        const pct = (done / total) * 100;

        progressBar.style.width = pct + '%';
        progressText.textContent = `${done} de ${total}`;
        progressPercentage.textContent = pct.toFixed(0) + '%';
    }

    checkAuthState() {
        this.isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    }

    showNotification(msg, type) {
        alert(msg);
    }
}

const app = new PortafolioApp();