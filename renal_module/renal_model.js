// renal_module/renal_model.js

// Importamos el pool de conexión que exportamos de server.js
const { pool } = require('../server.js');

class RenalModel {

    // =================================================================
    // FUNCIONES PARA EL DASHBOARD DE IA (Las tarjetas de datos)
    // =================================================================

    /**
     * 1. Tarjeta: Cuenta pacientes con predicciones de alto riesgo.
     */
    static async getAlertCount() {
        try {
            // Consulta la nueva tabla 'ai_predictions'
            const query = `
                SELECT COUNT(DISTINCT fk_paciente) 
                FROM ai_predictions 
                WHERE risk_score > 0.85;`; // Riesgo alto (ej: 85%)
            const result = await pool.query(query);
            return parseInt(result.rows[0].count) || 0;
        } catch (error) {
            console.error("Error en RenalModel.getAlertCount:", error.message);
            throw error;
        }
    }

    /**
     * 2. Tarjeta: Calcula el promedio de eGFR (Tasa de Filtración Glomerular)
     */
    static async getAverageEgfr() {
        try {
            // Consulta la nueva tabla 'renal_iot_data'
            const query = `
                SELECT AVG(egfr_score) as average 
                FROM renal_iot_data 
                WHERE "timestamp" > (NOW() - INTERVAL '30 days');`; // Promedio del último mes
            const result = await pool.query(query);
            // .toFixed(1) formatea el número a 1 decimal (ej: 45.2)
            return parseFloat(result.rows[0].average || 0).toFixed(1);
        } catch (error) {
            console.error("Error en RenalModel.getAverageEgfr:", error.message);
            throw error;
        }
    }

    /**
     * 3. Tarjeta: Calcula el promedio de Creatinina (del monitoreo IoT)
     */
    static async getAverageCreatinine() {
        try {
            // Consulta la nueva tabla 'renal_iot_data'
            const query = `
                SELECT AVG(creatinina_mg_dl) as average 
                FROM renal_iot_data 
                WHERE "timestamp" > (NOW() - INTERVAL '30 days');`;
            const result = await pool.query(query);
            return parseFloat(result.rows[0].average || 0).toFixed(2); // 2 decimales (ej: 1.68)
        } catch (error) {
            console.error("Error en RenalModel.getAverageCreatinine:", error.message);
            throw error;
        }
    }

    /**
     * 4. Tarjeta: Predicción de Diálisis (Simulación)
     */
    static async getDialysisPrediction() {
        // En un sistema real, aquí llamarías a tu modelo de Machine Learning
        // Por ahora, devolvemos un número simulado
        return 7.8; 
    }

    /**
     * 5. Alerta Principal: Busca la predicción de IA más alta (más riesgosa)
     */
    static async getTopAlert() {
        try {
            // Consulta 'ai_predictions' y la une con 'usuarios'
            const query = `
                SELECT 
                    a.risk_score, 
                    a.justification, 
                    a.next_action,
                    u.nombre,
                    u.apellido
                FROM ai_predictions a
                JOIN pacientes p ON a.fk_paciente = p.id_paciente
                JOIN usuarios u ON p.fk_usuario = u.id_usuario
                ORDER BY a.risk_score DESC
                LIMIT 1;`;
            const result = await pool.query(query);

            if (result.rows.length === 0) {
                return {
                    riskScore: 0.00,
                    patientName: "Sin alertas críticas por el momento.",
                    diagnosis: ""
                };
            }
            
            const alert = result.rows[0];
            return {
                riskScore: alert.risk_score,
                patientName: `Paciente: ${alert.nombre} ${alert.apellido}`,
                diagnosis: alert.justification || alert.next_action
            };
            
        } catch (error) {
            console.error("Error en RenalModel.getTopAlert:", error.message);
            throw error;
        }
    }

    // =================================================================
    // FUNCIONES PARA OTRAS VISTAS (IoT, Big Data)
    // =================================================================

    /**
     * Obtiene todos los datos de telemetría de UN paciente
     */
    static async getIotData(id_paciente) {
        try {
            const query = `
                SELECT * FROM renal_iot_data 
                WHERE fk_paciente = $1 
                ORDER BY "timestamp" DESC 
                LIMIT 100;`; // Trae los últimos 100 registros
            const result = await pool.query(query, [id_paciente]);
            return result.rows;
        } catch (error) {
            console.error("Error en RenalModel.getIotData:", error.message);
            throw error;
        }
    }

    /**
     * Obtiene datos para los gráficos de Big Data
     */
    static async getBigDataCharts() {
        // (Lógica futura para gráficos complejos)
        return { message: "Datos de Big Data (eGFR vs Urea) irán aquí." };
    }
}

module.exports = RenalModel;