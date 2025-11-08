// renal_module/renal_controller.js

const path = require('path');
// Importamos el Modelo de datos (el que hace el SQL)
const RenalModel = require('./renal_model');

// ---
// 1. CONTROLADORES DE VISTAS (HTML)
// ---

// Define la ruta base de los HTML de este módulo
const VIEWS_ROOT = path.join(__dirname, '..', 'public_renal');

// Carga el panel del Nefrólogo
exports.renderNephrologistDashboard = (req, res) => {
    // Corregido al nombre de tu archivo final
    res.sendFile('doctor_nefrologo.html', { root: VIEWS_ROOT });
};

// Carga el panel del Paciente
exports.renderPatientDashboard = (req, res) => {
    // (Debes crear este HTML en /public_renal)
    res.sendFile('paciente_dashboard.html', { root: VIEWS_ROOT });
};

// Carga el panel del Admin
exports.renderAdminDashboard = (req, res) => {
    // (Debes crear este HTML en /public_renal)
    res.sendFile('admin_dashboard.html', { root: VIEWS_ROOT });
};


// ---
// 2. CONTROLADORES DE API (DATOS JSON)
// ---

// Obtiene los datos para las tarjetas del Dashboard de IA
exports.getIADashboardData = async (req, res) => {
    try {
        // req.doctor fue añadido por el middleware 'getDoctorProfile'
        const id_doctor = req.doctor.id_doctor; 
        
        // Llamamos al Modelo para obtener los datos de la BD
        const totalAlerts = await RenalModel.getAlertCount();
        const avgEgfr = await RenalModel.getAverageEgfr();
        const dialysisPrediction = await RenalModel.getDialysisPrediction();
        const avgCreatinine = await RenalModel.getAverageCreatinine();
        const topAlert = await RenalModel.getTopAlert();

        // Devolvemos los datos como JSON
        res.json({
            totalAlerts: totalAlerts,
            avgEgfr: avgEgfr,
            dialysisPrediction: dialysisPrediction,
            avgCreatinine: avgCreatinine,
            topAlert: topAlert
        });
        
    } catch (error) {
        console.error("Error en getIADashboardData:", error);
        res.status(500).json({ error: "Error al obtener datos del dashboard." });
    }
};

// Obtiene los datos para la vista "Análisis de Big Data"
exports.getBigDataAnalytics = async (req, res) => {
    try {
        const data = await RenalModel.getBigDataCharts(req.doctor.id_doctor);
        res.json(data);
    } catch (error) {
        console.error("Error en getBigDataAnalytics:", error);
        res.status(500).json({ error: "Error al obtener gráficos." });
    }
};

// Obtiene los datos para la vista "Monitoreo Remoto (IoT)"
exports.getIotMonitorData = async (req, res) => {
    try {
        // Esta vista probablemente necesitará un ID de paciente
        const { id_paciente } = req.query;
        if (!id_paciente) {
            return res.status(400).json({ error: "Se requiere un id_paciente." });
        }
        const data = await RenalModel.getIotData(id_paciente);
        res.json(data);
    } catch (error) {
        console.error("Error en getIotMonitorData:", error);
        res.status(500).json({ error: "Error al obtener datos de IoT." });
    }
};