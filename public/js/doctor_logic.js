    <script>
        // --- INICIALIZACIÓN DE LIBRERÍA PDF ---
        const { jsPDF } = window.jspdf;
        // ----------------------------------------
    
        const API_BASE = 'http://localhost:3000/api/doctor';
        const contentArea = document.getElementById('content-area');
        let doctorProfileData = null; // Variable global para guardar datos del perfil
        let currentPrescriptionLines = []; // Array para guardar líneas de prescripción
        
        // --- DECLARACIONES DE MODAL (Arreglo de error 'already declared') ---
        const modal = document.getElementById('modal-backdrop');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        const modalFooter = document.getElementById('modal-footer');
        const modalBtnConfirm = document.getElementById('modal-btn-confirm');
        const modalBtnCancel = document.getElementById('modal-btn-cancel');

        function logout() {
            localStorage.clear();
            window.location.href = 'login.html';
        }
        
        // --- Función de Menú Hamburguesa ---
        function toggleMenu() {
            document.getElementById('sidebar').classList.toggle('open');
            document.querySelector('.overlay').classList.toggle('open');
        }

        // --- Función de Notificación Profesional ---
        function showToast(message, type = 'success') {
            const toast = document.getElementById('toast-notification');
            toast.textContent = message;
            toast.className = 'show'; 
            
            if (type === 'error') {
                toast.classList.add('error');
            } else {
                toast.classList.add('success');
            }

            setTimeout(() => {
                toast.className = toast.className.replace('show', '');
            }, 3000);
        }

        // Verificación de Token
        document.addEventListener('DOMContentLoaded', () => {
            const token = localStorage.getItem('token');
            const userRole = localStorage.getItem('rol');
            
            if (!token || userRole !== 'Doctor') {
                showToast('Acceso Denegado. Se requiere el rol de Doctor.', 'error');
                setTimeout(logout, 1500);
                throw new Error("Acceso no autorizado detenido."); 
            }
            
            loadDoctorProfile(); 
            
            const urlHash = window.location.hash.substring(1); 
            if (urlHash && document.querySelector(`#sidebar a[data-section="${urlHash}"]`)) {
                loadSection(urlHash);
                document.querySelectorAll('#sidebar a').forEach(l => l.classList.remove('active'));
                const activeLink = document.querySelector(`#sidebar a[data-section="${urlHash}"]`);
                if(activeLink) activeLink.classList.add('active');
            } else {
                loadSection('mi-perfil'); // Carga Mi Perfil por defecto
            }
            
            
            document.querySelectorAll('#sidebar a').forEach(link => {
                if (link.getAttribute('href') === 'expediente.html') {
                    return; 
                }

                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (e.currentTarget.classList.contains('logout-menu-item')) return;
                    
                    const section = e.currentTarget.getAttribute('data-section');
                    document.querySelectorAll('#sidebar a').forEach(l => l.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    loadSection(section);
                    
                    if (window.innerWidth <= 900) {
                        toggleMenu();
                    }
                });
            });
        });

        // Fetch Genérico
        async function apiFetch(endpoint, options = {}) {
            const token = localStorage.getItem('token');
            const defaultHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            try {
                const response = await fetch(`${API_BASE}${endpoint}`, {
                    ...options,
                    headers: { ...defaultHeaders, ...options.headers }
                });

                const contentType = response.headers.get("content-type");
                if (response.status === 404) {
                     throw new Error(`Error 404: No se encontró la ruta API (${endpoint}). Revise server.js.`);
                }
                
                let result;
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    result = await response.json();
                } else {
                    const errorText = await response.text();
                    throw new Error(`El servidor devolvió un error inesperado (no-JSON): ${errorText.substring(0, 100)}...`);
                }

                if (response.status === 401 || response.status === 403) {
                     showToast(result.message || 'Sesión expirada.', 'error');
                     setTimeout(logout, 1500);
                     throw new Error('Unauthorized');
                }
                
                if (!response.ok) {
                    throw new Error(result.msg || result.message || `Error de API`);
                }
                return result;
            } catch (error) {
                if (error.message !== 'Unauthorized') {
                    console.error(`Error en API Fetch (${endpoint}):`, error);
                    showToast(`Error: ${error.message}`, 'error');
                }
                throw error; 
            }
        }
        
        // Cargar Perfil del Doctor
        async function loadDoctorProfile() {
            try {
                const perfil = await apiFetch('/perfil');
                doctorProfileData = perfil; 
                
                document.getElementById('doctor-name').textContent = `${perfil.nombre} ${perfil.apellido}`;
                document.getElementById('doctor-spec').textContent = perfil.especialidad;
                
                updatePendingCitasBadge();
                
            } catch (error) {
                doctorProfileData = null; 
                document.getElementById('doctor-name').textContent = "Error al cargar";
                document.getElementById('doctor-spec').textContent = "Verifique el servidor";
            }
        }

        // Cargar Sección Principal (SIN ECE)
        async function loadSection(section) {
            contentArea.innerHTML = `<h1>Cargando...</h1>`;
            const link = document.querySelector(`#sidebar a[data-section="${section}"]`);
            if (link) {
                const linkClone = link.cloneNode(true);
                if (linkClone.querySelector('span')) {
                    linkClone.querySelector('span').remove();
                }
                document.getElementById('mobile-header-title').innerText = linkClone.innerText.trim();
                
                window.location.hash = section;
            }

            try {
                switch (section) {
                    case 'mi-perfil': await loadMiPerfil(); break; 
                    case 'registrar-visita': await loadRegistrarVisita(); break; 
                    case 'citas-pendientes': await loadCitasPendientes(); break;
                    case 'citas-aceptadas': await loadCitasAceptadas(); break;
                    case 'horario': await loadHorario(); break;
                    case 'configuracion': await loadConfiguracion(); break;
                    default: contentArea.innerHTML = '<h1>Sección no encontrada.</h1>';
                }
            } catch (error) {
                 console.warn("La carga de la sección fue detenida por un error previo.");
            }
        }
        
        // Actualizar el badge de citas
        async function updatePendingCitasBadge() {
            try {
                const citas = await apiFetch('/citas/pendientes');
                document.getElementById('citas-badge').textContent = citas.length;
            } catch (error) {
                console.warn("Error al actualizar badge:", error.message);
                document.getElementById('citas-badge').textContent = '!'; 
            }
        }
        
        
        // --- SECCIÓN 1: MI PERFIL ---
        async function loadMiPerfil() {
            if (!doctorProfileData) {
                await new Promise(resolve => setTimeout(resolve, 300)); 
                if (!doctorProfileData) {
                     contentArea.innerHTML = `<h1><i class="fas fa-user-circle"></i> Mi Perfil Profesional</h1>
                     <p style="color: var(--color-acento);">No se pudieron cargar los datos del perfil.</p>`;
                     return;
                }
            }
            const perfil = doctorProfileData;
            let estadoBadge = '';
            if (perfil.estado === 'Activo') {
                estadoBadge = `<span style="color: #28A745; background: #e9f7eb; padding: 5px 10px; border-radius: 15px; font-weight: bold;">${perfil.estado}</span>`;
            } else if (perfil.estado === 'Pendiente') {
                estadoBadge = `<span style="color: #FFA000; background: #fff8e1; padding: 5px 10px; border-radius: 15px; font-weight: bold;">${perfil.estado}</span>`;
            } else {
                 estadoBadge = `<span style="color: #DC3545; background: #fbe9e7; padding: 5px 10px; border-radius: 15px; font-weight: bold;">${perfil.estado || 'Desconocido'}</span>`;
            }
            let html = `
                <h1><i class="fas fa-user-circle"></i> Mi Perfil Profesional</h1>
                <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #e0e0e0;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px;">
                        <div class="data-group">
                            <h3><i class="fas fa-user"></i> Datos Personales</h3>
                            <p><strong>Nombre:</strong> ${perfil.nombre}</p>
                            <p><strong>Apellido:</strong> ${perfil.apellido}</p>
                            <p><strong>Cédula:</strong> ${perfil.cedula}</p>
                            <p><strong>Email:</strong> ${perfil.email}</p>
                        </div>
                        <div class="data-group">
                            <h3><i class="fas fa-briefcase-medical"></i> Datos Profesionales</h3>
                            <p><strong>Especialidad:</strong> ${perfil.especialidad}</p>
                            <p><strong>ID Colegiatura (MPPS):</strong> ${perfil.id_colegiatura}</p>
                            <p><strong>Estado de Cuenta:</strong> ${estadoBadge}</p>
                        </div>
                    </div>
                    ${perfil.estado === 'Pendiente' ? 
                        `<div style="margin-top: 30px; padding: 15px; background: #fff8e1; border-left: 5px solid #FFA000; border-radius: 5px; font-weight: bold;">
                            <i class="fas fa-exclamation-triangle"></i> <strong>Atención:</strong> Su cuenta aún está en estado "Pendiente". Un administrador debe verificar sus credenciales.
                        </div>` : 
                        (perfil.estado === 'Activo' ? 
                        `<div style="margin-top: 30px; padding: 15px; background: #e9f7eb; border-left: 5px solid #28A745; border-radius: 5px; font-weight: bold;">
                            <i class="fas fa-check-circle"></i> <strong>Estado:</strong> Su cuenta está "Activa".
                        </div>` : '')
                    }
                </div>
            `;
            contentArea.innerHTML = html;
        }

        // --- SECCIÓN 2: CITAS PENDIENTES ---
        async function loadCitasPendientes() {
            const citas = await apiFetch('/citas/pendientes');
            let html = `<h1><i class="fas fa-clock"></i> Citas Pendientes de Aprobación</h1>`;
            if (citas.length === 0) {
                html += '<table><tbody><tr><td class="empty-table">No tiene citas pendientes por aprobar.</td></tr></tbody></table>';
                contentArea.innerHTML = html;
                return;
            }
            html += `
                <table>
                    <thead><tr>
                        <th>Paciente</th><th>Fecha y Hora</th><th>Motivo</th><th>Acciones</th>
                    </tr></thead>
                    <tbody>
            `;
            citas.forEach(cita => {
                const fecha = new Date(cita.fecha_hora).toLocaleString('es-VE');
                html += `
                    <tr>
                        <td>${cita.paciente_nombre} ${cita.paciente_apellido}</td>
                        <td>${fecha}</td>
                        <td>${cita.motivo}</td>
                        <td>
                            <button class="btn-principal btn-principal-small" onclick="handleCitaAction(${cita.id_cita}, 'Aceptada')">Aceptar</button>
                            <button class="btn-rojo btn-rojo-small" onclick="handleCitaAction(${cita.id_cita}, 'Rechazada')">Rechazar</button>
                            <button class="btn-principal btn-principal-small" style="background: #555;" onclick="viewAntecedentes(${cita.id_paciente}, '${cita.paciente_nombre} ${cita.paciente_apellido}')">Ver Historial</button>
                        </td>
                    </tr>
                `;
            });
            html += `</tbody></table>`;
            contentArea.innerHTML = html;
        }
        
        async function handleCitaAction(id_cita, nuevo_estado) {
            // --- CORRECCIÓN: Usa el modal de confirmación ---
            const onConfirm = async () => {
                try {
                    await apiFetch(`/citas/${id_cita}`, {
                        method: 'PUT',
                        body: JSON.stringify({ nuevo_estado })
                    });
                    showToast(`Cita ${nuevo_estado.toLowerCase()} exitosamente.`, 'success');
                    loadCitasPendientes();
                    updatePendingCitasBadge();
                } catch (error) {
                    showToast(`Error al actualizar cita: ${error.message}`, 'error');
                }
            };

            openConfirmModal(
                `Confirmar ${nuevo_estado}`, 
                `¿Está seguro de ${nuevo_estado.toLowerCase()} esta cita?`,
                onConfirm
            );
        }
        
        // --- SECCIÓN 3: CITAS ACEPTADAS ---
        async function loadCitasAceptadas() {
            const citas = await apiFetch('/citas/aceptadas');
            let html = `<h1><i class="fas fa-calendar-check"></i> Próximas Citas Aceptadas</h1>`;
            if (citas.length === 0) {
                html += '<table><tbody><tr><td class="empty-table">No tiene citas aceptadas en su agenda.</td></tr></tbody></table>';
                contentArea.innerHTML = html;
                return;
            }
            html += `
                <table>
                    <thead><tr>
                        <th>Paciente</th><th>Fecha y Hora</th><th>Motivo</th><th>Acción</th>
                    </tr></thead>
                    <tbody>
            `;
            citas.forEach(cita => {
                const fecha = new Date(cita.fecha_hora).toLocaleString('es-VE');
                html += `
                    <tr>
                        <td>${cita.paciente_nombre} ${cita.paciente_apellido}</td>
                        <td>${fecha}</td>
                        <td>${cita.motivo}</td>
                        <td>
                            <button class="btn-principal btn-principal-small" onclick="viewAntecedentes(${cita.id_paciente}, '${cita.paciente_nombre} ${cita.paciente_apellido}')">Ver Historial</button>
                        </td>
                    </tr>
                `;
            });
            html += `</tbody></table>`;
            contentArea.innerHTML = html;
        }
        
        // --- SECCIÓN 4: HORARIO ---
        async function loadHorario() {
            const horario = await apiFetch('/horario');
            let html = `<h1><i class="fas fa-calendar-alt"></i> Gestionar Mi Horario</h1>`;
            html += `
                <form id="horario-form" style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #bde0fe;">
                    <h3 id="horario-form-title">Añadir Nuevo Día</h3>
                    <select id="dia_semana" required style="padding: 10px; margin-right: 10px; min-width: 150px;">
                        <option value="Lunes">Lunes</option>
                        <option value="Martes">Martes</option>
                        <option value="Miércoles">Miércoles</option>
                        <option value="Jueves">Jueves</option>
                        <option value="Viernes">Viernes</option>
                        <option value="Sábado">Sábado</option>
                        <option value="Domingo">Domingo</option>
                    </select>
                    <input type="time" id="hora_inicio" required style="padding: 8px; margin-right: 10px;">
                    <input type="time" id="hora_fin" required style="padding: 8px; margin-right: 10px;">
                    <button type="submit" class="btn-principal" id="btn-guardar-horario" style="padding: 10px 15px;">Guardar Día</button>
                    
                    <button type="button" class="btn-rojo" id="btn-limpiar-horario" style="display: none; padding: 10px 15px;" onclick="clearHorarioForm()">Cancelar Edición</button>
                </form>
            `;
            
            html += `
                <h3>Horario Registrado</h3>
                <table>
                    <thead><tr>
                        <th>Día</th>
                        <th>Hora de Inicio</th>
                        <th>Hora de Fin</th>
                        <th>Acciones</th> </tr></thead>
                    <tbody>
            `;
            
            if (horario.length === 0) {
                html += '<tr><td colspan="4" class="empty-table">No ha registrado su horario de disponibilidad.</td></tr>';
            } else {
                const diasOrdenados = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
                horario.sort((a, b) => diasOrdenados.indexOf(a.dia_semana) - diasOrdenados.indexOf(b.dia_semana));
                
                horario.forEach(dia => {
                    const params = `'${dia.dia_semana}', '${dia.hora_inicio}', '${dia.hora_fin}'`;
                    
                    html += `
                        <tr>
                            <td>${dia.dia_semana}</td>
                            <td>${dia.hora_inicio}</td>
                            <td>${dia.hora_fin}</td>
                            <td>
                                <button class="btn-principal btn-principal-small" onclick="populateHorarioForm(${params})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-rojo btn-rojo-small" onclick="handleDeleteHorario(${dia.id_horario})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
            html += `</tbody></table>`;
            contentArea.innerHTML = html;
            document.getElementById('horario-form').addEventListener('submit', handleSaveHorario);
        }

        async function handleSaveHorario(e) {
            e.preventDefault();
            const data = {
                dia_semana: document.getElementById('dia_semana').value,
                hora_inicio: document.getElementById('hora_inicio').value,
                hora_fin: document.getElementById('hora_fin').value
            };
            try {
                await apiFetch('/horario', { method: 'POST', body: JSON.stringify(data) });
                showToast('Horario guardado exitosamente.', 'success');
                loadHorario(); // Recargar
                clearHorarioForm(); // Limpia el formulario
            } catch (error) {
                showToast(`Error al guardar horario: ${error.message}`, 'error');
            }
        }
        
        function populateHorarioForm(dia_semana, hora_inicio, hora_fin) {
            document.getElementById('dia_semana').value = dia_semana;
            document.getElementById('hora_inicio').value = hora_inicio;
            document.getElementById('hora_fin').value = hora_fin;
            
            document.getElementById('horario-form-title').innerText = `Modificando: ${dia_semana}`;
            document.getElementById('btn-guardar-horario').innerText = 'Modificar Día';
            document.getElementById('btn-limpiar-horario').style.display = 'inline-block'; 
            
            document.getElementById('horario-form').scrollIntoView({ behavior: 'smooth' });
        }
        
        function clearHorarioForm() {
            document.getElementById('dia_semana').value = 'Lunes'; 
            document.getElementById('hora_inicio').value = '';
            document.getElementById('hora_fin').value = '';
            
            document.getElementById('horario-form-title').innerText = 'Añadir Nuevo Día';
            document.getElementById('btn-guardar-horario').innerText = 'Guardar Día';
            document.getElementById('btn-limpiar-horario').style.display = 'none'; 
        }

        async function handleDeleteHorario(id_horario) {
            // --- CORRECCIÓN: Usa el modal de confirmación ---
            const onConfirm = async () => {
                try {
                    await apiFetch(`/horario/${id_horario}`, { method: 'DELETE' });
                    showToast('Día de horario eliminado exitosamente.', 'success');
                    loadHorario(); 
                } catch (error) {
                    showToast(`Error al eliminar horario: ${error.message}`, 'error');
                }
            };
            
            openConfirmModal(
                'Confirmar Eliminación', 
                '¿Está seguro de eliminar este día de su horario? Esta acción no se puede deshacer.',
                onConfirm
            );
        }

        
        // --- SECCIÓN 5: CONFIGURACIÓN ---
        async function loadConfiguracion() {
            if (!doctorProfileData) {
                await loadDoctorProfile(); 
            }
            const email = doctorProfileData ? doctorProfileData.email : '';
            const telefono = doctorProfileData ? doctorProfileData.telefono : ''; 
            
            let html = `
                <h1><i class="fas fa-cog"></i> Configuración de Cuenta</h1>
                <div class="form-container">
                    <form id="config-form">
                        <h3>Datos de Contacto (Opcional)</h3>
                        <label for="new_email">Correo Electrónico:</label>
                        <input type="email" id="new_email" name="new_email" value="${email || ''}">
                        <label for="new_telefono">Teléfono:</label>
                        <input type="text" id="new_telefono" name="new_telefono" value="${telefono || ''}">

                        <h3 style="color: var(--color-acento);">
                            <i class="fas fa-lock"></i> Cambiar Contraseña
                        </h3>
                        <p style="font-size: 0.9em; color: #666;">
                            **Se requiere la Contraseña Actual para cualquier cambio.**
                        </p>
                        <label for="contrasena_actual">Contraseña Actual:</label>
                        <input type="password" id="contrasena_actual" name="contrasena_actual" required>
                        <label for="nueva_contrasena">Nueva Contraseña (Opcional):</label>
                        <input type="password" id="nueva_contrasena" name="nueva_contrasena" placeholder="Dejar vacío si no desea cambiarla">
                        <button type="submit" class="btn-principal" style="font-size: 1.1em;">Actualizar Datos de Acceso</button>
                    </form>
                </div>
            `;
            contentArea.innerHTML = html;
            document.getElementById('config-form').addEventListener('submit', handleUpdateDoctorData);
        }
        
        async function handleUpdateDoctorData(e) {
            e.preventDefault();
            const form = e.target;
            const data = {
                email: form.new_email.value.trim() || undefined,
                telefono: form.new_telefono.value.trim() || undefined,
                contrasena_actual: form.contrasena_actual.value,
                nueva_contrasena: form.nueva_contrasena.value.trim() || undefined
            };

            if (!data.contrasena_actual) {
                return showToast('Debe ingresar su Contraseña Actual.', 'error');
            }
            if (!data.email && !data.telefono && !data.nueva_contrasena) {
                return showToast('Ingrese un nuevo Email, Teléfono o Contraseña.', 'error');
            }

            try {
                const result = await apiFetch('/actualizar-usuario', { method: 'PUT', body: JSON.stringify(data) });
                showToast(result.message, 'success');
                if (result.requires_relogin) {
                    setTimeout(logout, 2000);
                } else {
                    form.contrasena_actual.value = '';
                    form.nueva_contrasena.value = '';
                    loadDoctorProfile(); 
                }
            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
            }
        }
        
        // --- SECCIÓN 6: REGISTRAR VISITA (Prescripción) ---
        async function loadRegistrarVisita() {
            currentPrescriptionLines = []; // Limpiar prescripción anterior
            
            let html = `
                <h1><i class="fas fa-file-medical"></i> Registrar Visita / Consulta</h1>
                <p>Genere una nueva visita, registre signos vitales y el récipe asociado.</p>
                <div class="form-container">
                    <form id="consulta-form">
                        
                        <h3><i class="fas fa-user-injured"></i> 1. Datos del Paciente</h3>
                        <label for="consulta-paciente">Paciente:</label>
                        <select id="consulta-paciente" required>
                            <option value="">Cargando pacientes...</option>
                        </select>
                        
                        <h3><i class="fas fa-stethoscope"></i> 2A. Evolución de la Visita</h3>
                        <label for="consulta-motivo">Motivo de Consulta:</label>
                        <textarea id="consulta-motivo" placeholder="Ej: Paciente refiere fiebre y dolor de garganta de 2 días de evolución..."></textarea>
                        
                        <label for="consulta-diagnostico">Diagnóstico Principal:</label>
                        <input type="text" id="consulta-diagnostico" placeholder="Ej: Faringoamigdalitis Aguda (J03.9)" required>
                        
                        <label for="consulta-notas">Notas de Evolución (SOAP):</label>
                        <textarea id="consulta-notas" placeholder="Subjetivo, Objetivo, Análisis, Plan..."></textarea>
                        
                        <h3 style="margin-top: 25px;"><i class="fas fa-heartbeat"></i> 2B. Signos Vitales</h3>
                        <div class="form-grid-vitals">
                            <div>
                                <label for="vital-presion">P. Arterial (mmHg):</label>
                                <input type="text" id="vital-presion" placeholder="Ej: 120/80">
                            </div>
                            <div>
                                <label for="vital-glicemia">Glicemia (mg/dL):</label>
                                <input type="number" id="vital-glicemia" placeholder="Ej: 90">
                            </div>
                            <div>
                                <label for="vital-saturacion">Sat. O₂ (%):</label>
                                <input type="number" id="vital-saturacion" placeholder="Ej: 98">
                            </div>
                            <div>
                                <label for="vital-temperatura">Temp. (°C):</label>
                                <input type="number" step="0.1" id="vital-temperatura" placeholder="Ej: 36.5">
                            </div>
                            <div>
                                <label for="vital-peso">Peso (Kg):</label>
                                <input type="number" step="0.01" id="vital-peso" placeholder="Ej: 70.5">
                            </div>
                            <div>
                                <label for="vital-talla">Talla (cm):</label>
                                <input type="number" id="vital-talla" placeholder="Ej: 175">
                            </div>
                        </div>
                        
                        <hr style="margin: 20px 0; border-color: var(--color-acento);">
                        
                        <h3><i class="fas fa-file-prescription"></i> 3. Récipē (Opcional)</h3>
                        <div id="presc-med-list" style="margin-bottom: 20px;">
                             <p style="text-align:center; color: #777;">Aún no se han agregado medicamentos.</p>
                        </div>
                        
                        <div style="background: #f0f4f8; padding: 15px; border-radius: 8px;">
                            <div class="form-grid" style="gap: 10px;">
                                <div style="grid-column: 1 / -1;">
                                    <label for="presc-med-nombre">Nombre del Medicamento:</label>
                                    <input type="text" id="presc-med-nombre" placeholder="Ej: Amoxicilina 500mg/5ml Susp.">
                                </div>
                                <div>
                                    <label for="presc-dosis">Dosis:</label>
                                    <input type="text" id="presc-dosis" placeholder="Ej: 5ml">
                                </div>
                                <div>
                                    <label for="presc-frecuencia">Frecuencia:</label>
                                    <input type="text" id="presc-frecuencia" placeholder="Ej: c/8h">
                                </div>
                                <div>
                                    <label for="presc-duracion">Duración:</label>
                                    <input type="text" id="presc-duracion" placeholder="Ej: 7 días">
                                </div>
                            </div>
                            <button type="button" class="btn-principal" onclick="addMedicationLine()">
                                <i class="fas fa-plus"></i> Agregar Medicamento
                            </button>
                        </div>
                        
                        <hr style="margin: 20px 0;">
                        
                        <label for="presc-observaciones">4. Observaciones de la Prescripción (Opcional):</label>
                        <textarea id="presc-observaciones" placeholder="Ej: Tomar con abundante agua."></textarea>
                        
                        <button type="submit" class="btn-submit-presc">
                            <i class="fas fa-save"></i> Guardar Visita
                        </button>
                    </form>
                </div>
            `;
            contentArea.innerHTML = html;
            
            try {
                const pacientes = await apiFetch('/pacientes');
                const selectPac = document.getElementById('consulta-paciente');
                selectPac.innerHTML = '<option value="">Seleccione un paciente...</option>';
                pacientes.forEach(p => {
                    selectPac.innerHTML += `<option value="${p.id_paciente}" data-nombre="${p.nombre} ${p.apellido}" data-cedula="${p.cedula}">
                        ${p.apellido}, ${p.nombre} (C.I: ${p.cedula})
                    </option>`;
                });
            } catch (e) {
                 document.getElementById('consulta-paciente').innerHTML = '<option value="">Error al cargar pacientes</option>';
            }
            
            document.getElementById('consulta-form').addEventListener('submit', handleSaveConsultaCompleta);
        }
        
        function addMedicationLine() {
            const medNombre = document.getElementById('presc-med-nombre').value;
            const dosis = document.getElementById('presc-dosis').value;
            const frecuencia = document.getElementById('presc-frecuencia').value;
            const duracion = document.getElementById('presc-duracion').value;

            if (!medNombre || !dosis || !frecuencia || !duracion) {
                showToast('Debe completar todos los campos del medicamento (Nombre, Dosis, Frecuencia, Duración)', 'error');
                return;
            }

            const line = {
                nombre_medicamento: medNombre, 
                dosis: dosis,
                frecuencia: frecuencia,
                duracion: duracion
            };
            
            currentPrescriptionLines.push(line);
            renderPrescriptionLines();
            
            document.getElementById('presc-med-nombre').value = '';
            document.getElementById('presc-dosis').value = '';
            document.getElementById('presc-frecuencia').value = '';
            document.getElementById('presc-duracion').value = '';
            document.getElementById('presc-med-nombre').focus();
        }
        
        function renderPrescriptionLines() {
            const listDiv = document.getElementById('presc-med-list');
            listDiv.innerHTML = '';
            if (currentPrescriptionLines.length === 0) {
                 listDiv.innerHTML = '<p style="text-align:center; color: #777;">Aún no se han agregado medicamentos.</p>';
                 return;
            }
            
            currentPrescriptionLines.forEach((line, index) => {
                listDiv.innerHTML += `
                    <div class="presc-line-item">
                        <div>
                            <strong>${index+1}. ${line.nombre_medicamento}</strong>
                            <span>${line.dosis} - ${line.frecuencia} - por ${line.duracion}</span>
                        </div>
                        <button type="button" class="btn-rojo btn-rojo-small" onclick="removeMedicationLine(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            });
        }
        
        function removeMedicationLine(index) {
            currentPrescriptionLines.splice(index, 1);
            renderPrescriptionLines();
        }
        
        // Guardar Consulta Completa y Generar PDF
        async function handleSaveConsultaCompleta(e) {
            e.preventDefault();
            
            const selectPac = document.getElementById('consulta-paciente');
            const selectedOption = selectPac.options[selectPac.selectedIndex];
            
            const dataToSave = {
                fk_paciente: selectPac.value,
                motivo_consulta: document.getElementById('consulta-motivo').value,
                diagnostico: document.getElementById('consulta-diagnostico').value,
                notas_evolucion: document.getElementById('consulta-notas').value,
                presion_arterial: document.getElementById('vital-presion').value,
                glicemia: document.getElementById('vital-glicemia').value,
                saturacion_oxigeno: document.getElementById('vital-saturacion').value,
                temperatura_c: document.getElementById('vital-temperatura').value,
                peso_kg: document.getElementById('vital-peso').value,
                talla_cm: document.getElementById('vital-talla').value,
                observaciones_prescripcion: document.getElementById('presc-observaciones').value,
                medicamentos: currentPrescriptionLines
            };
            
            const dataForPDF = {
                paciente_nombre: selectedOption.getAttribute('data-nombre'),
                paciente_cedula: selectedOption.getAttribute('data-cedula'),
                diagnostico: dataToSave.diagnostico,
                observaciones: dataToSave.observaciones_prescripcion,
                medicamentos: currentPrescriptionLines
            };

            // Validación (Prescripción ya no es obligatoria)
            if (!dataToSave.fk_paciente || !dataToSave.diagnostico) {
                showToast('Debe seleccionar un paciente y añadir un diagnóstico.', 'error');
                return;
            }
            
            try {
                const result = await apiFetch('/consulta-completa', {
                    method: 'POST',
                    body: JSON.stringify(dataToSave)
                });
                
                showToast(result.message, 'success');
                
                // Generar el PDF (Solo si hay medicamentos y se creó una prescripción)
                if (currentPrescriptionLines.length > 0 && result.id_prescripcion) {
                    generatePDF(dataForPDF, result.id_prescripcion, result.id_visita);
                }
                
                loadSection('registrar-visita'); 
                
            } catch (error) {
                 showToast(`Error al guardar: ${error.message}`, 'error');
            }
        }
        
        // --- FUNCIÓN DE GENERACIÓN DE PDF ---
        function generatePDF(data, prescripcionId, visitaId) {
            
            if (!doctorProfileData) {
                showToast('Error: No se pudieron cargar los datos del doctor para el PDF.', 'error');
                return;
            }
            
            try {
                const doc = new jsPDF();
                const doctor = doctorProfileData; 
                
                // 1. Encabezado
                doc.setFont("helvetica", "bold");
                doc.setFontSize(18);
                doc.setTextColor(...varColorToRGB(getComputedStyle(document.documentElement).getPropertyValue('--color-principal'))); 
                doc.text("Hospital General Dr. Adolfo D' Empaire", 105, 20, { align: 'center' });
                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.setTextColor(...varColorToRGB(getComputedStyle(document.documentElement).getPropertyValue('--color-texto-oscuro'))); 
                doc.text(String(`Dr(a). ${doctor.nombre || ''} ${doctor.apellido || ''}`), 105, 30, { align: 'center' });
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.text(String(`Especialidad: ${doctor.especialidad || 'N/A'}`), 105, 36, { align: 'center' });
                doc.text(String(`MPPS: ${doctor.id_colegiatura || 'N/A'}`), 105, 41, { align: 'center' });
                doc.setLineWidth(0.5);
                doc.setDrawColor(...varColorToRGB(getComputedStyle(document.documentElement).getPropertyValue('--color-acento'))); 
                doc.line(20, 45, 190, 45);

                // 2. Datos del Paciente
                const fecha = new Date().toLocaleDateString('es-VE');
                doc.setFontSize(11);
                doc.setFont("helvetica", "bold");
                doc.text("Paciente:", 20, 55);
                doc.setFont("helvetica", "normal");
                doc.text(String(data.paciente_nombre || 'N/A'), 40, 55);
                doc.setFont("helvetica", "bold");
                doc.text("C.I:", 130, 55);
                doc.setFont("helvetica", "normal");
                doc.text(String(data.paciente_cedula || 'N/A'), 138, 55);
                doc.setFont("helvetica", "bold");
                doc.text("Fecha:", 130, 62);
                doc.setFont("helvetica", "normal");
                doc.text(String(fecha), 142, 62);
                doc.setFont("helvetica", "bold");
                doc.text("ID Récipē:", 20, 62);
                doc.setFont("helvetica", "normal");
                doc.text(String(prescripcionId || 'N/A'), 55, 62); 

                // 3. Símbolo Récipē (Rx)
                doc.setFont("helvetica", "bold");
                doc.setFontSize(18); 
                doc.setTextColor(...varColorToRGB(getComputedStyle(document.documentElement).getPropertyValue('--color-principal'))); 
                doc.text("Rx", 20, 82); 
                doc.setDrawColor(...varColorToRGB(getComputedStyle(document.documentElement).getPropertyValue('--color-texto-oscuro'))); 
                doc.line(32, 82, 190, 82); 

                // 4. Tabla de Medicamentos
                const tableBody = data.medicamentos.map((med, index) => {
                    return [
                        String(`${index + 1}. ${med.nombre_medicamento || ''}`),
                        String(med.dosis || ''),
                        String(med.frecuencia || ''),
                        String(med.duracion || '')
                    ];
                });

                doc.autoTable({
                    startY: 85,
                    head: [['Medicamento', 'Dosis', 'Frecuencia', 'Duración']],
                    body: tableBody,
                    theme: 'grid',
                    headStyles: {
                        fillColor: varColorToRGB(getComputedStyle(document.documentElement).getPropertyValue('--color-principal')), 
                        textColor: [255, 255, 255]
                    },
                    styles: {
                        fontSize: 10,
                        cellPadding: 3,
                    },
                    margin: { left: 20, right: 20 }
                });

                // 5. Diagnóstico y Notas (después de la tabla)
                let finalY = doc.lastAutoTable.finalY + 10;
                
                const diagnosticoSeguro = String(data.diagnostico || '');
                if (diagnosticoSeguro.trim() !== '') {
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(11);
                    doc.text("Diagnóstico:", 20, finalY);
                    doc.setFont("helvetica", "normal");
                    doc.text(diagnosticoSeguro, 45, finalY, { maxWidth: 145 });
                    finalY += 15;
                }
                
                const observacionesSeguras = String(data.observaciones || '');
                if (observacionesSeguras.trim() !== '') {
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(11);
                    doc.text("Indicaciones Adicionales:", 20, finalY);
                    doc.setFont("helvetica", "normal");
                    doc.text(observacionesSeguras, 20, finalY + 5, { maxWidth: 170 });
                }

                // 6. Firma
                finalY = 260; 
                doc.setDrawColor(...varColorToRGB(getComputedStyle(document.documentElement).getPropertyValue('--color-texto-oscuro'))); 
                doc.line(60, finalY, 150, finalY);
                doc.setFont("helvetica", "bold");
                doc.text(String(`Dr(a). ${doctor.nombre || ''} ${doctor.apellido || ''}`), 105, finalY + 7, { align: 'center' });
                doc.setFont("helvetica", "normal");
                doc.text(String(`MPPS: ${doctor.id_colegiatura || 'N/A'}`), 105, finalY + 12, { align: 'center' });

                // 7. Guardar PDF
                doc.save(`Prescripcion-${data.paciente_cedula || 'PACIENTE'}-${prescripcionId || '000'}.pdf`);
            
            } catch (e) {
                console.error("Error al generar el PDF:", e);
                showToast(`Error al generar el PDF: ${e.message}`, 'error');
            }
        }
        
        // --- Helper para colores (Corregido) ---
        function varColorToRGB(colorString) {
            if (!colorString) return [0, 0, 0]; 
            const trimmedColor = colorString.trim(); 
            if (trimmedColor.startsWith('#')) {
                const hex = trimmedColor.substring(1);
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                return [r, g, b];
            }
            return [0, 0, 0];
        }

        // --- LÓGICA DEL MODAL (Pop-up) ---
        function openModal(title, bodyHtml) {
            modalTitle.innerText = title;
            modalBody.innerHTML = bodyHtml;
            // Configuración para un modal de "solo lectura"
            modalBtnConfirm.style.display = 'none'; // Ocultar botón de confirmar
            modalBtnCancel.innerText = 'Cerrar'; // Cambiar texto a "Cerrar"
            modal.style.display = 'flex';
        }
        
        // --- NUEVA FUNCIÓN: Modal de Confirmación ---
        function openConfirmModal(title, message, onConfirmCallback) {
            modalTitle.innerText = title;
            modalBody.innerHTML = `<p>${message}</p>`; // Mensaje de confirmación
            
            // Configuración para un modal de "confirmación"
            modalBtnConfirm.style.display = 'inline-block'; // Mostrar botón de confirmar
            modalBtnCancel.innerText = 'Cancelar';
            modalBtnConfirm.innerText = 'Sí, Eliminar'; // Texto del botón de confirmar
            
            modalBtnConfirm.onclick = () => {
                onConfirmCallback(); 
                closeModal(); 
            };
            
            modal.style.display = 'flex';
        }

        function closeModal() {
            modal.style.display = 'none';
        }

        // --- LÓGICA DEL MODAL (Opción 1: Antecedentes) ---
        async function viewAntecedentes(id_paciente, nombre) {
            openModal(`Antecedentes de: ${nombre}`, '<p>Cargando antecedentes...</p>');
            
            try {
                const data = await apiFetch(`/paciente/${id_paciente}/antecedentes`);
                const ant = data.antecedentes; 
                
                if (!ant) {
                    modalBody.innerHTML = `<p><strong>No se encontraron datos.</strong></p>`;
                    return;
                }
                
                modalBody.innerHTML = `
                    <h3 class="emergencia">
                        <i class="fas fa-ambulance"></i> Contacto de Emergencia
                    </h3>
                    <p><strong>Nombre:</strong> ${ant.contacto_emergencia_nombre || 'No registra'}</p>
                    <p><strong>Teléfono:</strong> ${ant.contacto_emergencia_telefono || 'No registra'}</p>
                    
                    <h3>
                        <i class="fas fa-file-medical"></i> Antecedentes Médicos (Reportados por Paciente)
                    </h3>
                    ${ant.message ? `<p><strong>${ant.message}</strong></p>` : ''}
                    <p><strong>Alergias (reportadas):</strong> ${ant.alergias || 'No registra'}</p>
                    <p><strong>Condición Crónica:</strong> ${ant.condicion_cronica || 'No registra'}</p>
                    <p><strong>Medicamentos Actuales:</strong> ${ant.medicamentos_actuales || 'No registra'}</p>
                    <p><strong>Cirugías Previas:</strong> ${ant.cirugia_previa || 'No registra'}</p>
                    <p><strong>Antecedentes Familiares:</strong> ${ant.antecedentes_familiares || 'No registra'}</p>
                    <p><strong>Tabaco:</strong> ${ant.habito_tabaco ? 'Sí' : 'No'}</p>
                    <p><strong>Alcohol:</strong> ${ant.habito_alcohol ? 'Sí' : 'No'}</p>
                `;

            } catch (error) {
                modalBody.innerHTML = `<p style="color: red;">Error al cargar el historial: ${error.message}</p>`;
            }
        }
        
        // --- LÓGICA DEL MODAL (Opción 2: Detalles de Visita/Prescripción) ---
        async function viewVisitaDetails(visita, tienePrescripcion) {
            const fecha = new Date(visita.fecha_visita).toLocaleString('es-VE');
            let bodyHtml = `
                <h3><i class="fas fa-stethoscope"></i> Datos de la Visita</h3>
                <p><strong>Fecha:</strong> ${fecha}</p>
                <p><strong>Diagnóstico:</strong> ${visita.diagnostico || 'N/A'}</p>
                <p><strong>Motivo:</strong> ${visita.motivo_consulta || 'N/A'}</p>
                <p><strong>Notas de Evolución:</strong> ${visita.notas_evolucion || 'N/A'}</p>
                
                <h3><i class="fas fa-heartbeat"></i> Signos Vitales</h3>
                <p><strong>P. Arterial:</strong> ${visita.presion_arterial || 'N/R'}</p>
                <p><strong>Glicemia:</strong> ${visita.glicemia || 'N/R'} mg/dL</p>
                <p><strong>Sat. O₂:</strong> ${visita.saturacion_oxigeno || 'N/R'} %</p>
                <p><strong>Temp:</strong> ${visita.temperatura_c || 'N/R'} °C</p>
                <p><strong>Peso/Talla:</strong> ${visita.peso_kg || 'N/R'} Kg / ${visita.talla_cm || 'N/R'} cm</p>
                
                <h3 class="emergencia"><i class="fas fa-file-prescription"></i> Récipē Asociado</h3>
            `;

            if (!tienePrescripcion) {
                bodyHtml += "<p>Esta visita no generó una prescripción.</p>";
                openModal(`Detalle de Visita (ID: ${visita.id_visita})`, bodyHtml);
                return;
            }

            try {
                const detalles = await apiFetch(`/prescripcion/${visita.id_visita}`);
                if (detalles.message || detalles.length === 0) {
                     bodyHtml += `<p>No se encontraron detalles de la prescripción.</p>`;
                } else {
                    bodyHtml += '<table style="width:100%;">';
                    detalles.forEach(med => {
                        bodyHtml += `
                            <tr>
                                <td style="padding: 5px;"><strong>${med.nombre_medicamento}</strong></td>
                                <td style="padding: 5px;">${med.dosis}</td>
                                <td style="padding: 5px;">${med.frecuencia}</td>
                                <td style="padding: 5px;">${med.duracion}</td>
                            </tr>
                        `;
                    });
                    bodyHtml += '</table>';
                    if(detalles[0] && detalles[0].observaciones) {
                         bodyHtml += `<p style="margin-top:10px;"><strong>Observaciones:</strong> ${detalles[0].observaciones}</p>`;
                    }
                }
            } catch (error) {
                 bodyHtml += `<p style="color: red;">Error al cargar el récipe: ${error.message}</p>`;
            }
            
            openModal(`Detalle de Visita (ID: ${visita.id_visita})`, bodyHtml);
        }

    </script>
