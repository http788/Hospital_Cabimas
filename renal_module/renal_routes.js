// renal_module/renal_routes.js

const express = require('express');
const router = express.Router();
const renalController = require('./renal_controller');

// Importamos nuestros nuevos middlewares de autenticación del módulo
const { auth, getDoctorProfile, isNephrologist } = require('./renal_auth');

// ---
// 1. RUTAS DE VISTAS (Las que cargan las páginas HTML)
// ---

// La ruta principal del Nefrólogo (la que usa el login para redirigir)
router.get(
    '/doctor/dashboard', 
    auth(['Doctor']),     // 1. ¿Es Doctor? (Token válido)
    getDoctorProfile,     // 2. Obtiene su perfil (id_doctor, especialidad)
    isNephrologist,       // 3. ¿Es Nefrólogo?
    renalController.renderNephrologistDashboard // 4. Carga el HTML
);

// Ruta del Paciente (Aún no la hemos creado, pero la definimos)
router.get(
    '/paciente/dashboard',
    auth(['Paciente']), // Protegido por rol Paciente
    renalController.renderPatientDashboard
);

// Ruta del Administrador (Aún no la hemos creado, pero la definimos)
router.get(
    '/admin/dashboard',
    auth(['Administrador']), // Protegido por rol Admin
    renalController.renderAdminDashboard
);


// ---
// 2. RUTAS DE API (Las que alimentan de DATOS al frontend)
// ---

// API para las tarjetas del Dashboard de IA
router.get(
    '/api/dashboard-ia',
    auth(['Doctor']),
    getDoctorProfile,
    isNephrologist, 
    renalController.getIADashboardData
);

// API para la vista "Análisis de Big Data"
router.get(
    '/api/analisis-big-data',
    auth(['Doctor']),
    getDoctorProfile,
    isNephrologist, 
    renalController.getBigDataAnalytics
);

// API para la vista "Monitoreo Remoto (IoT)"
router.get(
    '/api/monitoreo-iot',
    auth(['Doctor']),
    getDoctorProfile,
    isNephrologist, 
    renalController.getIotMonitorData
);

module.exports = router;