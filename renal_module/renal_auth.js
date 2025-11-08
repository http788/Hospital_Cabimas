// renal_module/renal_auth.js

// 1. Importamos el pool y el auth que acabamos de exportar de server.js
const { pool, auth } = require('../server.js');

// 2. Almacenaremos el ID de la especialidad aquí para no consultarlo cada vez
let NEPHROLOGY_ID = null;

// Función para obtener y guardar el ID de 'Nefrología'
const getNephrologyId = async () => {
    if (NEPHROLOGY_ID) return NEPHROLOGY_ID; 

    try {
        const result = await pool.query("SELECT id_especialidad FROM especialidades WHERE nombre_especialidad = 'Nefrología';");
        if (result.rows.length === 0) {
            console.error("ERROR CRÍTICO: La especialidad 'Nefrología' no se encontró en la base de datos.");
            return null;
        }
        NEPHROLOGY_ID = result.rows[0].id_especialidad;
        console.log("ID de Nefrología cargado:", NEPHROLOGY_ID);
        return NEPHROLOGY_ID;
    } catch (error) {
        console.error("Error al buscar ID de Nefrología:", error);
        return null;
    }
};
// Precargamos el ID al iniciar el servidor
getNephrologyId();

// 3. Middleware que OBTIENE el perfil de doctor
// (Necesario porque tu JWT de login solo guarda req.user.id y req.user.rol)
const getDoctorProfile = async (req, res, next) => {
    if (!req.user || req.user.rol !== 'Doctor') {
        return res.status(403).send("Acceso denegado. No es un doctor.");
    }
    
    try {
        // Tu server.js guarda el ID de USUARIO en req.user.id
        const fk_usuario = req.user.id;
        
        // Buscamos al doctor y su especialidad
        const doctorResult = await pool.query(
            // Tu tabla 'doctores' usa 'especialidad' para el NOMBRE, no para el ID
            // Actualización: Tu tabla 'doctores' usa 'especialidad' (varchar)
            `SELECT d.id_doctor, d.especialidad 
             FROM doctores d 
             WHERE d.fk_usuario = $1`,
            [fk_usuario]
        );
        
        if (doctorResult.rows.length === 0) {
            return res.status(404).send("Perfil de doctor no encontrado.");
        }
        
        // Añadimos el perfil del doctor al request para que la siguiente función lo use
        req.doctor = doctorResult.rows[0]; // { id_doctor: 123, especialidad: 'Nefrología' }
        next();

    } catch (error) {
        console.error("Error en middleware getDoctorProfile:", error);
        res.status(500).send("Error de servidor al verificar perfil de doctor.");
    }
};


// 4. Middleware que VERIFICA si es Nefrólogo
const isNephrologist = async (req, res, next) => {
    // Esta función asume que getDoctorProfile ya se ejecutó
    if (req.doctor && req.doctor.especialidad === 'Nefrología') {
        next(); // ¡Es Nefrólogo! Permitir el paso.
    } else {
        res.status(403).send("Acceso denegado: Este módulo es solo para Nefrólogos.");
    }
};

// 5. Exportamos tu 'auth' original y los nuevos middlewares
module.exports = {
    auth: auth, // Tu auth original de server.js
    getDoctorProfile: getDoctorProfile,
    isNephrologist: isNephrologist
};