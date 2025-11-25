// ==============================================================================
// 1. IMPORTACIONES
// ==============================================================================
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer'); 
const path = require('path'); // <<<-- IMPORTACIÓN NECESARIA AÑADIDA
const fs = require('fs'); // <--- NUEVA IMPORTACIÓN PARA MANEJO DE ARCHIVOS
const multer = require('multer');
// ********************************************
// -> AÑADIR ESTO: IMPORTACIÓN DEL MÓDULO RENAL
// ********************************************

// ********************************************


















// 2. CONFIGURACIÓN INICIAL
// ==============================================================================
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON en las peticiones
app.use(express.json());

// Clave Secreta para JWT (¡CÁMBIALA EN PRODUCCIÓN!)
const jwtSecret = process.env.JWT_SECRET || 'SUPER_CLAVE_SECRETA_HOSPITAL_2025';

// ***************************************************************
// -> AÑADIR ESTO: CONEXIÓN DEL MÓDULO RENAL INTELIGENTE
// ***************************************************************

// 1. Servir los archivos estáticos (HTML/CSS) del nuevo módulo
// Esto permite que el navegador acceda a los HTML de /public_renal
app.use(express.static(path.join(__dirname, 'public_renal'))); 

// 2. Conectar las rutas del módulo bajo el prefijo '/renal'
// Todas las peticiones a /renal/... irán a tu archivo renal_routes.js
app.use('/renal', renalRoutes);



// 🔑 CONFIGURACIÓN DE ALMACENAMIENTO (MULTER) para Recetas
const uploadDir = path.join(__dirname, 'public', 'uploads', 'recetas');

// Crear el directorio si no existe
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Guarda los archivos en /public/uploads/recetas
    },
    filename: function (req, file, cb) {
        // Renombrar archivo: receta-usuarioID-timestamp.extension
        const extension = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const userId = req.user ? req.user.id : 'anon'; 
        cb(null, `receta-${userId}-${uniqueSuffix}${extension}`);
    }
});

// Filtro para aceptar solo imágenes y PDF (formato de receta)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no soportado. Solo se permiten imágenes o PDF.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // Límite de 5MB
    fileFilter: fileFilter 
});

// 🔑 CONFIGURACIÓN DE ALMACENAMIENTO (MULTER) para Laboratorios
const labDir = path.join(__dirname, 'public', 'uploads', 'laboratorios');
if (!fs.existsSync(labDir)) {
    fs.mkdirSync(labDir, { recursive: true });
}
const storageLab = multer.diskStorage({
    destination: (req, file, cb) => cb(null, labDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `lab-${req.user.id}-${uniqueSuffix}${extension}`);
    }
});
const uploadLab = multer({ storage: storageLab, limits: { fileSize: 1024 * 1024 * 10 } }); // Límite de 10MB

// 🔑 CONFIGURACIÓN DE ALMACENAMIENTO (MULTER) para Radiología
const radDir = path.join(__dirname, 'public', 'uploads', 'radiologia');
if (!fs.existsSync(radDir)) {
    fs.mkdirSync(radDir, { recursive: true });
}
const storageRad = multer.diskStorage({
    destination: (req, file, cb) => cb(null, radDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `rad-${req.user.id}-${uniqueSuffix}${extension}`);
    }
});
const uploadRad = multer({ storage: storageRad, limits: { fileSize: 1024 * 1024 * 25 } }); // Límite de 25MB para imágene



// ==============================================================================
// 3. CONFIGURACIÓN DE LA BASE DE DATOS (POSTGRESQL / PGADMIN4)
// ==============================================================================
// ¡ADVERTENCIA! Reemplaza los placeholders con tus credenciales reales.
// PEGA ESTE CÓDIGO NUEVO
const pool = new Pool({
    // 1. Esto lo usará en Internet (Render)
    connectionString: process.env.DATABASE_URL,
    
    // 2. Esto es requerido por Render para una conexión segura
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,

    // 3. Esto lo usará en tu PC (localhost) si no encuentra la URL
    ...(!process.env.DATABASE_URL && {
        user: 'postgres',
        host: 'localhost',
        database: 'hospital',
        password: 'Elvimar-15',
        port: 5432,
    })
});
// Verificación de Conexión
pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ Error al conectar a la base de datos:', err.stack);
    }
    console.log('✅ Conexión exitosa a la base de datos PostgreSQL.');
    release();
});


// ==============================================================================
// CÓDIGO CRÍTICO TEMPORAL: GENERADOR DE 140 CAMAS INICIALES
// ==============================================================================
// server.js (Reemplaza la función initializeCamas con este código completo)

async function initializeCamas() {
    // Definición de las constantes del hospital
    const totalCamas = 140;
    const totalCamasQuirofano = 7; 
    let successCount = 0;
    const ubicacion = 'Piso 1 - Sala General'; 
    const ubicacionQuirofano = 'Piso 2 - Recuperación Quirúrgica'; 

    try {
        const existingCamas = await pool.query('SELECT COUNT(*) FROM camas');
        
        // Verificación combinada de todas las camas
        if (parseInt(existingCamas.rows[0].count) >= (totalCamas + totalCamasQuirofano)) { 
            console.log(`\n🛏️ [CENSO DE CAMAS]: Ya existen ${existingCamas.rows[0].count} camas. No se generarán nuevas.`);
            return;
        }

        // 1. Lógica de generación de 140 camas generales (Si faltan)
        console.log(`\n🛏️ [CENSO DE CAMAS]: Generando ${totalCamas} camas generales (1-140)...`);
        for (let i = 1; i <= totalCamas; i++) {
            await pool.query(
                `INSERT INTO camas (numero_cama, estado, ubicacion) 
                 VALUES ($1, 'Libre', $2) 
                 ON CONFLICT (numero_cama) DO NOTHING;`, 
                [i.toString(), ubicacion]
            );
        }
        
        // 2. LÓGICA PARA GENERAR CAMAS DE QUIRÓFANO (Q1-Q7)
        console.log(`\n🔪 [CENSO DE QUIRÓFANO]: Generando ${totalCamasQuirofano} camas de quirófano (Q1-Q7)...`);
        for (let i = 1; i <= totalCamasQuirofano; i++) {
            try {
                // Se usa un prefijo "Q" + Número para que no haya conflicto con las 140 camas
                await pool.query(
                    `INSERT INTO camas (numero_cama, estado, ubicacion) 
                     VALUES ($1, 'Libre', $2) 
                     ON CONFLICT (numero_cama) DO NOTHING;`, 
                    [`Q${i}`, ubicacionQuirofano] // Número de cama: Q1, Q2, etc.
                );
                successCount++;
            } catch (error) {
                 console.error('Error al insertar cama de quirófano:', error.message);
            }
        }
        
        if (successCount > 0) {
            console.log(`✅ [CENSO DE CAMAS]: Se inicializaron las camas de quirófano correctamente.`);
        }

    } catch (err) {
        console.error('Error FATAL al inicializar camas:', err.message);
    }
}
initializeCamas();





















// ==============================================================================
// 4. CONFIGURACIÓN DE CORREO ELECTRÓNICO (NODEMAILER)
// ==============================================================================
// Configuración de un "transporter" SMTP (ejemplo con Gmail, usa credenciales seguras)
const transporter = nodemailer.createTransport({
    service: 'gmail', // O el servicio que uses (Outlook, Mailgun, etc.)
    auth: {
        user: 'yajureelvimar@gmail.com', // ¡Cámbialo!
        pass: 'kfdlisvyxbokcfiv' // ¡Cámbialo!
    }
});

/**
 * Función para enviar un correo
 * @param {string} to - Destinatario
 * @param {string} subject - Asunto del correo
 * @param {string} text - Cuerpo del correo (texto plano)
 * @param {string} html - Cuerpo del correo (HTML)
 */
const enviarCorreo = async (to, subject, html) => {
    try {
        await transporter.sendMail({
            from: '"Hospital Dr Adolfo D\' Empaire" <tu_correo_del_hospital@gmail.com>',
            to,
            subject,
            html,
        });
        console.log(`Correo enviado a: ${to}`);
    } catch (error) {
        console.error('Error al enviar el correo:', error);
    }
};


// ==============================================================================
// UTILERÍAS ADICIONALES
// ==============================================================================

/**
 * Convierte una cadena 'si'/'no' o un booleano a su valor booleano respectivo.
 * Esto resuelve el error "sintaxis de entrada no es válida para tipo boolean: «si»"
 * @param {string|boolean} str - El valor a convertir.
 * @returns {boolean}
 */
const toBoolean = (str) => {
    if (typeof str === 'boolean') return str;
    if (typeof str === 'string') {
        // Convierte 'si', 'Si', 'true', '1' a true.
        const lowerStr = str.toLowerCase().trim();
        return lowerStr === 'si' || lowerStr === 'true' || lowerStr === 't' || lowerStr === '1';
    }
    return false; // Cualquier otro valor (null, undefined, 'no', etc.) se considera false.
};


























// ==============================================================================
// 5. MIDDLEWARE DE AUTENTICACIÓN (PROTECCIÓN DE RUTAS)
// ==============================================================================

/**
 * Middleware para verificar JWT y añadir datos de usuario al request.
 * También verifica si el rol coincide con el rol(es) permitido(s).
 * @param {string|string[]} allowedRoles - Rol(es) permitido(s) para acceder a la ruta.
 */
const auth = (allowedRoles) => (req, res, next) => {
    // Obtener token del encabezado (revisar si usas 'Authorization' o 'x-auth-token')
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

    // Verificar si no hay token
    if (!token) {
        return res.status(401).json({ msg: 'No hay Token, acceso denegado' });
    }

    try {
        // Verificar token
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded.user; // Añadir datos de usuario (id, rol) al request

        // Verificar el rol
        if (!allowedRoles.includes(req.user.rol)) {
             return res.status(403).json({ msg: 'Acceso no autorizado para este rol' });
        }
        
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token no es válido' });
    }
};




// --- INICIO DE CORRECCIÓN: Funciones Helper para Horario ---

// Helper para convertir Día (Texto) a (Número)
const diaTextoANumero = (dia) => {
    switch (dia) {
        case 'Lunes': return 1;
        case 'Martes': return 2;
        case 'Miércoles': return 3;
        case 'Jueves': return 4;
        case 'Viernes': return 5;
        case 'Sábado': return 6;
        case 'Domingo': return 7;
        default: return 0; // Inválido
    }
};

// Helper para convertir Día (Número) a (Texto)
const diaNumeroATexto = (num) => {
    // Asegurarnos de que sea un número
    const diaNum = parseInt(num, 10);
     switch (diaNum) {
        case 1: return 'Lunes';
        case 2: return 'Martes';
        case 3: return 'Miércoles';
        case 4: return 'Jueves';
        case 5: return 'Viernes';
        case 6: return 'Sábado';
        case 7: return 'Domingo';
        default: return 'Día Inválido';
    }
};
// --- FIN DE CORRECCIÓN ---









// ==============================================================================
// 6. SERVICIO DE ARCHIVOS ESTÁTICOS Y RUTA RAÍZ
// ESTO ES LO QUE ESTABA FALTANDO Y CAUSABA EL "Cannot GET /"
// ==============================================================================

// **1. Servir archivos estáticos** (CSS, JS, imágenes, etc.) desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// **2. Ruta Raíz (/)** - Carga el index.html
// Cuando alguien accede a http://localhost:3000/, esta ruta se ejecuta.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// **3. Redireccionar rutas de paneles si se acceden directamente sin /api/**
// Esto ayuda si accidentalmente intentas acceder a /admin o /doctor
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/doctor.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'doctor.html'));
});

app.get('/patient.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'patient.html'));
});


// ==============================================================================
// 7. RUTAS DE AUTENTICACIÓN Y REGISTRO (Continúan las API)
// ==============================================================================

// Ruta: POST /api/auth/register
// Propósito: Registrar un nuevo usuario (Paciente o Doctor)
app.post('/api/auth/register', async (req, res) => {
// ... (Toda la lógica de registro que ya tenías) ...
    const { cedula, email, password, nombre, apellido, telefono, direccion_base, rol, id_colegiatura, especialidad } = req.body;
    
    // 1. Validar la complejidad de la contraseña (mínimo 8, Mayús, Minús, Número, Caracter)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ msg: 'La contraseña es débil. Debe cumplir con los requisitos.' });
    }

    try {
        // 2. Hashing de la Contraseña
        const salt = await bcrypt.genSalt(10);
        const contrasena_hash = await bcrypt.hash(password, salt);

        // 3. Obtener el rol_id
        const rol_name = rol === 'Doctor' ? 'Doctor' : 'Paciente'; 
        const rol_result = await pool.query('SELECT id_rol FROM roles WHERE nombre_rol = $1', [rol_name]);
        if (rol_result.rows.length === 0) return res.status(500).json({ msg: 'Error: Rol no encontrado.' });
        const fk_rol = rol_result.rows[0].id_rol;

        // 4. Insertar en la tabla 'usuarios'
        const userInsert = await pool.query(
            'INSERT INTO usuarios (cedula, email, contrasena_hash, nombre, apellido, telefono, direccion_base, fk_rol) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id_usuario, email, nombre',
            [cedula, email, contrasena_hash, nombre, apellido, telefono, direccion_base, fk_rol]
        );
        const { id_usuario, email: userEmail, nombre: userName } = userInsert.rows[0];

       // 5. Insertar en la tabla específica
        if (rol === 'Doctor') {
            
            // --- INICIO DE CORRECCIÓN ---
            // Primero, debemos encontrar el ID de la especialidad basado en el texto
            const especialidadResult = await pool.query(
                'SELECT id_especialidad FROM especialidades WHERE nombre_especialidad = $1',
                [especialidad] // 'especialidad' es el TEXTO (ej: "Cardiología") que viene del req.body
            );
            
            let fk_especialidad_id;
            if (especialidadResult.rows.length === 0) {
                // Si la especialidad no existe en la tabla 'especialidades', detenemos el registro.
                // (En un sistema más robusto, podrías insertarla aquí, pero por ahora lanzamos error)
                 return res.status(400).json({ msg: `Error: La especialidad "${especialidad}" no existe en la base de datos.` });
            }
            fk_especialidad_id = especialidadResult.rows[0].id_especialidad;
            
            // Ahora insertamos el ID (fk_especialidad_id) en la columna 'especialidad' de 'doctores'
            await pool.query(
                'INSERT INTO doctores (fk_usuario, id_colegiatura, especialidad, estado) VALUES ($1, $2, $3, $4)',
                [id_usuario, id_colegiatura, especialidad, 'Pendiente'] // Usamos el ID
            );
            // --- FIN DE CORRECCIÓN ---           
             // 
           // Notificación al doctor: Pendiente de activación
             await enviarCorreo(userEmail, 
                'Registro de Doctor Pendiente', 
                `<h2>Bienvenido Dr(a). ${userName}</h2><p>Su registro ha sido recibido. Estará <strong>pendiente de activación</strong> por el Administrador. Le notificaremos cuando pueda ingresar.</p>`
            );
        } else {
            // Rol Paciente
            await pool.query('INSERT INTO pacientes (fk_usuario) VALUES ($1)', [id_usuario]);
            
            // Correo de Bienvenida al Paciente
            await enviarCorreo(userEmail, 
                '¡Bienvenido al Hospital Dr Adolfo D\' Empaire!', 
                `<h2>¡Hola ${userName}!</h2><p>Gracias por registrarte en nuestro sistema. Ya puedes iniciar sesión para agendar tu primera cita.</p>`
            );
        }

        res.status(201).json({ msg: `Registro exitoso como ${rol}.` });

    } catch (err) {
        console.error(err.message);
        if (err.code === '23505') {
            return res.status(400).json({ msg: 'La cédula o el correo electrónico ya están registrados.' });
        }
        res.status(500).send('Error del servidor al registrar');
    }
});


// Ruta: POST /api/auth/login
// Propósito: Autenticar usuario y devolver JWT
app.post('/api/auth/login', async (req, res) => {
    const { cedula, password } = req.body;

    // ***************************************************************
    // 🔑 INICIO: BYPASS CRÍTICO PARA EL USUARIO DE PRUEBA (V7654321 / Admin@2025)
    // ***************************************************************
    let bypassSuccess = false;
    if (cedula === 'V7654321' && password === 'Admin@2025') {
        console.log('✅ BYPASS CRÍTICO ACTIVADO: Ingreso de usuario de prueba exitoso.');
        bypassSuccess = true;
    }
    // ***************************************************************
    // 🔑 FIN: BYPASS CRÍTICO
    // ***************************************************************

    try {
        // 1. Buscar usuario por cédula
        const user = await pool.query(
            `SELECT u.*, r.nombre_rol 
             FROM usuarios u 
             JOIN roles r ON u.fk_rol = r.id_rol 
             WHERE u.cedula = $1`, 
            [cedula]
        );

        if (user.rows.length === 0) {
            return res.status(401).json({ msg: 'Credenciales inválidas' });
        }

        const usuario = user.rows[0];

        // 2. Determinar si la validación pasó (por bypass o por bcrypt)
        let isMatch = bypassSuccess; 

        if (!isMatch) {
            isMatch = await bcrypt.compare(password, usuario.contrasena_hash);
        }

        if (!isMatch) {
            return res.status(401).json({ msg: 'Credenciales inválidas' });
        }
        
        // ==========================================================
        // --- INICIO DE LA CORRECCIÓN DE NEFRÓLOGO ---
        // ==========================================================
        
        // 3. Verificación adicional para Doctores: Estado Activo Y OBTENER ESPECIALIDAD
        let especialidad_doctor = null; // Variable para guardar la especialidad
        
        if (usuario.nombre_rol === 'Doctor') {
             // CORRECCIÓN: Pedimos 'estado' Y 'especialidad'
             const doctorData = await pool.query(
                'SELECT estado, especialidad FROM doctores WHERE fk_usuario = $1', 
                [usuario.id_usuario]
             );
             
             if (doctorData.rows.length === 0) {
                 return res.status(404).json({ msg: 'Error: Perfil de doctor no encontrado.' });
             }
             
             const doctor = doctorData.rows[0];

             if (doctor.estado !== 'Activo') {
                 return res.status(403).json({ msg: 'Su cuenta de Doctor está pendiente de activación. Estado: ' + doctor.estado });
             }
             
             // Guardamos la especialidad (Ej: "Nefrología")
             especialidad_doctor = doctor.especialidad; 
        }
        // ==========================================================
        // --- FIN DE LA CORRECCIÓN DE NEFRÓLOGO ---
        // ==========================================================

        // 4. Generar JSON Web Token (JWT)
        const payload = {
            user: {
                id: usuario.id_usuario,
                rol: usuario.nombre_rol
            },
        };

        jwt.sign(
            payload,
            jwtSecret,
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                
                // CORRECCIÓN FINAL: Enviamos la especialidad al frontend
                res.json({ 
                    token, 
                    rol: usuario.nombre_rol,
                    especialidad: especialidad_doctor // Enviamos la especialidad (será 'Nefrología' o null)
                });
            }
        );
    } catch (err) {
        console.error(err.message);
        if (err.code === '23505') {
            return res.status(400).json({ msg: 'La cédula o el correo electrónico ya están registrados.' });
        }
        res.status(500).send('Error del servidor al registrar');
    }
});
// ==============================================================================
// 4. FUNCIONES AUXILIARES (Definición Única y Centralizada)
// ==============================================================================

/** * Obtiene el ID del Paciente dado el fk_usuario. 
 * Lanza un error si no encuentra el paciente.
 * * @param {number} fk_usuario - El ID de usuario (desde req.user.id).
 * @returns {number} El id_paciente.
 */
const getPacienteId = async (fk_usuario) => {
    // ESTA ES LA FUNCIÓN CORRECTA QUE DEBE USAR
    const pacienteResult = await pool.query('SELECT id_paciente FROM pacientes WHERE fk_usuario = $1', [fk_usuario]);
    
    if (pacienteResult.rows.length === 0) {
        throw new Error('Paciente no registrado en la tabla de pacientes.'); 
    }
    return pacienteResult.rows[0].id_paciente;
};




// Asegúrate de que tu función de ayuda para obtener el ID del paciente esté definida:
/* async function getPacienteId(fk_usuario) {
    const res = await pool.query('SELECT id_paciente FROM pacientes WHERE fk_usuario = $1', [fk_usuario]);
    return res.rows[0]?.id_paciente;
}
*/

// ------------------------------------------------------------------------------
// 7.6 Notificaciones - CONTEO RÁPIDO (NUEVO ENDPOINT)
// ------------------------------------------------------------------------------
// Ruta: GET /api/paciente/notificaciones/count
// Cuenta los eventos importantes (Aceptada/Rechazada/Procesada/Entregada) de las últimas 24h.
app.get('/api/paciente/notificaciones/count', auth(['Paciente']), async (req, res) => {
    try {
        const fk_paciente = await getPacienteId(req.user.id);
        
        // Obtenemos la fecha de hace 24 horas para un conteo "fresco"
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        // 1. Conteo de Citas (Aceptada/Rechazada) en las últimas 24h
        const citasCount = await pool.query(`
            SELECT COUNT(*) AS count
            FROM citas c
            WHERE c.fk_paciente = $1 
              AND c.estado_cita IN ('Aceptada', 'Rechazada')
              AND c.fecha_hora_consulta >= $2
        `, [fk_paciente, yesterday.toISOString()]);
        
        // 2. Conteo de Medicamentos (Procesada/Entregada) en las últimas 24h
        const recetasCount = await pool.query(`
            SELECT COUNT(*) AS count
            FROM solicitudes_medicamentos s
            WHERE s.fk_paciente = $1 
              AND s.estado IN ('Procesada', 'Entregada')
              AND s.fecha_solicitud >= $2
        `, [fk_paciente, yesterday.toISOString()]);

        const totalCount = parseInt(citasCount.rows[0].count) + parseInt(recetasCount.rows[0].count);

        // Devolvemos el conteo total de notificaciones "frescas"
        res.json({ count: totalCount });

    } catch (err) {
        console.error('Error al obtener conteo de notificaciones:', err.message);
        res.status(500).json({ msg: 'Error del servidor al obtener el conteo.' });
    }
});




// server.js




// ==============================================================================
// 8. RUTAS PÚBLICAS DE CONSULTA
// ==============================================================================

// Ruta: GET /api/public/doctores/:especialidad
// **CORREGIDA: Resuelve el error 500 al obtener doctores.**
app.get('/api/public/doctores/:especialidad', async (req, res) => {
    const especialidad = decodeURIComponent(req.params.especialidad);

    try {
        const result = await pool.query(`
            SELECT 
                u.nombre, 
                u.apellido, 
                d.id_doctor, 
                d.especialidad
            FROM doctores d
            JOIN usuarios u ON d.fk_usuario = u.id_usuario
            WHERE d.especialidad = $1 AND d.estado = 'Activo'
            ORDER BY u.apellido, u.nombre
        `, [especialidad]);

        res.json(result.rows);

    } catch (err) {
        console.error('❌ Error al obtener doctores por especialidad:', err.message);
        res.status(500).json({ msg: 'Error interno del servidor al consultar doctores.' });
    }
});

// Ruta: GET /api/public/especialidades
// Propósito: Obtener lista de especialidades
app.get('/api/public/especialidades', async (req, res) => {
    try {
        // --- INICIO DE CORRECCIÓN ---
        // Leemos de la tabla 'especialidades'
        const result = await pool.query(`
            SELECT nombre_especialidad 
            FROM especialidades
            ORDER BY nombre_especialidad
        `);
        // Devuelve solo el array de nombres
        res.json(result.rows.map(row => row.nombre_especialidad)); 
        // --- FIN DE CORRECCIÓN ---
    } catch (err) {
        console.error('Error al obtener especialidades:', err.message);
        res.status(500).json({ msg: 'Error del servidor al obtener especialidades.' });
    }
});




// ==============================================================================
// X. RUTA PÚBLICA NUEVA (Para Horario de Doctor)
// ==============================================================================

// Ruta: GET /api/public/doctor/:id_doctor/horario
// Propósito: Obtener el horario general (Lunes, Martes, etc.) de un doctor específico.
// Esta ruta es pública y la usará el paciente al agendar cita.
app.get('/api/public/doctor/:id_doctor/horario', async (req, res) => {
    const { id_doctor } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                dia_semana, 
                TO_CHAR(hora_inicio, 'HH24:MI') AS hora_inicio, 
                TO_CHAR(hora_fin, 'HH24:MI') AS hora_fin
            FROM horarios_doctor
            WHERE fk_doctor = $1
            ORDER BY dia_semana ASC -- Ordena de Lunes (1) a Domingo (7)
        `, [id_doctor]);

        // Convertir el número (dia_semana) de la DB a Texto ("Lunes")
        const horarioConvertido = result.rows.map(dia => ({
            ...dia,
            dia_semana: diaNumeroATexto(dia.dia_semana) // Usando la función helper que ya tienes
        }));

        res.json(horarioConvertido);

    } catch (err) {
        console.error('Error al obtener horario público de doctor:', err.message);
        res.status(500).json({ message: 'Error del servidor al obtener el horario.' });
    }
});

// Helper de conversión (Asegúrate de que esté definido en tu server.js, 
// ya lo tenías cerca de las rutas del doctor)



































// ------------------------------------------------------------------------------
// 7.1 Datos de Perfil (GET/PUT)
// ------------------------------------------------------------------------------

// Ruta: GET /api/paciente/datos (CORREGIDA: Incluye Contacto de Emergencia)
app.get('/api/paciente/datos', auth(['Paciente']), async (req, res) => {
    const fk_usuario = req.user.id;
    try {
        const result = await pool.query(`
            SELECT 
                u.nombre, u.apellido, u.cedula, u.email, u.telefono, u.direccion_base,
                p.datos_socioeconomicos, p.datos_estudio, p.direccion_detallada,
                p.contacto_emergencia_nombre,  -- NUEVO CAMPO AÑADIDO
                p.contacto_emergencia_telefono  -- NUEVO CAMPO AÑADIDO
            FROM usuarios u
            JOIN pacientes p ON u.id_usuario = p.fk_usuario
            WHERE u.id_usuario = $1
        `, [fk_usuario]);
        if (result.rows.length === 0) return res.status(404).json({ msg: 'Datos no encontrados.' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error al obtener datos del paciente:', err.message);
        res.status(500).json({ msg: 'Error del servidor al obtener datos.' });
    }
});
// ==============================================================================
// 7.2 RUTAS DEL PANEL DE PACIENTE: PUT /api/paciente/datos (Guardar Datos Modificables)
// ==============================================================================
// Ruta: PUT /api/paciente/datos (CORREGIDA: Incluye Guardado de Contacto de Emergencia)
app.put('/api/paciente/datos', auth(['Paciente']), async (req, res) => {
    // 🚨 CAMPOS DE CONTACTO DE EMERGENCIA AÑADIDOS A LA DESESTRUCTURACIÓN
    const { direccion_detallada, datos_socioeconomicos, datos_estudio, contacto_emergencia_nombre, contacto_emergencia_telefono } = req.body; 
    try {
        const fk_paciente = await getPacienteId(req.user.id);
        await pool.query(
            // 🚨 CONSULTA SQL ACTUALIZADA CON LOS NUEVOS CAMPOS
            `UPDATE pacientes SET 
                direccion_detallada = $1, 
                datos_socioeconomicos = $2, 
                datos_estudio = $3,
                contacto_emergencia_nombre = $5,  -- Posición $5
                contacto_emergencia_telefono = $6  -- Posición $6
            WHERE id_paciente = $4`,
            [direccion_detallada, datos_socioeconomicos, datos_estudio, fk_paciente, contacto_emergencia_nombre, contacto_emergencia_telefono]
        );
        res.json({ msg: 'Datos de perfil actualizados exitosamente.' });
    } catch (err) {
        console.error('Error al actualizar datos del paciente:', err.message);
        res.status(500).json({ msg: 'Error del servidor al actualizar datos.' });
    }
});
// ------------------------------------------------------------------------------
// 7.2 Antecedentes Médicos (GET/PUT)
// ------------------------------------------------------------------------------

// Ruta: GET /api/paciente/antecedentes
app.get('/api/paciente/antecedentes', auth(['Paciente']), async (req, res) => {
    try {
        const fk_paciente = await getPacienteId(req.user.id);
        const antecedentes = await pool.query(`
            SELECT * FROM antecedentes_paciente
            WHERE fk_paciente = $1
        `, [fk_paciente]);
        res.json(antecedentes.rows[0] || {}); 
    } catch (err) {
        console.error('Error al obtener antecedentes:', err.message);
        res.status(500).json({ msg: 'Error del servidor al obtener antecedentes.' });
    }
});

// Ruta: PUT /api/paciente/antecedentes (CORREGIDA: Soluciona el Error 500 de Booleanos)
app.put('/api/paciente/antecedentes', auth(['Paciente']), async (req, res) => {
    const { habito_alcohol, habito_tabaco, alergias, antecedentes_familiares, cirugia_previa, medicamentos_actuales, condicion_cronica } = req.body;
    try {
        const fk_paciente = await getPacienteId(req.user.id);
        
        // 🚨 APLICAR toBoolean A LOS CAMPOS BOOLEANOS (Alcohol y Tabaco)
        const alcoholBool = toBoolean(habito_alcohol);
        const tabacoBool = toBoolean(habito_tabaco);
        
        const updateResult = await pool.query(
            `UPDATE antecedentes_paciente SET 
                habito_alcohol = $1, habito_tabaco = $2, alergias = $3, 
                antecedentes_familiares = $4, cirugia_previa = $5, 
                medicamentos_actuales = $6, condicion_cronica = $7
            WHERE fk_paciente = $8 RETURNING *`,
            [alcoholBool, tabacoBool, alergias, antecedentes_familiares, cirugia_previa, medicamentos_actuales, condicion_cronica, fk_paciente] // Usar las variables booleanas
        ); 
        
        if (updateResult.rows.length === 0) { 
            // Si no existía, insertamos
            await pool.query(
                `INSERT INTO antecedentes_paciente (fk_paciente, habito_alcohol, habito_tabaco, alergias, antecedentes_familiares, cirugia_previa, medicamentos_actuales, condicion_cronica) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [fk_paciente, alcoholBool, tabacoBool, alergias, antecedentes_familiares, cirugia_previa, medicamentos_actuales, condicion_cronica] // Usar las variables booleanas
            ); 
            return res.json({ msg: 'Antecedentes médicos registrados por primera vez.' }); 
        } 

        res.json({ msg: 'Antecedentes médicos actualizados exitosamente.' }); 

    } catch (err) {
        console.error('Error al actualizar/insertar antecedentes:', err.message);
        res.status(500).json({ msg: 'Error del servidor al actualizar antecedentes.' });
    }
});

// ------------------------------------------------------------------------------
// 7.3 Citas Médicas (Historial CORREGIDO)
// ------------------------------------------------------------------------------

// Ruta: GET /api/paciente/citas/historial (LA RUTA QUE FALLABA)
app.get('/api/paciente/citas/historial', auth(['Paciente']), async (req, res) => {
    try {
        const fk_paciente = await getPacienteId(req.user.id);
        
        // **CONSULTA SQL CORREGIDA:** Incluye JOINs para Doctor y Especialidad
        const historialCitas = await pool.query(`
            SELECT 
                c.id_cita, 
                c.fecha_hora_consulta, 
                c.motivo_consulta, 
                c.estado_cita,
                u.nombre AS doctor_nombre,
                u.apellido AS doctor_apellido,
                d.especialidad
            FROM citas c
            JOIN doctores d ON c.fk_doctor = d.id_doctor
            JOIN usuarios u ON d.fk_usuario = u.id_usuario
            WHERE c.fk_paciente = $1
            ORDER BY c.fecha_hora_consulta DESC
        `, [fk_paciente]);
        
        // Si el servidor llega aquí, significa que la consulta fue exitosa.
        res.json(historialCitas.rows);
        
    } catch (err) {
        console.error('Error al obtener historial de citas (SQL):', err.message);
        // MENSAJE CLARO PARA TI:
        res.status(500).json({ msg: 'Error del servidor al obtener historial de citas. Revise la consulta SQL y la existencia de las tablas (citas, doctores, usuarios).' });
    }
});

// Ruta: POST /api/paciente/citas/agendar (NUEVA RUTA DE ACCIÓN)
app.post('/api/paciente/citas/agendar', auth(['Paciente']), async (req, res) => {
    const { id_doctor, fecha_hora, motivo_consulta } = req.body;
    
    if (!id_doctor || !fecha_hora || !motivo_consulta) {
        return res.status(400).json({ msg: 'Faltan campos obligatorios para agendar la cita.' });
    }
    
    try {
        const fk_paciente = await getPacienteId(req.user.id);

        // Insertar nueva cita con estado 'Pendiente'
        const newCita = await pool.query(
            'INSERT INTO citas (fk_paciente, fk_doctor, fecha_hora_consulta, motivo_consulta, estado_cita) VALUES ($1, $2, $3, $4, $5) RETURNING id_cita',
            [fk_paciente, id_doctor, fecha_hora, motivo_consulta, 'Pendiente']
        );
        
        res.status(201).json({ msg: `Cita solicitada. Pendiente de confirmación del doctor. ID: ${newCita.rows[0].id_cita}` });
        
    } catch (err) {
        console.error('Error al agendar cita:', err.message);
        res.status(500).json({ msg: 'Error del servidor al agendar cita.' });
    }
});


// ==============================================================================
// 7.4 Solicitudes de Medicamentos (Historial DETALLADO)
// ==============================================================================

// Ruta: GET /api/paciente/medicamentos/solicitud
app.get('/api/paciente/medicamentos/solicitud', auth(['Paciente']), async (req, res) => {
    try {
        const fk_paciente = await getPacienteId(req.user.id);
        const historialSolicitudes = await pool.query(`
            SELECT 
                s.id_solicitud, 
                s.fecha_solicitud, 
                s.receta_adjunta, 
                s.estado, 
                s.descripcion_solicitud, -- Nuevo campo para el detalle del medicamento
                u_proc.nombre AS procesa_nombre, 
                u_proc.apellido AS procesa_apellido
            FROM solicitudes_medicamentos s
            -- LEFT JOIN con la nueva columna, asumiendo que el usuario procesador (doctor/admin) está en la tabla 'usuarios'
            LEFT JOIN usuarios u_proc ON s.fk_usuario_procesa = u_proc.id_usuario 
            WHERE s.fk_paciente = $1 
            ORDER BY s.fecha_solicitud DESC
        `, [fk_paciente]);
        res.json(historialSolicitudes.rows);
    } catch (err) {
        console.error('Error al obtener historial de solicitudes (SQL):', err.message);
        res.status(500).json({ msg: 'Error del servidor al obtener historial de solicitudes. Revise la consulta SQL.' });
    }
});
// Ruta: POST /api/paciente/medicamentos/solicitar (NUEVA RUTA DE ACCIÓN CON MULTER)
// Importante: La función 'upload' debe ser definida con multer en las importaciones
app.post('/api/paciente/medicamentos/solicitar', auth(['Paciente']), upload.single('receta_adjunta'), async (req, res) => {
    // 'receta_adjunta' debe coincidir con el atributo `name` del input file en el HTML.
    
    const nota_solicitud = req.body.nota_solicitud || 'Sin nota de solicitud.';
    
    if (!req.file) {
        return res.status(400).json({ msg: 'Se requiere adjuntar la receta médica (archivo válido). Falló la subida.' });
    }
    
    const receta_adjunta = req.file.filename; // Nombre único generado por Multer
    
    try {
        const fk_paciente = await getPacienteId(req.user.id);

        await pool.query(
            `INSERT INTO solicitudes_medicamentos (fk_paciente, receta_adjunta, descripcion_solicitud, estado, fecha_solicitud) 
             VALUES ($1, $2, $3, $4, NOW())`, // Añadido NOW() si no lo hace por defecto
            [fk_paciente, receta_adjunta, nota_solicitud, 'Pendiente']
        );

        res.status(201).json({ msg: 'Solicitud de medicamentos recibida y pendiente de revisión.' });
        
    } catch (err) {
        console.error('Error al solicitar medicamentos:', err.message);
        // Si el error 500 es por el insert, el usuario lo verá.
        res.status(500).json({ msg: 'Error del servidor al procesar la solicitud de medicamentos.' });
    }
});


// Ruta: GET /api/paciente/notificaciones/count
// Cuenta los eventos importantes (Aceptada/Rechazada/Procesada/Entregada) del día de hoy.
app.get('/api/paciente/notificaciones/count', auth(['Paciente']), async (req, res) => {
    try {
        const fk_paciente = await getPacienteId(req.user.id);
        
        // Obtenemos la fecha de hace 24 horas para un conteo "fresco"
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        // 1. Conteo de Citas (Aceptada/Rechazada) en las últimas 24h
        const citasCount = await pool.query(`
            SELECT COUNT(*) AS count
            FROM citas c
            WHERE c.fk_paciente = $1 
              AND c.estado_cita IN ('Aceptada', 'Rechazada')
              AND c.fecha_hora_consulta >= $2
        `, [fk_paciente, yesterday.toISOString()]);
        
        // 2. Conteo de Medicamentos (Procesada/Entregada) en las últimas 24h
        const recetasCount = await pool.query(`
            SELECT COUNT(*) AS count
            FROM solicitudes_medicamentos s
            WHERE s.fk_paciente = $1 
              AND s.estado IN ('Procesada', 'Entregada')
              AND s.fecha_solicitud >= $2
        `, [fk_paciente, yesterday.toISOString()]);

        const totalCount = parseInt(citasCount.rows[0].count) + parseInt(recetasCount.rows[0].count);

        // Devolvemos el conteo total de notificaciones "frescas"
        res.json({ count: totalCount });

    } catch (err) {
        console.error('Error al obtener conteo de notificaciones:', err.message);
        res.status(500).json({ msg: 'Error del servidor al obtener el conteo.' });
    }
});

// Ruta: GET /api/paciente/notificaciones/count
// Cuenta los eventos importantes (Aceptada/Rechazada/Procesada/Entregada) del día de hoy.
app.get('/api/paciente/notificaciones/count', auth(['Paciente']), async (req, res) => {
    try {
        const fk_paciente = await getPacienteId(req.user.id);
        
        // Obtenemos la fecha de hace 24 horas para un conteo "fresco"
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        // 1. Conteo de Citas (Aceptada/Rechazada) en las últimas 24h
        const citasCount = await pool.query(`
            SELECT COUNT(*) AS count
            FROM citas c
            WHERE c.fk_paciente = $1 
              AND c.estado_cita IN ('Aceptada', 'Rechazada')
              AND c.fecha_hora_consulta >= $2
        `, [fk_paciente, yesterday.toISOString()]);
        
        // 2. Conteo de Medicamentos (Procesada/Entregada) en las últimas 24h
        const recetasCount = await pool.query(`
            SELECT COUNT(*) AS count
            FROM solicitudes_medicamentos s
            WHERE s.fk_paciente = $1 
              AND s.estado IN ('Procesada', 'Entregada')
              AND s.fecha_solicitud >= $2
        `, [fk_paciente, yesterday.toISOString()]);

        const totalCount = parseInt(citasCount.rows[0].count) + parseInt(recetasCount.rows[0].count);

        // Devolvemos el conteo total de notificaciones "frescas"
        res.json({ count: totalCount });

    } catch (err) {
        console.error('Error al obtener conteo de notificaciones:', err.message);
        res.status(500).json({ msg: 'Error del servidor al obtener el conteo.' });
    }
});




// Ruta: GET /api/paciente/notificaciones/list (MODIFICADA para incluir Alertas Globales)
app.get('/api/paciente/notificaciones/list', auth(['Paciente']), async (req, res) => {
    try {
        const fk_paciente = await getPacienteId(req.user.id);

        if (!fk_paciente) {
             return res.status(400).json({ msg: 'Usuario no asociado a un paciente válido.' });
        }
        
        // --- 1. Notificaciones de CITAS (Personales) ---
        const citasNotificaciones = await pool.query(`
            SELECT 'cita' AS origen, c.id_cita AS id_evento,
                   'Tu cita ha sido ' || LOWER(c.estado_cita) AS titulo,
                   'Con ' || COALESCE(u.nombre || ' ' || u.apellido, 'Doctor') || ' el ' || 
                   TO_CHAR(c.fecha_hora_consulta, 'DD/MM/YYYY HH24:MI') || '.' AS cuerpo,
                   c.estado_cita AS tipo_estado,
                   c.fecha_hora_consulta AS fecha_relevante
            FROM citas c
            LEFT JOIN doctores d ON c.fk_doctor = d.id_doctor
            LEFT JOIN usuarios u ON d.fk_usuario = u.id_usuario
            WHERE c.fk_paciente = $1 AND c.estado_cita IN ('Aceptada', 'Rechazada')
            ORDER BY c.fecha_hora_consulta DESC LIMIT 5
        `, [fk_paciente]);
        
        // --- 2. Notificaciones de MEDICAMENTOS (Personales) ---
        const recetasNotificaciones = await pool.query(`
            SELECT 'medicamento' AS origen, s.id_solicitud AS id_evento,
                   'Solicitud ' || s.estado AS titulo,
                   'Tu solicitud (' || s.id_solicitud || ') ha sido ' || LOWER(s.estado) || '.' AS cuerpo,
                   s.estado AS tipo_estado,
                   s.fecha_solicitud AS fecha_relevante
            FROM solicitudes_medicamentos s
            WHERE s.fk_paciente = $1 AND s.estado IN ('Procesada', 'Entregada', 'Rechazada')
            ORDER BY s.fecha_solicitud DESC LIMIT 5
        `, [fk_paciente]);

        // --- 3. Notificaciones de ALERTAS (Globales) ---
        const globalNotificaciones = await pool.query(`
            SELECT 'alerta_global' AS origen, id_notificacion_global AS id_evento,
                   titulo,
                   mensaje AS cuerpo,
                   nivel_gravedad AS tipo_estado,
                   fecha_creacion AS fecha_relevante
            FROM notificaciones_globales
            WHERE fecha_creacion >= NOW() - INTERVAL '7 days' -- Solo alertas de la última semana
            ORDER BY fecha_creacion DESC LIMIT 5
        `);

        // --- 4. Combinar y Ordenar ---
        let notificaciones = [
            ...citasNotificaciones.rows, 
            ...recetasNotificaciones.rows, 
            ...globalNotificaciones.rows
        ];
        
        // Ordenar todas por fecha (la más reciente primero)
        notificaciones.sort((a, b) => new Date(b.fecha_relevante) - new Date(a.fecha_relevante));
        
        // Limitar al total de notificaciones (ej. 10)
        const finalNotifications = notificaciones.slice(0, 10).map(n => ({
            origen: n.origen,
            id_evento: n.id_evento,
            titulo: n.titulo,
            cuerpo: n.cuerpo,
            tipo_estado: n.tipo_estado,
            fecha_relevante: n.fecha_relevante.toISOString(),
        }));

        res.json(finalNotifications);

    } catch (err) {
        console.error('SERVER ERROR (notificaciones/list):', err.message);
        res.status(500).json({ msg: 'Error del servidor al obtener la lista de notificaciones.' });
    }
});
// ------------------------------------------------------------------------------
// 7.6 Gestión de Familiares/Menores (Implementación real con tu DDL)
// ------------------------------------------------------------------------------

// Ruta: GET /api/paciente/familiares (CORREGIDA)
app.get('/api/paciente/familiares', auth(['Paciente']), async (req, res) => {
    try {
        const fk_paciente = await getPacienteId(req.user.id);
        const familiares = await pool.query(`
            SELECT id_familiar, cedula, nombre, apellido, fecha_nacimiento, relacion
            FROM familiares
            WHERE fk_paciente = $1
            ORDER BY apellido
        `, [fk_paciente]);
        
        res.json(familiares.rows);

    } catch (err) {
        console.error('Error al obtener familiares:', err.message);
        res.status(500).json({ msg: 'Error del servidor al obtener familiares.' });
    }
});

// Ruta: POST /api/paciente/familiares (Implementación real)
app.post('/api/paciente/familiares', auth(['Paciente']), async (req, res) => {
    const { nombre, apellido, cedula, parentesco, fecha_nacimiento } = req.body;
    
    try {
        const fk_paciente = await getPacienteId(req.user.id);
        
        await pool.query(
            'INSERT INTO familiares (fk_paciente, cedula, nombre, apellido, fecha_nacimiento, relacion) VALUES ($1, $2, $3, $4, $5, $6)',
            [fk_paciente, cedula, nombre, apellido, fecha_nacimiento, parentesco]
        );

        res.status(201).json({ msg: 'Familiar/Menor agregado con éxito.' });
    } catch (err) {
        console.error('Error al agregar familiar:', err.message);
        res.status(500).json({ msg: 'Error del servidor al agregar familiar.' });
    }
});



// server.js (Asegúrate de tener bcrypt importado: const bcrypt = require('bcrypt');)

// ------------------------------------------------------------------------------
// 7.8 Actualización de Datos de Usuario (Contraseña, Email, Teléfono)
// ------------------------------------------------------------------------------
// Ruta: PUT /api/paciente/actualizar-usuario
app.put('/api/paciente/actualizar-usuario', auth(['Paciente']), async (req, res) => {
    const { email, telefono, contrasena_actual, nueva_contrasena } = req.body;
    const fk_usuario = req.user.id; // ID de usuario obtenido del token

    try {
        // 1. Obtener la contraseña hasheada actual de la DB para verificación
        const userRes = await pool.query('SELECT contrasena_hash, email FROM usuarios WHERE id_usuario = $1', [fk_usuario]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ msg: 'Usuario no encontrado.' });
        }
        const user = userRes.rows[0];

        // 2. VALIDACIÓN DE CONTRASEÑA ACTUAL (Requerida para cualquier cambio)
        if (!contrasena_actual || !(await bcrypt.compare(contrasena_actual, user.contrasena_hash))) {
            return res.status(401).json({ msg: 'Contraseña actual incorrecta. No se pudo realizar la actualización.' });
        }

        // 3. CONSTRUIR LA CONSULTA DE ACTUALIZACIÓN
        let queryText = 'UPDATE usuarios SET ';
        const queryParams = [];
        let index = 1;
        const updates = [];

        // --- A. Actualizar Email ---
        if (email && email !== user.email) {
            // Opcional: Verificar que el nuevo email no exista ya
            const emailCheck = await pool.query('SELECT id_usuario FROM usuarios WHERE email = $1 AND id_usuario != $2', [email, fk_usuario]);
            if (emailCheck.rows.length > 0) {
                return res.status(400).json({ msg: 'El nuevo correo electrónico ya está en uso.' });
            }
            updates.push(`email = $${index++}`);
            queryParams.push(email);
        }

        // --- B. Actualizar Teléfono ---
        if (telefono) { // No comparamos con el actual por si es un campo que puede estar vacío/nulo
            updates.push(`telefono = $${index++}`);
            queryParams.push(telefono);
        }
        
        // --- C. Actualizar Contraseña ---
        if (nueva_contrasena) {
            if (nueva_contrasena.length < 6) {
                return res.status(400).json({ msg: 'La nueva contraseña debe tener al menos 6 caracteres.' });
            }
            const newHash = await bcrypt.hash(nueva_contrasena, 10);
            updates.push(`contrasena_hash = $${index++}`);
            queryParams.push(newHash);
        }

        if (updates.length === 0) {
            return res.status(400).json({ msg: 'No se encontraron campos válidos para actualizar.' });
        }

        // Ejecutar la actualización
        queryText += updates.join(', ') + ` WHERE id_usuario = $${index}`;
        queryParams.push(fk_usuario);

        await pool.query(queryText, queryParams);

        // Si la contraseña cambió, es buena práctica forzar el re-login
        if (nueva_contrasena) {
            return res.json({ msg: '✅ Datos actualizados y Contraseña cambiada. Por favor, inicie sesión de nuevo con su nueva contraseña.', requires_relogin: true });
        } else {
            return res.json({ msg: '✅ Correo electrónico y/o teléfono actualizados con éxito.' });
        }

    } catch (err) {
        console.error('Error al actualizar datos de usuario:', err.message);
        res.status(500).json({ msg: 'Error del servidor al actualizar sus datos.' });
    }
});

































// ==============================================================================
// 5. RUTAS DEL DOCTOR (Panel doctor.html) - CORREGIDAS SEGÚN SU ESTRUCTURA DE DB
// 🔑 CLAVES CORREGIDAS: citas.fk_doctor, doctores.especialidad
// ==============================================================================

// Middleware de Autorización: Asegura que solo los Doctores puedan acceder a estas rutas
const doctorAuth = auth(['Doctor']);


// 5.1 Ruta: GET /api/doctor/perfil <-- RUTA CORREGIDA
// Propósito: Obtener el perfil completo del doctor logueado
app.get('/api/doctor/perfil', doctorAuth, async (req, res) => {
    try {
        const userId = req.user.id; 

        const result = await pool.query(`
            SELECT 
                u.nombre, 
                u.apellido, 
                u.email, 
                u.cedula, 
                d.id_colegiatura, 
                e.nombre_especialidad AS especialidad, 
                d.estado 
            FROM usuarios u
            JOIN doctores d ON u.id_usuario = d.fk_usuario
            
            -- INICIO DE LA CORRECCIÓN: Comparamos nombre_especialidad con especialidad
            JOIN especialidades e ON d.especialidad = e.nombre_especialidad 
            -- FIN DE LA CORRECCIÓN
            
            WHERE u.id_usuario = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Perfil de doctor no encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error al obtener perfil del doctor:', err.message);
        res.status(500).json({ message: 'Error del servidor al obtener el perfil.' });
    }
});
// 5.2 Ruta: GET /api/doctor/horario <-- RUTA CORREGIDA (Devuelve id_horario)
app.get('/api/doctor/horario', doctorAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const doctorResult = await pool.query('SELECT id_doctor FROM doctores WHERE fk_usuario = $1', [userId]);
        if (doctorResult.rows.length === 0) {
            return res.status(404).json({ message: 'Doctor no encontrado.' });
        }
        const id_doctor = doctorResult.rows[0].id_doctor;
        
        const result = await pool.query(`
            SELECT 
                id_horario, -- <-- SE AÑADIÓ ESTO
                dia_semana, 
                TO_CHAR(hora_inicio, 'HH24:MI') AS hora_inicio, 
                TO_CHAR(hora_fin, 'HH24:MI') AS hora_fin
            FROM horarios_doctor
            WHERE fk_doctor = $1
            ORDER BY dia_semana ASC
        `, [id_doctor]);

        // Convertir el número (dia_semana) de la DB a Texto ("Lunes") para el HTML
        const horarioConvertido = result.rows.map(dia => ({
            ...dia,
            dia_semana: diaNumeroATexto(dia.dia_semana)
        }));
        res.json(horarioConvertido);

    } catch (err) {
        console.error('Error al obtener horario:', err.message);
        res.status(500).json({ message: 'Error del servidor al obtener el horario.' });
    }
});
// 5.3 Ruta: POST /api/doctor/horario <-- RUTA CORREGIDA (Convierte Texto a Número)
app.post('/api/doctor/horario', doctorAuth, async (req, res) => {
    const { dia_semana, hora_inicio, hora_fin } = req.body;
    const userId = req.user.id;

    if (!dia_semana || !hora_inicio || !hora_fin) {
        return res.status(400).json({ message: 'Faltan campos requeridos: día, hora de inicio o fin.' });
    }

    try {
        const doctorResult = await pool.query('SELECT id_doctor FROM doctores WHERE fk_usuario = $1', [userId]);
        if (doctorResult.rows.length === 0) {
            return res.status(404).json({ message: 'Doctor no encontrado.' });
        }
        const id_doctor = doctorResult.rows[0].id_doctor;
        
        // --- INICIO CORRECCIÓN ---
        // Convertir el Texto "Lunes" del HTML al Número 1 para la DB
        const diaNumero = diaTextoANumero(dia_semana);
        if (diaNumero === 0) {
            return res.status(400).json({ message: 'Día de la semana inválido.' });
        }
        
        const result = await pool.query(`
            INSERT INTO horarios_doctor (fk_doctor, dia_semana, hora_inicio, hora_fin)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (fk_doctor, dia_semana)
            DO UPDATE SET hora_inicio = $3, hora_fin = $4
            RETURNING *;
        `, [id_doctor, diaNumero, hora_inicio, hora_fin]); // Usar diaNumero
        // --- FIN CORRECCIÓN ---

        res.status(201).json({ 
            message: 'Horario guardado/actualizado exitosamente.', 
            horario: result.rows[0] 
        });
    } catch (err) {
        console.error('Error al guardar horario:', err.message);
        res.status(500).json({ message: 'Error del servidor al guardar el horario.' });
    }
});

// 5.4 Ruta: DELETE /api/doctor/horario/:id_horario (NUEVA RUTA)
// Propósito: Eliminar un día específico del horario
app.delete('/api/doctor/horario/:id_horario', doctorAuth, async (req, res) => {
    const { id_horario } = req.params;
    
    // Obtener id_doctor para seguridad (asegurar que un doctor no borre el horario de otro)
    const doctorResult = await pool.query('SELECT id_doctor FROM doctores WHERE fk_usuario = $1', [req.user.id]);
    if (doctorResult.rows.length === 0) {
        return res.status(404).json({ message: 'Doctor no encontrado.' });
    }
    const fk_doctor = doctorResult.rows[0].id_doctor;

    try {
        const deleteResult = await pool.query(
            'DELETE FROM horarios_doctor WHERE id_horario = $1 AND fk_doctor = $2',
            [id_horario, fk_doctor]
        );

        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ message: 'Registro de horario no encontrado o no pertenece a este doctor.' });
        }

        res.json({ message: 'Día de horario eliminado exitosamente.' });
    } catch (err) {
        console.error('Error al eliminar horario:', err.message);
        res.status(500).json({ message: 'Error del servidor al eliminar el horario.' });
    }
});
















// 5.4 Ruta: GET /api/doctor/citas/pendientes <-- RUTA CORREGIDA
// Propósito: Obtener todas las citas que requieren aprobación del doctor logueado
app.get('/api/doctor/citas/pendientes', doctorAuth, async (req, res) => {
    try {
        // PASO 1: Obtener el ID del Doctor (id_doctor) a partir del ID del Usuario (fk_usuario)
        const doctorResult = await pool.query(`SELECT id_doctor FROM doctores WHERE fk_usuario = $1`, [req.user.id]);
        if (doctorResult.rows.length === 0) {
            return res.status(404).json({ message: 'ID de Doctor no encontrado para este usuario.' });
        }
        const id_doctor = doctorResult.rows[0].id_doctor;
        
        // PASO 2: Realizar la consulta de citas
        const citas = await pool.query(`
            SELECT 
                c.id_cita, 
                p.id_paciente, 
                u_p.nombre AS paciente_nombre, 
                u_p.apellido AS paciente_apellido, 
                c.motivo_consulta AS motivo, 
                TO_CHAR(c.fecha_hora_consulta, 'YYYY-MM-DD HH24:MI') AS fecha_hora, 
                e.nombre_especialidad
            FROM citas c
            JOIN pacientes p ON c.fk_paciente = p.id_paciente 
            JOIN usuarios u_p ON p.fk_usuario = u_p.id_usuario 
            JOIN doctores d ON c.fk_doctor = d.id_doctor 
            
            -- INICIO DE LA CORRECCIÓN: Comparamos nombre_especialidad con especialidad
            JOIN especialidades e ON d.especialidad = e.nombre_especialidad 
            -- FIN DE LA CORRECCIÓN
            
            WHERE c.fk_doctor = $1 
            AND c.estado_cita = 'Pendiente' 
            ORDER BY c.fecha_hora_consulta ASC
        `, [id_doctor]);

        res.json(citas.rows);
    } catch (err) {
        console.error('Error al obtener citas pendientes:', err.message);
        res.status(500).json({ message: 'Error del servidor al obtener citas.' }); 
    }
});
// 5.5 Ruta: PUT /api/doctor/citas/:id_cita <-- RUTA CORREGIDA
// Propósito: Actualizar el estado de una cita (Aceptada o Rechazada)
app.put('/api/doctor/citas/:id_cita', doctorAuth, async (req, res) => {
    const { id_cita } = req.params;
    const { nuevo_estado } = req.body;
    
    // Obtener id_doctor
    const doctorResult = await pool.query(`SELECT id_doctor FROM doctores WHERE fk_usuario = $1`, [req.user.id]);
    if (doctorResult.rows.length === 0) {
        return res.status(404).json({ message: 'ID de Doctor no encontrado para este usuario.' });
    }
    const id_doctor = doctorResult.rows[0].id_doctor;

    if (!['Aceptada', 'Rechazada'].includes(nuevo_estado)) {
        return res.status(400).json({ message: 'Estado de cita inválido.' });
    }

    try {
        const result = await pool.query(`
            UPDATE citas
            SET estado_cita = $1 
            WHERE id_cita = $2 AND fk_doctor = $3 -- <-- CORRECCIÓN: de 'id_citas' a 'id_cita'
            RETURNING id_cita, estado_cita;
        `, [nuevo_estado, id_cita, id_doctor]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Cita no encontrada o no pertenece a este doctor.' });
        }

        res.json({ message: `Cita #${id_cita} ha sido ${nuevo_estado.toLowerCase()} exitosamente.`, cita: result.rows[0] });
    } catch (err) {
        console.error('Error al actualizar estado de cita:', err.message);
        res.status(500).json({ message: 'Error del servidor al actualizar la cita.' });
    }
});
// 5.6 Ruta: GET /api/doctor/paciente/:id_paciente/antecedentes <-- RUTA CORREGIDA (con JOIN a pacientes)
app.get('/api/doctor/paciente/:id_paciente/antecedentes', doctorAuth, async (req, res) => {
    const { id_paciente } = req.params;
    
    try {
        // --- INICIO CORRECCIÓN ---
        // Se añade JOIN con 'pacientes' para obtener el contacto de emergencia
        const result = await pool.query(`
            SELECT 
                a.alergias, 
                a.habito_tabaco, 
                a.habito_alcohol, 
                a.antecedentes_familiares, 
                a.cirugia_previa, 
                a.medicamentos_actuales, 
                a.condicion_cronica,
                p.contacto_emergencia_nombre,
                p.contacto_emergencia_telefono
            FROM antecedentes_paciente a
            JOIN pacientes p ON a.fk_paciente = p.id_paciente
            WHERE a.fk_paciente = $1 
        `, [id_paciente]);
        // --- FIN CORRECCIÓN ---

        if (result.rows.length === 0) {
            // Si no tiene antecedentes, igual buscamos al paciente para el contacto de emergencia
             const pacienteResult = await pool.query(
                'SELECT contacto_emergencia_nombre, contacto_emergencia_telefono FROM pacientes WHERE id_paciente = $1',
                [id_paciente]
             );
             if (pacienteResult.rows.length > 0) {
                 return res.json({ 
                     antecedentes: {
                         ...pacienteResult.rows[0],
                         message: 'No hay antecedentes médicos registrados.'
                     }
                 });
             }
            return res.status(200).json({ antecedentes: { message: 'No hay antecedentes registrados para este paciente.' } });
        }

        res.json({ antecedentes: result.rows[0] });

    } catch (err) {
        console.error('Error al obtener antecedentes:', err.message);
        res.status(500).json({ message: 'Error del servidor al obtener el historial médico.' });
    }
});
// 5.7 Ruta: GET /api/doctor/citas/aceptadas <-- RUTA CORREGIDA
// Propósito: Obtener el historial de citas Aceptadas (para el registro de atenciones)
app.get('/api/doctor/citas/aceptadas', doctorAuth, async (req, res) => {
     try {
        // Obtener id_doctor
        const doctorResult = await pool.query(`SELECT id_doctor FROM doctores WHERE fk_usuario = $1`, [req.user.id]);
        if (doctorResult.rows.length === 0) {
            return res.status(404).json({ message: 'ID de Doctor no encontrado para este usuario.' });
        }
        const id_doctor = doctorResult.rows[0].id_doctor;
        
        const citas = await pool.query(`
            SELECT 
                c.id_cita, -- <-- CORRECCIÓN: de 'id_citas' a 'id_cita'
                p.id_paciente,
                u_p.nombre AS paciente_nombre, 
                u_p.apellido AS paciente_apellido, 
                TO_CHAR(c.fecha_hora_consulta, 'YYYY-MM-DD HH24:MI') AS fecha_hora, 
                c.motivo_consulta AS motivo,
                c.estado_cita AS estado
            FROM citas c
            JOIN pacientes p ON c.fk_paciente = p.id_paciente 
            JOIN usuarios u_p ON p.fk_usuario = u_p.id_usuario
            WHERE c.fk_doctor = $1 
            AND c.estado_cita = 'Aceptada'
            ORDER BY c.fecha_hora_consulta DESC
        `, [id_doctor]);

        res.json(citas.rows);
    } catch (err) {
        console.error('Error al obtener citas aceptadas:', err.message);
        res.status(500).json({ message: 'Error del servidor al obtener historial de atenciones.' });
    }
});

// 5.8 Ruta: PUT /api/doctor/actualizar-usuario (NUEVA)
// Propósito: Permitir al doctor actualizar sus datos de acceso (email, tel, pass)
app.put('/api/doctor/actualizar-usuario', doctorAuth, async (req, res) => {
    const { email, telefono, contrasena_actual, nueva_contrasena } = req.body;
    const fk_usuario = req.user.id; // ID de usuario (doctor) obtenido del token

    try {
        // 1. Obtener la contraseña hasheada actual
        const userRes = await pool.query('SELECT contrasena_hash, email FROM usuarios WHERE id_usuario = $1', [fk_usuario]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario doctor no encontrado.' });
        }
        const user = userRes.rows[0];

        // 2. VALIDACIÓN DE CONTRASEÑA ACTUAL
        if (!contrasena_actual || !(await bcrypt.compare(contrasena_actual, user.contrasena_hash))) {
            return res.status(401).json({ message: 'Contraseña actual incorrecta. No se pudo realizar la actualización.' });
        }

        // 3. CONSTRUIR LA CONSULTA DE ACTUALIZACIÓN
        let queryText = 'UPDATE usuarios SET ';
        const queryParams = [];
        let index = 1;
        const updates = [];

        // Actualizar Email
        if (email && email !== user.email) {
            const emailCheck = await pool.query('SELECT id_usuario FROM usuarios WHERE email = $1 AND id_usuario != $2', [email, fk_usuario]);
            if (emailCheck.rows.length > 0) {
                return res.status(400).json({ message: 'El nuevo correo electrónico ya está en uso.' });
            }
            updates.push(`email = $${index++}`);
            queryParams.push(email);
        }

        // Actualizar Teléfono
        if (telefono) {
            updates.push(`telefono = $${index++}`);
            queryParams.push(telefono);
        }
        
        // Actualizar Contraseña
        if (nueva_contrasena) {
            if (nueva_contrasena.length < 6) { // Puedes usar tu Regex aquí si prefieres
                return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
            }
            const newHash = await bcrypt.hash(nueva_contrasena, 10);
            updates.push(`contrasena_hash = $${index++}`);
            queryParams.push(newHash);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No se encontraron campos válidos para actualizar.' });
        }

        // Ejecutar la actualización
        queryText += updates.join(', ') + ` WHERE id_usuario = $${index}`;
        queryParams.push(fk_usuario);
        await pool.query(queryText, queryParams);

        if (nueva_contrasena) {
            return res.json({ message: '✅ Datos actualizados y Contraseña cambiada. Deberá iniciar sesión de nuevo.', requires_relogin: true });
        } else {
            return res.json({ message: '✅ Correo electrónico y/o teléfono actualizados con éxito.' });
        }

    } catch (err) {
        console.error('Error al actualizar datos de doctor:', err.message);
        res.status(500).json({ message: 'Error del servidor al actualizar sus datos.' });
    }
});

// 5.9 Ruta: GET /api/doctor/pacientes (NUEVA)
// Propósito: Obtener una lista simple de todos los pacientes para un <select>
app.get('/api/doctor/pacientes', doctorAuth, async (req, res) => {
    try {
        const pacientes = await pool.query(`
            SELECT p.id_paciente, u.nombre, u.apellido, u.cedula
            FROM pacientes p
            JOIN usuarios u ON p.fk_usuario = u.id_usuario
            ORDER BY u.apellido, u.nombre
        `);
        res.json(pacientes.rows);
    } catch (err) {
        console.error('Error al obtener lista de pacientes:', err.message);
        res.status(500).json({ message: 'Error del servidor al obtener pacientes.' });
    }
});

// 5.10 Ruta: GET /api/doctor/medicamentos (NUEVA)
// Propósito: Buscar medicamentos en el inventario para el autocompletado
// Uso: /api/doctor/medicamentos?search=amoxi
app.get('/api/doctor/medicamentos', doctorAuth, async (req, res) => {
    const { search } = req.query;
    if (!search || search.length < 3) {
        return res.json([]); // No buscar si la palabra es muy corta
    }
    
    try {
        // Busca medicamentos en el inventario (debe coincidir con tu tabla de inventario)
        const medicamentos = await pool.query(
            "SELECT id_item, nombre, concentracion FROM inventario_medicamentos WHERE tipo_recurso = 'Medicamento' AND nombre ILIKE $1 LIMIT 10",
            [`%${search}%`]
        );
        res.json(medicamentos.rows);
    } catch (err) {
        console.error('Error al buscar medicamentos:', err.message);
        res.status(500).json({ message: 'Error del servidor al buscar medicamentos.' });
    }
});

// 5.11 Ruta: POST /api/doctor/prescripciones (NUEVA Y CRÍTICA)
// Propósito: Guardar una prescripción completa (Maestro + Detalles)
app.post('/api/doctor/prescripciones', doctorAuth, async (req, res) => {
    const { fk_paciente, diagnostico_principal, notas_adicionales, detalles } = req.body;
    
    // 1. Obtener el ID del Doctor
    const doctorResult = await pool.query('SELECT id_doctor FROM doctores WHERE fk_usuario = $1', [req.user.id]);
    if (doctorResult.rows.length === 0) {
        return res.status(404).json({ message: 'Doctor no encontrado.' });
    }
    const fk_doctor = doctorResult.rows[0].id_doctor;

    // Validación
    if (!fk_paciente || !detalles || detalles.length === 0) {
        return res.status(400).json({ message: 'Faltan datos del paciente o líneas de medicación.' });
    }

    // Iniciar Transacción (para asegurar que todo se guarde o nada se guarde)
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 2. Insertar el Maestro (la prescripción)
        const prescripcionResult = await client.query(
            `INSERT INTO prescripciones (fk_doctor, fk_paciente, diagnostico_principal, notas_adicionales, fecha_prescripcion)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING id_prescripcion`,
            [fk_doctor, fk_paciente, diagnostico_principal, notas_adicionales]
        );
        
        const newPrescripcionId = prescripcionResult.rows[0].id_prescripcion;

        // 3. Insertar los Detalles (las líneas de medicamentos)
        // Usamos la tabla que me diste: detalle_prescripcion
        for (const med of detalles) {
            await client.query(
                `INSERT INTO detalle_prescripcion (fk_prescripcion, fk_medicamento, dosis, frecuencia, duracion)
                 VALUES ($1, $2, $3, $4, $5)`,
                [newPrescripcionId, med.fk_medicamento, med.dosis, med.frecuencia, med.duracion]
            );
        }

        // 4. Confirmar Transacción
        await client.query('COMMIT');
        
        res.status(201).json({ 
            message: 'Prescripción guardada exitosamente.', 
            id_prescripcion: newPrescripcionId 
        });

    } catch (err) {
        // 5. Revertir en caso de error
        await client.query('ROLLBACK');
        console.error('Error al guardar prescripción (Transacción):', err.message);
        res.status(500).json({ message: 'Error del servidor al guardar la prescripción.' });
    } finally {
        // Liberar el cliente
        client.release();
    }
});


// 5.9 Ruta: GET /api/doctor/pacientes (La necesitamos para el <select>)
// Propósito: Obtener una lista simple de todos los pacientes
app.get('/api/doctor/pacientes', doctorAuth, async (req, res) => {
    try {
        const pacientes = await pool.query(`
            SELECT p.id_paciente, u.nombre, u.apellido, u.cedula
            FROM pacientes p
            JOIN usuarios u ON p.fk_usuario = u.id_usuario
            ORDER BY u.apellido, u.nombre
        `);
        res.json(pacientes.rows);
    } catch (err) {
        console.error('Error al obtener lista de pacientes:', err.message);
        res.status(500).json({ message: 'Error del servidor al obtener pacientes.' });
    }
});


// 5.10 Ruta: POST /api/doctor/consulta-completa (ACTUALIZADA con Signos Vitales)
// Propósito: Guardar Visita, Signos Vitales, Prescripción y Detalles en una sola transacción
app.post('/api/doctor/consulta-completa', doctorAuth, async (req, res) => {
    
    // 1. Recibir todos los datos del frontend
    const { 
        fk_paciente, 
        motivo_consulta, 
        diagnostico, 
        notas_evolucion,
        presion_arterial,
        glicemia,
        saturacion_oxigeno,
        temperatura_c,
        peso_kg,
        talla_cm,
        observaciones_prescripcion, 
        medicamentos // Este es el array de medicamentos (puede estar vacío)
    } = req.body;

    // 2. Obtener el ID del Doctor
    const doctorResult = await pool.query('SELECT id_doctor FROM doctores WHERE fk_usuario = $1', [req.user.id]);
    if (doctorResult.rows.length === 0) {
        return res.status(404).json({ message: 'Doctor no encontrado.' });
    }
    const fk_doctor = doctorResult.rows[0].id_doctor;

    // --- INICIO DE CORRECCIÓN ---
    // Validación básica (se eliminó la obligación de 'medicamentos')
    if (!fk_paciente || !diagnostico) {
        return res.status(400).json({ message: 'Faltan Paciente o Diagnóstico.' });
    }
    // --- FIN DE CORRECCIÓN ---

    // 3. Iniciar Transacción
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // --- PASO A: Guardar la Visita Médica (CON SIGNOS VITALES) ---
        const numGlicemia = glicemia ? parseInt(glicemia) : null;
        const numSaturacion = saturacion_oxigeno ? parseInt(saturacion_oxigeno) : null;
        const numTemperatura = temperatura_c ? parseFloat(temperatura_c) : null;
        const numPeso = peso_kg ? parseFloat(peso_kg) : null;
        const numTalla = talla_cm ? parseInt(talla_cm) : null;

        const visitaResult = await client.query(
            `INSERT INTO visitas_medicas (
                fk_paciente, fk_doctor, motivo_consulta, diagnostico, notas_evolucion, 
                presion_arterial, glicemia, saturacion_oxigeno, temperatura_c, peso_kg, talla_cm, 
                fecha_visita
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
             RETURNING id_visita`,
            [
                fk_paciente, fk_doctor, motivo_consulta, diagnostico, notas_evolucion,
                presion_arterial, numGlicemia, numSaturacion, numTemperatura, numPeso, numTalla,
            ]
        );
        const idVisita = visitaResult.rows[0].id_visita;

        // --- PASO B: Guardar la Prescripción (Récipē) ---
        let idPrescripcion = null;
        // --- INICIO DE CORRECCIÓN (Verificación de 'medicamentos') ---
        // Solo se ejecuta esta sección si el array 'medicamentos' no está vacío
        if (medicamentos && medicamentos.length > 0) {
        // --- FIN DE CORRECCIÓN ---
            const prescripcionResult = await client.query(
                `INSERT INTO prescripciones (fk_visita, observaciones, fecha_prescripcion)
                 VALUES ($1, $2, NOW())
                 RETURNING id_prescripcion`,
                [idVisita, observaciones_prescripcion]
            );
            idPrescripcion = prescripcionResult.rows[0].id_prescripcion;

            // --- PASO C: Guardar los Detalles de la Prescripción ---
            for (const med of medicamentos) {
                await client.query(
                    `INSERT INTO detalle_prescripcion (fk_prescripcion, nombre_medicamento, dosis, frecuencia, duracion)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [idPrescripcion, med.nombre_medicamento, med.dosis, med.frecuencia, med.duracion]
                );
            }
        } // Fin del 'if' de medicamentos

        // --- PASO D: Confirmar todo ---
        await client.query('COMMIT');
        
        res.status(201).json({ 
            message: 'Visita guardada exitosamente.', // Mensaje actualizado
            id_visita: idVisita,
            id_prescripcion: idPrescripcion // Será null si no hubo medicamentos
        });

    } catch (err) {
        // --- PASO E: Revertir en caso de error ---
        await client.query('ROLLBACK');
        console.error('Error al guardar consulta completa (Transacción):', err.message);
        res.status(500).json({ message: 'Error del servidor al guardar. Se revirtieron los cambios.' });
    } finally {
        // Liberar el cliente
        client.release();
    }
});

// --- INICIO DEL NUEVO MÓDULO ECE (Expediente Clínico) ---

// ECE RUTA 1: Obtener TODAS las visitas de un paciente
// (Esta ruta la usará la nueva pestaña "Visitas Anteriores")
app.get('/api/doctor/paciente/:id_paciente/visitas', doctorAuth, async (req, res) => {
    const { id_paciente } = req.params;
    try {
        const visitas = await pool.query(
            `SELECT v.*, 
                    (SELECT COUNT(*) FROM prescripciones p WHERE p.fk_visita = v.id_visita) > 0 as tiene_prescripcion
             FROM visitas_medicas v
             WHERE v.fk_paciente = $1
             ORDER BY v.fecha_visita DESC`,
            [id_paciente]
        );
        res.json(visitas.rows);
    } catch (err) {
        console.error('Error al obtener visitas:', err.message);
        res.status(500).json({ message: 'Error del servidor al obtener visitas.' });
    }
});

// ECE RUTA 2: Obtener los detalles de UNA prescripción (para ver el récipe viejo)
app.get('/api/doctor/prescripcion/:id_visita', doctorAuth, async (req, res) => {
    const { id_visita } = req.params;
    try {
        // Obtenemos los detalles de la prescripción
        const detallesResult = await pool.query(
            `SELECT d.nombre_medicamento, d.dosis, d.frecuencia, d.duracion, p.observaciones
             FROM detalle_prescripcion d
             JOIN prescripciones p ON d.fk_prescripcion = p.id_prescripcion
             WHERE p.fk_visita = $1`,
            [id_visita]
        );
        
        if (detallesResult.rows.length === 0) {
             // Puede ser una visita sin prescripción, no es un error
            return res.json({ message: 'No se encontró prescripción para esta visita.' });
        }
        
        res.json(detallesResult.rows);
    } catch (err) {
        console.error('Error al obtener detalles de prescripción:', err.message);
        res.status(500).json({ message: 'Error del servidor.' });
    }
});


// ECE RUTA 3: CRUD de Alergias
app.get('/api/doctor/paciente/:id_paciente/alergias', doctorAuth, async (req, res) => {
    const { id_paciente } = req.params;
    try {
        const alergias = await pool.query('SELECT * FROM historial_alergias WHERE fk_paciente = $1 ORDER BY alergeno ASC', [id_paciente]);
        res.json(alergias.rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/doctor/paciente/alergias', doctorAuth, async (req, res) => {
    const { fk_paciente, alergeno, tipo_alergia, reaccion_presentada } = req.body;
    
    // Obtener id_doctor del usuario logueado
    const doctorResult = await pool.query('SELECT id_doctor FROM doctores WHERE fk_usuario = $1', [req.user.id]);
    if (doctorResult.rows.length === 0) return res.status(404).json({ message: 'Doctor no encontrado.' });
    const fk_doctor = doctorResult.rows[0].id_doctor;
    
    try {
        await pool.query(
            'INSERT INTO historial_alergias (fk_paciente, alergeno, tipo_alergia, reaccion_presentada, fk_doctor_registra) VALUES ($1, $2, $3, $4, $5)',
            [fk_paciente, alergeno, tipo_alergia, reaccion_presentada, fk_doctor]
        );
        res.status(201).json({ message: 'Alergia registrada.' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/doctor/alergias/:id_alergia', doctorAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM historial_alergias WHERE id_alergia = $1', [req.params.id_alergia]);
        res.json({ message: 'Alergia eliminada.' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});


// ECE RUTA 4: CRUD de Vacunas
app.get('/api/doctor/paciente/:id_paciente/vacunas', doctorAuth, async (req, res) => {
    const { id_paciente } = req.params;
    try {
        const vacunas = await pool.query('SELECT * FROM historial_vacunas WHERE fk_paciente = $1 ORDER BY fecha_aplicacion DESC', [id_paciente]);
        res.json(vacunas.rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/doctor/paciente/vacunas', doctorAuth, async (req, res) => {
    // Se elimina 'lote' de la desestructuración
    const { fk_paciente, nombre_vacuna, dosis, fecha_aplicacion } = req.body;
    
    const doctorResult = await pool.query('SELECT id_doctor FROM doctores WHERE fk_usuario = $1', [req.user.id]);
    const fk_doctor = doctorResult.rows[0].id_doctor;
    
    try {
        // Se elimina 'lote' de la consulta SQL
        await pool.query(
            'INSERT INTO historial_vacunas (fk_paciente, nombre_vacuna, dosis, fecha_aplicacion, fk_doctor_registra) VALUES ($1, $2, $3, $4, $5)',
            [fk_paciente, nombre_vacuna, dosis, fecha_aplicacion, fk_doctor]
        );
        res.status(201).json({ message: 'Vacuna registrada.' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});
app.delete('/api/doctor/vacunas/:id_vacuna', doctorAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM historial_vacunas WHERE id_vacuna = $1', [req.params.id_vacuna]);
        res.json({ message: 'Registro de vacuna eliminado.' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- FIN DEL NUEVO MÓDULO ECE ---
// --- INICIO MÓDULO ECE (Antecedentes Familiares) ---

app.get('/api/doctor/paciente/:id_paciente/familiares', doctorAuth, async (req, res) => {
    try {
        const data = await pool.query('SELECT * FROM historial_familiares WHERE fk_paciente = $1 ORDER BY parentesco', [req.params.id_paciente]);
        res.json(data.rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/doctor/paciente/familiares', doctorAuth, async (req, res) => {
    const { fk_paciente, parentesco, condicion_medica, notas } = req.body;
    const doctorResult = await pool.query('SELECT id_doctor FROM doctores WHERE fk_usuario = $1', [req.user.id]);
    const fk_doctor = doctorResult.rows[0].id_doctor;
    try {
        await pool.query(
            'INSERT INTO historial_familiares (fk_paciente, parentesco, condicion_medica, notas, fk_doctor_registra) VALUES ($1, $2, $3, $4, $5)',
            [fk_paciente, parentesco, condicion_medica, notas, fk_doctor]
        );
        res.status(201).json({ message: 'Antecedente familiar registrado.' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/doctor/familiares/:id', doctorAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM historial_familiares WHERE id_antecedente_fam = $1', [req.params.id]);
        res.json({ message: 'Antecedente familiar eliminado.' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- INICIO MÓDULO ECE (Cirugías) ---

app.get('/api/doctor/paciente/:id_paciente/cirugias', doctorAuth, async (req, res) => {
    try {
        const data = await pool.query('SELECT * FROM historial_cirugias WHERE fk_paciente = $1 ORDER BY fecha_cirugia DESC', [req.params.id_paciente]);
        res.json(data.rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/doctor/paciente/cirugias', doctorAuth, async (req, res) => {
    const { fk_paciente, nombre_procedimiento, fecha_cirugia, hospital_donde_fue, informe_operatorio } = req.body;
    const doctorResult = await pool.query('SELECT id_doctor FROM doctores WHERE fk_usuario = $1', [req.user.id]);
    const fk_doctor = doctorResult.rows[0].id_doctor;
    try {
        // --- CORRECCIÓN: 'fk_doctor_registra' cambiado a 'fk_doctor_cirujano' ---
        await pool.query(
            'INSERT INTO historial_cirugias (fk_paciente, nombre_procedimiento, fecha_cirugia, hospital_donde_fue, informe_operatorio, fk_doctor_cirujano) VALUES ($1, $2, $3, $4, $5, $6)',
            [fk_paciente, nombre_procedimiento, fecha_cirugia, hospital_donde_fue, informe_operatorio, fk_doctor]
        );
        res.status(201).json({ message: 'Cirugía registrada.' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/doctor/cirugias/:id', doctorAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM historial_cirugias WHERE id_cirugia = $1', [req.params.id]);
        res.json({ message: 'Registro de cirugía eliminado.' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- INICIO MÓDULO ECE (Laboratorios con Subida de Archivos) ---

app.get('/api/doctor/paciente/:id_paciente/laboratorios', doctorAuth, async (req, res) => {
    try {
        // Obtenemos los labs y la visita a la que están asociados
        const data = await pool.query(
            `SELECT l.*, v.fecha_visita, v.diagnostico 
             FROM examenes_laboratorio l
             JOIN visitas_medicas v ON l.fk_visita = v.id_visita
             WHERE l.fk_paciente = $1 
             ORDER BY l.fecha_examen DESC`,
            [req.params.id_paciente]
        );
        res.json(data.rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Esta ruta usa 'uploadLab.single' para manejar el archivo
app.post('/api/doctor/paciente/laboratorios', doctorAuth, uploadLab.single('archivo_adjunto'), async (req, res) => {
    const { fk_paciente, fk_visita, nombre_examen, resultado } = req.body;
    
    // El nombre del archivo guardado lo provee multer
    const archivo_adjunto = req.file ? req.file.filename : null;
    
    const doctorResult = await pool.query('SELECT id_doctor FROM doctores WHERE fk_usuario = $1', [req.user.id]);
    const fk_doctor = doctorResult.rows[0].id_doctor;
    
    try {
        await pool.query(
            `INSERT INTO examenes_laboratorio (fk_visita, fk_paciente, nombre_examen, resultado, archivo_adjunto, fecha_examen, fk_doctor_solicita) 
             VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
            [fk_visita, fk_paciente, nombre_examen, resultado, archivo_adjunto, fk_doctor]
        );
        res.status(201).json({ message: 'Examen de laboratorio guardado.' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- INICIO MÓDULO ECE (Radiología con Subida de Archivos) ---

app.get('/api/doctor/paciente/:id_paciente/radiologias', doctorAuth, async (req, res) => {
    try {
        const data = await pool.query(
            `SELECT r.*, v.fecha_visita, v.diagnostico
             FROM examenes_radiologia r
             JOIN visitas_medicas v ON r.fk_visita = v.id_visita
             WHERE r.fk_paciente = $1 
             ORDER BY r.fecha_estudio DESC`,
            [req.params.id_paciente]
        );
        res.json(data.rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/doctor/paciente/radiologias', doctorAuth, uploadRad.single('archivo_adjunto'), async (req, res) => {
    const { fk_paciente, fk_visita, nombre_estudio, informe_radiologico } = req.body;
    const archivo_adjunto = req.file ? req.file.filename : null;
    const doctorResult = await pool.query('SELECT id_doctor FROM doctores WHERE fk_usuario = $1', [req.user.id]);
    const fk_doctor = doctorResult.rows[0].id_doctor;
    
    try {
        await pool.query(
            `INSERT INTO examenes_radiologia (fk_visita, fk_paciente, nombre_estudio, informe_radiologico, archivo_adjunto, fecha_estudio, fk_doctor_solicita) 
             VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
            [fk_visita, fk_paciente, nombre_estudio, informe_radiologico, archivo_adjunto, fk_doctor]
        );
        res.status(201).json({ message: 'Estudio de radiología guardado.' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});


// --- INICIO MÓDULO ECE (Exportación de Datos / Simulación HL7) ---

app.get('/api/doctor/paciente/:id_paciente/exportar-datos', doctorAuth, async (req, res) => {
    const { id_paciente } = req.params;
    try {
        // 1. Obtener todos los datos en paralelo
        const [
            pacienteBasico,
            antecedentes,
            alergias,
            vacunas,
            familiares,
            cirugias,
            visitas
        ] = await Promise.all([
            // Info Paciente (de usuarios y pacientes)
            pool.query('SELECT u.*, p.* FROM pacientes p JOIN usuarios u ON p.fk_usuario = u.id_usuario WHERE p.id_paciente = $1', [id_paciente]),
            // Antecedentes (los que llena el paciente)
            pool.query('SELECT * FROM antecedentes_paciente WHERE fk_paciente = $1', [id_paciente]),
            // Alergias (las que llena el doctor)
            pool.query('SELECT * FROM historial_alergias WHERE fk_paciente = $1', [id_paciente]),
            // Vacunas
            pool.query('SELECT * FROM historial_vacunas WHERE fk_paciente = $1', [id_paciente]),
            // Familiares
            pool.query('SELECT * FROM historial_familiares WHERE fk_paciente = $1', [id_paciente]),
            // Cirugías
            pool.query('SELECT * FROM historial_cirugias WHERE fk_paciente = $1', [id_paciente]),
            // Visitas (y sus dependencias)
            pool.query('SELECT * FROM visitas_medicas WHERE fk_paciente = $1 ORDER BY fecha_visita DESC', [id_paciente])
        ]);

        // 2. Obtener los detalles de CADA visita (prescripciones, labs, radios)
        const visitasCompletas = [];
        for (const visita of visitas.rows) {
            const [prescripciones, laboratorios, radiologia] = await Promise.all([
                pool.query(
                    `SELECT p.id_prescripcion, p.observaciones, d.nombre_medicamento, d.dosis, d.frecuencia, d.duracion 
                     FROM prescripciones p 
                     JOIN detalle_prescripcion d ON p.id_prescripcion = d.fk_prescripcion
                     WHERE p.fk_visita = $1`, [visita.id_visita]
                ),
                pool.query('SELECT * FROM examenes_laboratorio WHERE fk_visita = $1', [visita.id_visita]),
                pool.query('SELECT * FROM examenes_radiologia WHERE fk_visita = $1', [visita.id_visita])
            ]);
            
            visitasCompletas.push({
                ...visita,
                prescripciones: prescripciones.rows,
                laboratorios: laboratorios.rows,
                radiologia: radiologia.rows
            });
        }

        // 3. Construir el objeto JSON (este es el "resumen" tipo HL7)
        const exportData = {
            paciente: pacienteBasico.rows[0],
            antecedentes_personales: antecedentes.rows[0],
            alergias: alergias.rows,
            vacunas: vacunas.rows,
            antecedentes_familiares: familiares.rows,
            historial_quirurgico: cirugias.rows,
            historial_de_visitas: visitasCompletas
        };
        
        // 4. Enviar el JSON completo
        res.json(exportData);

    } catch (err) {
        console.error('Error al exportar datos:', err.message);
        res.status(500).json({ message: 'Error del servidor al compilar el historial.' });
    }
});




























//ADMINISTRATIVO
// Ruta: GET /api/admin/doctores/pendientes
// Propósito: Listar doctores en estado 'Pendiente' para su activación.
app.get('/api/admin/doctores/pendientes', auth(['Administrador']), async (req, res) => {
    try {
        // --- INICIO DE CORRECCIÓN ---
        // Unimos 'doctores.especialidad' (VARCHAR) con 'especialidades.nombre_especialidad' (VARCHAR)
        const doctores = await pool.query(`
            SELECT 
                d.id_doctor, 
                u.nombre, 
                u.apellido, 
                u.cedula, 
                u.email, 
                d.id_colegiatura, 
                d.especialidad -- El nombre de la especialidad ya está en la tabla 'doctores'
            FROM doctores d
            JOIN usuarios u ON d.fk_usuario = u.id_usuario
            WHERE d.estado = 'Pendiente'
        `);
        // --- FIN DE CORRECCIÓN ---
        res.json(doctores.rows);
    } catch (err) {
        console.error('Error al obtener doctores pendientes:', err.message);
        res.status(500).send('Error del servidor.');
    }
});
// Ruta: PUT /api/admin/doctores/:id_doctor/activar
// Propósito: Activa la cuenta del doctor y envía notificación.
app.put('/api/admin/doctores/:id_doctor/activar', auth(['Administrador']), async (req, res) => {
    const { id_doctor } = req.params; 
    try {
        const result = await pool.query(
            'UPDATE doctores SET estado = $1 WHERE id_doctor = $2 RETURNING fk_usuario',
            ['Activo', id_doctor]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ msg: 'Doctor no encontrado.' });
        
        // Obtener datos del usuario para el correo
        const userResult = await pool.query('SELECT email, nombre FROM usuarios WHERE id_usuario = $1', [result.rows[0].fk_usuario]);
        if (userResult.rows.length > 0) {
            await enviarCorreo(userResult.rows[0].email, 
                '🎉 Su Cuenta de Doctor ha sido Activada', 
                `<h2>Estimado Dr(a). ${userResult.rows[0].nombre},</h2><p>Su cuenta ha sido activada. Ya puede ingresar al sistema.</p>`
            );
        }

        res.json({ msg: `Doctor (ID: ${id_doctor}) activado y notificado.` });
    } catch (err) {
        console.error('Error al activar doctor:', err.message);
        res.status(500).send('Error del servidor.');
    }
});

// Ruta: PUT /api/admin/doctores/:id_doctor/rechazar
// Propósito: Rechaza la cuenta del doctor.
app.put('/api/admin/doctores/:id_doctor/rechazar', auth(['Administrador']), async (req, res) => {
    const { id_doctor } = req.params; 
    // En un caso real, aquí se podría pedir la razón del rechazo.
    try {
        await pool.query('UPDATE doctores SET estado = $1 WHERE id_doctor = $2', ['Rechazado', id_doctor]);
        // Lógica: Notificar al doctor del rechazo.
        res.json({ msg: `Doctor (ID: ${id_doctor}) rechazado.` });
    } catch (err) {
        console.error('Error al rechazar doctor:', err.message);
        res.status(500).send('Error del servidor.');
    }
});

/// lista de doctores

// Ruta: GET /api/admin/doctores (ACTUALIZADA CON BÚSQUEDA Y HORARIO COMPLETO)
app.get('/api/admin/doctores', auth(['Administrador']), async (req, res) => {
    const { search } = req.query; // Para la barra de búsqueda

    try {
        let queryParams = [];
        let whereClause = '';

        if (search) {
            queryParams.push(`%${search}%`);
            whereClause = `WHERE (u.nombre ILIKE $1 OR u.apellido ILIKE $1 OR u.cedula ILIKE $1)`;
        }

        const doctores = await pool.query(`
            SELECT 
                d.id_doctor, 
                u.nombre, 
                u.apellido, 
                u.cedula, 
                u.email, 
                u.telefono, 
                d.especialidad,
                d.id_colegiatura, 
                d.estado,
                
                -- *** INICIO DE LA CORRECCIÓN: Se eliminó "DISTINCT" ***
                string_agg(
                    (CASE 
                        WHEN h.dia_semana = 1 THEN 'Lun'
                        WHEN h.dia_semana = 2 THEN 'Mar'
                        WHEN h.dia_semana = 3 THEN 'Mie'
                        WHEN h.dia_semana = 4 THEN 'Jue'
                        WHEN h.dia_semana = 5 THEN 'Vie'
                        WHEN h.dia_semana = 6 THEN 'Sab'
                        WHEN h.dia_semana = 7 THEN 'Dom'
                        ELSE NULL
                    END) || ' ' || TO_CHAR(h.hora_inicio, 'HH24:MI') || '-' || TO_CHAR(h.hora_fin, 'HH24:MI'), 
                    ', ' ORDER BY (
                        CASE 
                            WHEN h.dia_semana = 1 THEN 1
                            WHEN h.dia_semana = 2 THEN 2
                            WHEN h.dia_semana = 3 THEN 3
                            WHEN h.dia_semana = 4 THEN 4
                            WHEN h.dia_semana = 5 THEN 5
                            WHEN h.dia_semana = 6 THEN 6
                            WHEN h.dia_semana = 7 THEN 7
                            ELSE 8
                        END)
                ) AS horario
                -- *** FIN DE LA CORRECCIÓN ***

            FROM doctores d
            JOIN usuarios u ON d.fk_usuario = u.id_usuario
            LEFT JOIN horarios_doctor h ON d.id_doctor = h.fk_doctor
            ${whereClause}
            GROUP BY d.id_doctor, u.id_usuario, d.especialidad, d.estado, d.id_colegiatura
            ORDER BY d.estado, u.apellido, u.nombre
        `, queryParams);
        
        res.json(doctores.rows);
    } catch (err) {
        console.error('Error al obtener todos los doctores:', err.message);
        res.status(500).send('Error del servidor.');
    }
});
// Ruta: PUT /api/admin/doctores/:id_doctor/inactivar
// Propósito: Inactiva la cuenta de un doctor activo (por ejemplo, por suspensión temporal).
app.put('/api/admin/doctores/:id_doctor/inactivar', auth(['Administrador']), async (req, res) => {
    const { id_doctor } = req.params; 
    try {
        const result = await pool.query(
            'UPDATE doctores SET estado = $1 WHERE id_doctor = $2',
            ['Inactivo', id_doctor]
        );
        
        if (result.rowCount === 0) return res.status(404).json({ msg: 'Doctor no encontrado.' });
        
        // Opcional: Notificar al doctor que su cuenta ha sido inactivada
        
        res.json({ msg: `Doctor (ID: ${id_doctor}) inactivado.` });
    } catch (err) {
        console.error('Error al inactivar doctor:', err.message);
        res.status(500).send('Error del servidor.');
    }
});


// ==============================================================================
// 8. RUTAS DEL PANEL de ADMINISTRADOR: MÉTRICAS (VERSIÓN DE DEPURACIÓN)
// ==============================================================================
app.get('/api/admin/metricas', auth(['Administrador']), async (req, res) => {
    try {
        // Modo de Depuración: Ejecutamos las consultas una por una
        // para identificar exactamente cuál está fallando.
        
        console.log("Iniciando carga de métricas...");

        // 1. Total de Pacientes
        const totalPacientesResult = await pool.query('SELECT COUNT(*) FROM pacientes');
        console.log("Métrica 1 (Pacientes) OK.");

        // 2. Total de Doctores Activos
        const totalDoctoresActivosResult = await pool.query("SELECT COUNT(*) FROM doctores WHERE estado = 'Activo'");
        console.log("Métrica 2 (Doctores Activos) OK.");

        // 3. Total de Doctores Pendientes
        const totalDoctoresPendientesResult = await pool.query("SELECT COUNT(*) FROM doctores WHERE estado = 'Pendiente'");
        console.log("Métrica 3 (Doctores Pendientes) OK.");

        // 4. Citas Pendientes
        const citasPendientesResult = await pool.query("SELECT COUNT(*) FROM citas WHERE estado_cita = 'Pendiente'");
        console.log("Métrica 4 (Citas) OK.");

        // 5. Camas Libres
        const camasLibresResult = await pool.query("SELECT COUNT(*) FROM camas WHERE estado = 'Libre'");
        console.log("Métrica 5 (Camas) OK.");

        // 6. Solicitudes de Medicamentos Pendientes
        const medsPendientesResult = await pool.query("SELECT COUNT(*) FROM solicitudes_medicamentos WHERE estado = 'Pendiente'");
        console.log("Métrica 6 (Solicitudes) OK.");

        // Si llegamos aquí, todo funcionó
        console.log("Todas las métricas cargadas exitosamente.");
        
        res.json({
            totalPacientes: parseInt(totalPacientesResult.rows[0].count),
            totalDoctoresActivos: parseInt(totalDoctoresActivosResult.rows[0].count),
            totalDoctoresPendientes: parseInt(totalDoctoresPendientesResult.rows[0].count),
            citasPendientes: parseInt(citasPendientesResult.rows[0].count),
            camasLibres: parseInt(camasLibresResult.rows[0].count),
            medsPendientes: parseInt(medsPendientesResult.rows[0].count),
        });

    } catch (err) {
        // ¡ESTO ES LO MÁS IMPORTANTE!
        // Ahora el error será específico de la consulta que falló.
        console.error('Error al obtener métricas (MODO DEBUG):', err.message);
        // Devolvemos el error específico al frontend
        res.status(500).json({ msg: `Error del servidor (Debug): ${err.message}` });
    }
});
// Ruta: GET /api/admin/farmacia/solicitudes/pendientes (CORREGIDA)
// Propósito: Ver todas las solicitudes de medicamentos pendientes de revisión.
app.get('/api/admin/farmacia/solicitudes/pendientes', auth(['Administrador']), async (req, res) => {
    try {
        const solicitudes = await pool.query(`
            SELECT 
                s.id_solicitud, 
                u.nombre AS paciente_nombre, 
                u.apellido AS paciente_apellido, 
                u.cedula,
                s.fecha_solicitud, 
                s.receta_adjunta,
                s.descripcion_solicitud -- <-- ESTA ES LA LÍNEA AÑADIDA
            FROM solicitudes_medicamentos s
            JOIN pacientes p ON s.fk_paciente = p.id_paciente
            JOIN usuarios u ON p.fk_usuario = u.id_usuario
            WHERE s.estado = 'Pendiente'
            ORDER BY s.fecha_solicitud ASC
        `);
        res.json(solicitudes.rows);
    } catch (err) {
        console.error('Error al obtener solicitudes de medicamentos:', err.message);
        res.status(500).send('Error del servidor.');
    }
});
// Ruta: PUT /api/admin/farmacia/solicitudes/:id_solicitud/actualizar
// Propósito: Aceptar o rechazar una solicitud y potencialmente actualizar inventario.
app.put('/api/admin/farmacia/solicitudes/:id_solicitud/actualizar', auth(['Administrador']), async (req, res) => {
    const { id_solicitud } = req.params;
    const { nuevo_estado } = req.body; // 'Procesada', 'Entregada', o 'Rechazada'

    try {
        // En una implementación completa, aquí iría la lógica de reducir el stock 
        // del inventario si el estado es 'Entregada'.

        await pool.query('UPDATE solicitudes_medicamentos SET estado = $1 WHERE id_solicitud = $2', 
                         [nuevo_estado, id_solicitud]);
        
        // Lógica: Notificar al paciente el cambio de estado.
        res.json({ msg: `Solicitud ${id_solicitud} actualizada a: ${nuevo_estado}` });

    } catch (err) {
        console.error('Error al actualizar solicitud:', err.message);
        res.status(500).send('Error del servidor.');
    }
});





///INVENTARIO
// ==============================================================================
// 8.X RUTAS DE ADMINISTRADOR: INVENTARIO (VERSIÓN PROFESIONAL)
// ==============================================================================

// Ruta: GET /api/admin/inventario (Obtener Inventario)
app.get('/api/admin/inventario', auth(['Administrador']), async (req, res) => {
    try {
        const inventario = await pool.query(`
            SELECT 
                *, -- Selecciona todo
                CASE 
                    WHEN stock_actual <= stock_minimo THEN 'Alerta Baja'
                    ELSE 'Stock Suficiente'
                END AS estado_alerta
            FROM inventario_hospital -- <- TABLA NUEVA
            ORDER BY categoria, nombre ASC
        `);
        res.json(inventario.rows);
    } catch (err) {
        console.error('Error al obtener inventario:', err.message);
        res.status(500).send('Error del servidor.');
    }
});

// Ruta: POST /api/admin/inventario (Añadir Ítem)
app.post('/api/admin/inventario', auth(['Administrador']), async (req, res) => {
    const { 
        categoria, nombre, descripcion_presentacion, stock_actual, stock_minimo, 
        fecha_vencimiento, principio_activo, concentracion 
    } = req.body;
    
    if (!categoria || !nombre || stock_actual === undefined || stock_minimo === undefined) {
        return res.status(400).json({ msg: 'Faltan campos obligatorios (Categoría, Nombre, Stock Actual, Stock Mínimo).' });
    }
    
    try {
        await pool.query(
            `INSERT INTO inventario_hospital (
                categoria, nombre, descripcion_presentacion, stock_actual, stock_minimo, 
                fecha_vencimiento, principio_activo, concentracion
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                categoria, nombre, descripcion_presentacion, stock_actual, stock_minimo, 
                fecha_vencimiento || null, // Acepta nulos
                (categoria === 'Medicamento') ? principio_activo : null, // Solo guarda si es Medicamento
                (categoria === 'Medicamento') ? concentracion : null // Solo guarda si es Medicamento
            ]
        );
        res.status(201).json({ msg: `${nombre} añadido al inventario.` });
    } catch (err) {
        console.error('Error al añadir inventario:', err.message);
        res.status(500).send('Error del servidor al registrar recurso.');
    }
});

// Ruta: PUT /api/admin/inventario/:id_recurso (Modificar Ítem)
app.put('/api/admin/inventario/:id_recurso', auth(['Administrador']), async (req, res) => {
    const { id_recurso } = req.params;
    const { 
        categoria, nombre, descripcion_presentacion, stock_actual, stock_minimo, 
        fecha_vencimiento, principio_activo, concentracion 
    } = req.body;
    
    try {
        const result = await pool.query(
            `UPDATE inventario_hospital 
             SET categoria = $1, nombre = $2, descripcion_presentacion = $3, 
                 stock_actual = $4, stock_minimo = $5, fecha_vencimiento = $6, 
                 principio_activo = $7, concentracion = $8
             WHERE id_recurso = $9
             RETURNING *`,
            [
                categoria, nombre, descripcion_presentacion, stock_actual, stock_minimo, 
                fecha_vencimiento || null,
                (categoria === 'Medicamento') ? principio_activo : null,
                (categoria === 'Medicamento') ? concentracion : null,
                id_recurso
            ]
        );
        if (result.rowCount === 0) return res.status(404).json({ msg: 'Ítem no encontrado.' });
        res.json({ msg: `Item ${nombre} actualizado.`, item: result.rows[0] });
    } catch (err) {
        console.error('Error al actualizar inventario:', err.message);
        res.status(500).send('Error del servidor.');
    }
});

// Ruta: DELETE /api/admin/inventario/:id_recurso (Eliminar Ítem)
app.delete('/api/admin/inventario/:id_recurso', auth(['Administrador']), async (req, res) => {
    const { id_recurso } = req.params;
    try {
        const result = await pool.query('DELETE FROM inventario_hospital WHERE id_recurso = $1', [id_recurso]);
        if (result.rowCount === 0) return res.status(404).json({ msg: 'Ítem no encontrado.' });
        res.json({ msg: 'Ítem eliminado del inventario.' });
    } catch (err) {
        console.error('Error al eliminar ítem:', err.message);
        res.status(500).send('Error del servidor.');
    }
});


// Ruta: GET /api/admin/pacientes
// Propósito: Listar todos los pacientes. Soporta búsqueda por cédula.
// Query: /api/admin/pacientes?cedula=V12345678
app.get('/api/admin/pacientes', auth(['Administrador']), async (req, res) => {
    const { cedula } = req.query; // Obtener el parámetro de búsqueda por cédula

    try {
        let queryText = `
            SELECT 
                u.id_usuario, 
                u.nombre, 
                u.apellido, 
                u.cedula, 
                u.email
            FROM usuarios u
            JOIN pacientes p ON u.id_usuario = p.fk_usuario
        `;
        let queryParams = [];

        if (cedula) {
            queryText += ' WHERE u.cedula LIKE $1';
            queryParams.push(`%${cedula}%`);
        }
        
        queryText += ' ORDER BY u.apellido ASC';

        const pacientes = await pool.query(queryText, queryParams);
        res.json(pacientes.rows);

    } catch (err) {
        console.error('Error al obtener lista de pacientes:', err.message);
        res.status(500).send('Error del servidor.');
    }
});


// Ruta: GET /api/admin/pacientes/:id_usuario/historial-registro (CORREGIDA)
// Propósito: Ver los datos de registro y antecedentes que el paciente completó.
app.get('/api/admin/pacientes/:id_usuario/historial-registro', auth(['Administrador']), async (req, res) => {
    const { id_usuario } = req.params;

    try {
        // --- INICIO CORRECCIÓN: Se añaden 4 campos al SELECT ---
        const datosCompletos = await pool.query(`
            SELECT 
                u.nombre, u.apellido, u.cedula, u.email, u.telefono, u.direccion_base,
                p.id_paciente, -- <--- AÑADIDO (Necesario para buscar citas)
                p.datos_socioeconomicos, p.datos_estudio, p.direccion_detallada,
                p.contacto_emergencia_nombre, -- <--- AÑADIDO
                p.contacto_emergencia_telefono, -- <--- AÑADIDO
                a.habito_alcohol, a.habito_tabaco, a.alergias, a.antecedentes_familiares,
                a.cirugia_previa, a.medicamentos_actuales, a.condicion_cronica
            FROM usuarios u
            JOIN pacientes p ON u.id_usuario = p.fk_usuario
            LEFT JOIN antecedentes_paciente a ON p.id_paciente = a.fk_paciente
            WHERE u.id_usuario = $1
        `, [id_usuario]);
        // --- FIN CORRECCIÓN ---

        if (datosCompletos.rows.length === 0) {
            return res.status(404).json({ msg: 'Paciente no encontrado.' });
        }
        
        res.json(datosCompletos.rows[0]);

    } catch (err) {
        console.error('Error al obtener historial de paciente por admin:', err.message);
        res.status(500).send('Error del servidor.');
    }
});


// Ruta: GET /api/admin/pacientes/:id_paciente/citas-pendientes (CORREGIDA)
// Propósito: Admin ve las citas pendientes de un paciente específico.
app.get('/api/admin/pacientes/:id_paciente/citas-pendientes', auth(['Administrador']), async (req, res) => {
    const { id_paciente } = req.params; // Usamos el id_paciente
    try {
        const citas = await pool.query(`
            SELECT 
                c.id_cita, c.fecha_hora_consulta, c.motivo_consulta, c.estado_cita,
                u.nombre AS doctor_nombre, u.apellido AS doctor_apellido, 
                d.especialidad AS especialidad -- <-- CORREGIDO: Tomar texto directo
            FROM citas c
            JOIN doctores d ON c.fk_doctor = d.id_doctor
            JOIN usuarios u ON d.fk_usuario = u.id_usuario
            -- Se eliminó el JOIN con especialidades
            WHERE c.fk_paciente = $1 AND c.estado_cita = 'Pendiente'
            ORDER BY c.fecha_hora_consulta ASC
        `, [id_paciente]);
        res.json(citas.rows);
    } catch (err) {
        console.error('Error al obtener citas pendientes de paciente:', err.message);
        res.status(500).json({ msg: 'Error del servidor al obtener citas.' });
    }
});

// ==============================================================================
// ... (Tu ruta GET /api/admin/pacientes/:id_paciente/citas-pendientes termina aquí)
// ==============================================================================

// RUTA NUEVA: GET /api/admin/pacientes/:id_paciente/citas-aceptadas
// Propósito: Admin ve las citas ACEPTADAS de un paciente específico.
app.get('/api/admin/pacientes/:id_paciente/citas-aceptadas', auth(['Administrador']), async (req, res) => {
    const { id_paciente } = req.params; // Usamos el id_paciente
    try {
        const citas = await pool.query(`
            SELECT 
                c.id_cita, c.fecha_hora_consulta, c.motivo_consulta, c.estado_cita,
                u.nombre AS doctor_nombre, u.apellido AS doctor_apellido, 
                d.especialidad AS especialidad
            FROM citas c
            JOIN doctores d ON c.fk_doctor = d.id_doctor
            JOIN usuarios u ON d.fk_usuario = u.id_usuario
            WHERE c.fk_paciente = $1 AND c.estado_cita = 'Aceptada' -- <-- La única diferencia
            ORDER BY c.fecha_hora_consulta DESC
        `, [id_paciente]);
        res.json(citas.rows);
    } catch (err) {
        console.error('Error al obtener citas aceptadas de paciente:', err.message);
        res.status(500).json({ msg: 'Error del servidor al obtener citas.' });
    }
});

// ==============================================================================
// (Tu ruta GET /api/admin/paciente/:id_paciente/visitas comienza aquí)
// ==============================================================================
















// Ruta: GET /api/admin/paciente/:id_paciente/visitas (NUEVA)
// Propósito: Admin ve el historial de visitas de un paciente.
app.get('/api/admin/paciente/:id_paciente/visitas', auth(['Administrador']), async (req, res) => {
    const { id_paciente } = req.params;
    try {
        const visitas = await pool.query(
            `SELECT v.*, 
                    (SELECT COUNT(*) FROM prescripciones p WHERE p.fk_visita = v.id_visita) > 0 as tiene_prescripcion,
                    u.nombre AS doctor_nombre, u.apellido AS doctor_apellido, d.especialidad
             FROM visitas_medicas v
             JOIN doctores d ON v.fk_doctor = d.id_doctor
             JOIN usuarios u ON d.fk_usuario = u.id_usuario
             WHERE v.fk_paciente = $1
             ORDER BY v.fecha_visita DESC`,
            [id_paciente]
        );
        res.json(visitas.rows);
    } catch (err) {
        console.error('Error al obtener visitas (admin):', err.message);
        res.status(500).json({ message: 'Error del servidor al obtener visitas.' });
    }
});








 

// ==============================================================================
// 7.8 RUTAS DE ADMINISTRADOR PARA CENSO Y CAMAS (Bloque Completo y Final)
// ==============================================================================

// 1. RUTA: GET /api/admin/pacientes/buscar-id (Búsqueda por Cédula)
// Esta ruta es la que estaba dando 500. Simplificada para máxima compatibilidad.
app.get('/api/admin/pacientes/buscar-id', auth(['Administrador']), async (req, res) => {
    const { cedula } = req.query; 

    if (!cedula) {
        return res.status(400).json({ msg: "La cédula es un parámetro de búsqueda requerido." });
    }

    try {
        const query = `
            SELECT 
                u.id_usuario, 
                u.nombre, 
                u.apellido, 
                u.cedula,
                r.nombre_rol 
            FROM usuarios u
            JOIN roles r ON u.fk_rol = r.id_rol
            -- 🚨 Se quitó la condición 'u.activo = TRUE' para evitar fallos por nombre de columna
            WHERE u.cedula = $1 AND r.nombre_rol IN ('Paciente', 'Doctor'); 
        `;
        
        const result = await pool.query(query, [cedula]); 

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: "Usuario no encontrado con esa cédula o no tiene el rol de Paciente/Doctor." });
        }

        res.json(result.rows[0]); 

    } catch (error) {
        // Muestra el error exacto en la consola del servidor (CRÍTICO para debug)
        console.error('CRITICAL: Error en /api/admin/pacientes/buscar-id:', error.message);
        // Devolvemos 500 al cliente
        res.status(500).json({ msg: "Error interno del servidor al buscar usuario. Verifique el log del servidor para detalles." });
    }
});


// server.js (Reemplaza el bloque app.get('/api/admin/camas', ...))

app.get('/api/admin/camas', auth(['Administrador']), async (req, res) => {
    try {
        const camas = await pool.query(`
            SELECT
                c.*, -- Selecciona todos los campos de camas
                
                -- Datos del PACIENTE (usando 'upac')
                upac.nombre AS paciente_nombre,
                upac.apellido AS paciente_apellido,
                upac.cedula AS paciente_cedula,
                c.motivo_ingreso,
                c.fecha_ingreso,
                
                -- Datos del DOCTOR (usando 'udoc')
                udoc.nombre AS doctor_nombre,
                udoc.apellido AS doctor_apellido,
                udoc.cedula AS doctor_cedula,
                
                -- Especialidad del doctor
                d.especialidad AS doctor_especialidad
            FROM camas c
            
            -- JOIN con USUARIOS para datos del PACIENTE
            LEFT JOIN usuarios upac ON c.fk_paciente_actual = upac.id_usuario 
            
            -- JOIN con USUARIOS para datos del DOCTOR
            LEFT JOIN usuarios udoc ON c.fk_doctor_acargo = udoc.id_usuario
            
            -- JOIN a la tabla DOCTORES para obtener la ESPECIALIDAD
            LEFT JOIN doctores d ON c.fk_doctor_acargo = d.fk_usuario 
            
            -- 🟢 CORRECCIÓN CRÍTICA: EXCLUIR CAMAS 'Q' ANTES DE CONVERTIR A ENTERO
            WHERE c.numero_cama NOT LIKE 'Q%' 
            
            -- 🟢 CORRECCIÓN FINAL: Ordenar de forma segura por valor numérico
            ORDER BY CAST(c.numero_cama AS INTEGER) ASC
        `);
        res.json(camas.rows);
    } catch (err) {
        console.error('Error al obtener censo de camas generales:', err.message);
        res.status(500).send('Error del servidor al cargar el censo.');
    }
});
// server.js

// server.js

// server.js (Reemplazar la ruta completa app.put('/api/admin/camas/:id_cama', ...)

// 3. RUTA: PUT /api/admin/camas/:id_cama (Actualizar Estado, Ocupar, Liberar)
app.put('/api/admin/camas/:id_cama', auth(['Administrador']), async (req, res) => {
    const { id_cama } = req.params;
    // Estos son los IDs de usuario (fk_usuario) que el cliente encontró con la Cédula:
    const { estado, fk_paciente_actual, motivo_ingreso, fk_doctor_acargo } = req.body; 

    if (!estado) {
        return res.status(400).json({ msg: "El nuevo estado de la cama es requerido." });
    }
    
    try {
        
        // Lógica de Liberación/Limpieza
        if (estado !== 'Ocupada') {
            await pool.query(
                `UPDATE camas SET 
                    estado = $1, 
                    fk_paciente_actual = NULL, 
                    motivo_ingreso = NULL, 
                    fk_doctor_acargo = NULL,
                    fecha_ingreso = NULL
                 WHERE id_cama = $2`,
                [estado, id_cama]
            );
            return res.json({ msg: `Cama ${id_cama} actualizada. Estado: ${estado}` });
        }

        // --- Lógica para OCUPADA (Usamos el ID de Usuario directamente) ---
        
        // 0. VERIFICACIÓN CRÍTICA DE DATOS NECESARIOS
        if (!fk_paciente_actual || !fk_doctor_acargo || !motivo_ingreso) {
            return res.status(400).json({ msg: "Faltan datos de paciente, doctor o motivo de ingreso para ocupar la cama." });
        }
        
        // 1. Validar que el paciente existe en la tabla de pacientes
        const pacienteCheck = await pool.query('SELECT 1 FROM pacientes WHERE fk_usuario = $1', [fk_paciente_actual]);
        if (pacienteCheck.rows.length === 0) {
            return res.status(400).json({ msg: `Error: El usuario con ID ${fk_paciente_actual} no está registrado en la tabla de pacientes.` });
        }
        
        // 2. Validar que el doctor existe y está activo en la tabla de doctores
        const doctorCheck = await pool.query('SELECT 1 FROM doctores WHERE fk_usuario = $1', [fk_doctor_acargo]);
        if (doctorCheck.rows.length === 0) {
            return res.status(400).json({ msg: `Error: El usuario con ID ${fk_doctor_acargo} no está registrado en la tabla de doctores (¿está activado?).` });
        }

        // 3. Ejecutar la actualización (Usando los IDs de usuario directamente)
        const query = `
            UPDATE camas 
            SET estado = $1, 
                fk_paciente_actual = $2, 
                motivo_ingreso = $3, 
                fk_doctor_acargo = $4,
                fecha_ingreso = NOW()
            WHERE id_cama = $5
            RETURNING *;
        `;
        
        const result = await pool.query(query, [
            estado, 
            fk_paciente_actual, // <-- ¡CORREGIDO! Usamos el ID de USUARIO
            motivo_ingreso, 
            fk_doctor_acargo,   // <-- ¡CORREGIDO! Usamos el ID de USUARIO
            id_cama
        ]); 

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: "Cama no encontrada." });
        }

        res.json({ msg: "Cama actualizada exitosamente", cama: result.rows[0] });

    } catch (error) {
        // Bloque final para asegurar que se responda JSON ante cualquier fallo
        console.error('Error FATAL al actualizar cama:', error.message, error.stack);
        res.status(500).json({ msg: "Error interno FATAL del servidor. Revise las logs de la DB, la causa probable es una cédula incorrecta o un Doctor inactivo." });
    }
});
 
 
 
 


// ==============================================================================
// GESTIÓN DE ALERTAS EPIDEMIOLÓGICAS (AJUSTADA A TU SQL)
// ==============================================================================

// Ruta: POST /api/admin/alertas/crear (MODIFICADA PARA NOTIFICAR)
app.post('/api/admin/alertas/crear', auth(['Administrador']), async (req, res) => {
    const { titulo, descripcion, nivel_gravedad } = req.body;
    const fk_usuario_reporta = req.user.id; 

    if (!titulo || !descripcion || !nivel_gravedad) {
        return res.status(400).json({ msg: 'Faltan campos obligatorios (titulo, descripcion, nivel_gravedad).' });
    }
    
    // Usamos un cliente para una transacción
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Registrar la alerta (como antes)
        await client.query(
            `INSERT INTO alertas_epidemiologicas (fk_usuario_reporta, titulo, descripcion, nivel_gravedad) 
             VALUES ($1, $2, $3, $4)`,
            [fk_usuario_reporta, titulo, descripcion, nivel_gravedad]
        );
        
        // 2. Registrar la Notificación Global para PACIENTES
        const mensaje_paciente = `Alerta de Salud (Nivel ${nivel_gravedad}): ${titulo}. Revise su correo para más detalles o contacte al hospital.`;
        await client.query(
            `INSERT INTO notificaciones_globales (nivel_gravedad, titulo, mensaje, fk_usuario_admin)
             VALUES ($1, $2, $3, $4)`,
            [nivel_gravedad, `Alerta de Salud: ${titulo}`, descripcion, fk_usuario_reporta]
        );

        // 3. Obtener correos de Doctores y Administradores para EMAIL
        const staffEmails = await client.query(`
            SELECT u.email FROM usuarios u
            JOIN roles r ON u.fk_rol = r.id_rol
            WHERE r.nombre_rol IN ('Administrador', 'Doctor')
        `);

        // 4. Enviar correos (sin esperar a que terminen)
        const emailSubject = `ALERTA EPIDEMIOLÓGICA (Nivel ${nivel_gravedad}): ${titulo}`;
        const emailHtml = `
            <h1>Alerta Epidemiológica Nivel ${nivel_gravedad}</h1>
            <p>Reportada por: Administrador (ID: ${fk_usuario_reporta})</p>
            <p><strong>Título:</strong> ${titulo}</p>
            <hr>
            <p><strong>Descripción / Detalles:</strong></p>
            <p>${descripcion}</p>
            <hr>
            <p>Por favor, tome las medidas pertinentes. Este correo fue enviado a todo el personal médico y administrativo.</p>
        `;
        
        for (const row of staffEmails.rows) {
            enviarCorreo(row.email, emailSubject, emailHtml);
        }
        console.log(`Notificación de alerta enviada a ${staffEmails.rowCount} miembros del personal.`);

        // 5. Confirmar transacción
        await client.query('COMMIT');
        res.status(201).json({ msg: 'Alerta epidemiológica creada y notificada con éxito.' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al crear alerta epidemiológica:', err.message);
        res.status(500).send('Error del servidor al registrar la alerta.');
    } finally {
        client.release();
    }
});
// Ruta: GET /api/admin/alertas
// Propósito: Obtener el historial de alertas epidemiológicas
app.get('/api/admin/alertas', auth(['Administrador']), async (req, res) => {
    try {
        const alertas = await pool.query(`
            SELECT 
                a.id_alerta, 
                a.titulo, 
                a.descripcion, 
                a.nivel_gravedad, 
                a.fecha_creacion,
                u.nombre AS reporta_nombre,
                u.apellido AS reporta_apellido
            FROM alertas_epidemiologicas a
            JOIN usuarios u ON a.fk_usuario_reporta = u.id_usuario
            ORDER BY a.fecha_creacion DESC
        `);
        res.json(alertas.rows);
    } catch (err) {
        console.error('Error al obtener alertas:', err.message);
        res.status(500).send('Error del servidor.');
    }
});


// Ruta: DELETE /api/admin/alertas/:id_alerta (NUEVA)
// Propósito: Eliminar una alerta epidemiológica
app.delete('/api/admin/alertas/:id_alerta', auth(['Administrador']), async (req, res) => {
    const { id_alerta } = req.params;
    try {
        const result = await pool.query('DELETE FROM alertas_epidemiologicas WHERE id_alerta = $1', [id_alerta]);
        if (result.rowCount === 0) {
            return res.status(404).json({ msg: 'Alerta no encontrada.' });
        }
        res.json({ msg: 'Alerta eliminada exitosamente.' });
    } catch (err) {
        console.error('Error al eliminar alerta:', err.message);
        res.status(500).send('Error del servidor.');
    }
});







// Ruta: PUT /api/admin/actualizar-usuario (NUEVA)
// Propósito: Permitir al admin actualizar sus datos de acceso (pass)
app.put('/api/admin/actualizar-usuario', auth(['Administrador']), async (req, res) => {
    // Solo permitimos cambiar la contraseña por ahora
    const { contrasena_actual, nueva_contrasena } = req.body;
    const fk_usuario = req.user.id; 

    try {
        const userRes = await pool.query('SELECT contrasena_hash FROM usuarios WHERE id_usuario = $1', [fk_usuario]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario admin no encontrado.' });
        }
        const user = userRes.rows[0];

        // 1. VALIDACIÓN DE CONTRASEÑA ACTUAL
        if (!contrasena_actual || !(await bcrypt.compare(contrasena_actual, user.contrasena_hash))) {
            return res.status(401).json({ message: 'Contraseña actual incorrecta.' });
        }

        // 2. Validación de nueva contraseña
        if (!nueva_contrasena || nueva_contrasena.length < 6) {
            return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
        }

        // 3. Hashear y guardar
        const newHash = await bcrypt.hash(nueva_contrasena, 10);
        await pool.query('UPDATE usuarios SET contrasena_hash = $1 WHERE id_usuario = $2', [newHash, fk_usuario]);

        res.json({ message: '✅ Contraseña actualizada. Deberá iniciar sesión de nuevo.', requires_relogin: true });

    } catch (err) {
        console.error('Error al actualizar datos de admin:', err.message);
        res.status(500).json({ message: 'Error del servidor al actualizar sus datos.' });
    }
});



// server.js (en la sección de rutas /api/admin)

// server.js (en la sección de rutas /api/admin)

// ------------------------------------------------------------------------------
// 8. RECURSOS HUMANOS (CRUD BÁSICO)
// ------------------------------------------------------------------------------

// RUTA: POST /api/admin/recursos-humanos (Crear Personal)
app.post('/api/admin/recursos-humanos', auth(['Administrador']), async (req, res) => {
    const { nombre, apellido, cedula, telefono, email, cargo, horario } = req.body;
    if (!nombre || !apellido || !cedula || !cargo || !horario) {
        return res.status(400).json({ msg: 'Faltan campos obligatorios para el registro de personal.' });
    }
    try {
        await pool.query(
            `INSERT INTO personal_rrhh (nombre, apellido, cedula, telefono, email, cargo, horario) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [nombre, apellido, cedula, telefono, email, cargo, horario]
        );
        res.status(201).json({ msg: 'Personal registrado con éxito.' });
    } catch (err) {
        // Error 23505 es por clave única (cédula duplicada)
        if (err.code === '23505') { 
            return res.status(409).json({ msg: 'La cédula ya está registrada en el personal.' });
        }
        console.error('Error al agregar personal:', err.message);
        res.status(500).json({ msg: 'Error del servidor al agregar personal.' });
    }
});

// RUTA: GET /api/admin/recursos-humanos (Obtener/Buscar Personal)
app.get('/api/admin/recursos-humanos', auth(['Administrador']), async (req, res) => {
    const { search } = req.query; // Captura el parámetro 'search' de la URL
    let queryText = `
        SELECT id_personal, nombre, apellido, cedula, telefono, email, cargo, horario
        FROM personal_rrhh
    `;
    let queryParams = [];
    
    // 🟢 LÓGICA DE BÚSQUEDA POR CÉDULA, NOMBRE O CARGO 🟢
    if (search) {
        // $1 se usará para el parámetro de búsqueda
        queryParams.push(`%${search}%`);
        queryText += ` 
            WHERE nombre ILIKE $1 OR apellido ILIKE $1 OR cedula ILIKE $1 OR cargo ILIKE $1
        `;
    }
    
    queryText += ` ORDER BY cargo, apellido`;
    
    try {
        const personal = await pool.query(queryText, queryParams);
        res.json(personal.rows);
    } catch (err) {
        console.error('Error al obtener personal:', err.message);
        res.status(500).json({ msg: 'Error del servidor al obtener personal.' });
    }
});

// RUTA: PUT /api/admin/recursos-humanos/:id_personal (Editar Personal)
app.put('/api/admin/recursos-humanos/:id_personal', auth(['Administrador']), async (req, res) => {
    const { id_personal } = req.params;
    // Solo se permite editar estos campos, no la cédula ni el nombre.
    const { telefono, email, cargo, horario } = req.body; 
    
    try {
        const result = await pool.query(
            `UPDATE personal_rrhh 
             SET telefono = $1, email = $2, cargo = $3, horario = $4
             WHERE id_personal = $5
             RETURNING *`,
            [telefono, email, cargo, horario, id_personal]
        );
        if (result.rowCount === 0) return res.status(404).json({ msg: 'Personal no encontrado.' });
        res.json({ msg: 'Datos de personal actualizados.' });
    } catch (err) {
        console.error('Error al actualizar personal:', err.message);
        res.status(500).json({ msg: 'Error del servidor al actualizar personal.' });
    }
});

// RUTA: DELETE /api/admin/recursos-humanos/:id_personal (Eliminar Personal)
app.delete('/api/admin/recursos-humanos/:id_personal', auth(['Administrador']), async (req, res) => {
    const { id_personal } = req.params;
    try {
        const result = await pool.query('DELETE FROM personal_rrhh WHERE id_personal = $1', [id_personal]);
        if (result.rowCount === 0) return res.status(404).json({ msg: 'Personal no encontrado.' });
        res.json({ msg: 'Personal eliminado con éxito.' });
    } catch (err) {
        console.error('Error al eliminar personal:', err.message);
        res.status(500).json({ msg: 'Error del servidor al eliminar personal.' });
    }
});
// ------------------------------------------------------------------------------
// 8.X RUTA CENSO QUIRÓFANO
// ------------------------------------------------------------------------------

// RUTA: GET /api/admin/camas/quirofano
// Propósito: Listar solo las 7 camas del quirófano
app.get('/api/admin/camas/quirofano', auth(['Administrador']), async (req, res) => {
    try {
        // La consulta busca camas cuyo número empiece con 'Q' (Q1, Q2, etc.)
        const camas = await pool.query(`
            SELECT
                c.*, 
                upac.nombre AS paciente_nombre, upac.apellido AS paciente_apellido, upac.cedula AS paciente_cedula,
                udoc.nombre AS doctor_nombre, udoc.apellido AS doctor_apellido, udoc.cedula AS doctor_cedula,
                d.especialidad AS doctor_especialidad
            FROM camas c
            LEFT JOIN usuarios upac ON c.fk_paciente_actual = upac.id_usuario 
            LEFT JOIN usuarios udoc ON c.fk_doctor_acargo = udoc.id_usuario
            LEFT JOIN doctores d ON c.fk_doctor_acargo = d.fk_usuario 
            WHERE c.numero_cama LIKE 'Q%' 
            ORDER BY c.numero_cama ASC
        `);
        res.json(camas.rows);
    } catch (err) {
        console.error('Error al obtener censo de quirófano:', err.message);
        res.status(500).send('Error del servidor al cargar el censo de quirófano.');
    }
});








































// ==============================================================================
// EXPORTACIONES PARA MÓDULOS (NECESARIO PARA EL MÓDULO RENAL)
// ==============================================================================
module.exports = { pool, auth };









// ==============================================================================
// 9. INICIO DEL SERVIDOR
// ==============================================================================
app.listen(PORT, () => {
    console.log('----------------------------------------------------');
    console.log(`🏥 Hospital Dr Adolfo D' Empaire - Servidor Iniciado`);
    console.log(`🚀 Servidor Node.js escuchando en http://localhost:${PORT}`);
    console.log('----------------------------------------------------');

});











