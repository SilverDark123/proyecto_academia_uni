// routes/enrollmentRoutes.js
const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación

router.use(verifyToken);

// Rutas admin
router.get('/admin', restrictTo('admin'), enrollmentController.getAllAdmin);
router.put('/status', restrictTo('admin'), enrollmentController.updateStatus);
router.get('/by-offering', restrictTo('admin'), enrollmentController.getByOffering);

// Obtener matrículas del estudiante autenticado (o usar query.student_id si admin)
router.get('/', enrollmentController.getAll);

// Crear matrículas (solo estudiantes)
router.post('/', restrictTo('student'), enrollmentController.create);

// Cancelar matrícula propia (solo estudiantes)
router.post('/cancel', restrictTo('student'), enrollmentController.cancelOwn);

module.exports = router;
