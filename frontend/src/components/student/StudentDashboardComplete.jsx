// src/components/student/StudentDashboardComplete.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  School as SchoolIcon,
  Book as BookIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { enrollmentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const StudentDashboardComplete = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadEnrollments();
    }
  }, [user]);

  const loadEnrollments = async () => {
    try {
      setLoading(true);
      const data = await enrollmentsAPI.getAll();
      setEnrollments(data);
    } catch (err) {
      console.error('Error cargando matrículas:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Ocultar matrículas canceladas y cursos que pertenecen a un paquete
  const visibleEnrollments = enrollments.filter((e) => {
    if (e.status === 'cancelado') {
      return false;
    }
    if (e.enrollment_type === 'course' && e.package_offering_id) {
      return false;
    }
    return true;
  });

  const stats = {
    totalEnrollments: visibleEnrollments.length,
    acceptedEnrollments: visibleEnrollments.filter(e => e.status === 'aceptado').length,
    pendingEnrollments: visibleEnrollments.filter(e => e.status === 'pendiente').length,
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard Estudiante
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom sx={{ mb: 3 }}>
        Bienvenido, {user?.name || 'Estudiante'}
      </Typography>

      {/* Estadísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <BookIcon color="primary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Matrículas
                  </Typography>
                  <Typography variant="h4">{stats.totalEnrollments}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <SchoolIcon color="success" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Matrículas Aceptadas
                  </Typography>
                  <Typography variant="h4">{stats.acceptedEnrollments}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PaymentIcon color="warning" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Matrículas Pendientes
                  </Typography>
                  <Typography variant="h4">{stats.pendingEnrollments}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Acciones rápidas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cursos Disponibles
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Explora y matricúlate en los cursos disponibles
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                onClick={() => navigate('/student/available-courses')}
              >
                Ver Cursos
              </Button>
            </CardActions>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Mis Matrículas
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Revisa el estado de tus matrículas y pagos
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                onClick={() => navigate('/student/my-enrollments')}
              >
                Ver Matrículas
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Matrículas recientes */}
      {visibleEnrollments.length > 0 && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Mis Matrículas Recientes
          </Typography>
          <Grid container spacing={2}>
            {visibleEnrollments
              .map((enrollment) => (
                <Grid item xs={12} md={4} key={enrollment.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">{enrollment.item_name || 'Curso/Paquete'}</Typography>
                      <Chip
                        label={enrollment.status}
                        color={enrollment.status === 'aceptado' ? 'success' : 'warning'}
                        size="small"
                        sx={{ mt: 1 }}
                      />
                      {enrollment.cycle_name && (
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                          Ciclo: {enrollment.cycle_name}
                        </Typography>
                      )}
                      {(enrollment.cycle_start_date || enrollment.cycle_end_date) && (
                        <Typography variant="body2" color="textSecondary">
                          {enrollment.cycle_start_date
                            ? new Date(enrollment.cycle_start_date).toLocaleDateString()
                            : '-'}{' '}
                          -{' '}
                          {enrollment.cycle_end_date
                            ? new Date(enrollment.cycle_end_date).toLocaleDateString()
                            : '-'}
                        </Typography>
                      )}
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        S/. {parseFloat(enrollment.item_price || 0).toFixed(2)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default StudentDashboardComplete;

