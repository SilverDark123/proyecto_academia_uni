// src/components/student/StudentAvailableCourses.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import { coursesAPI, packagesAPI, cyclesAPI, enrollmentsAPI, schedulesAPI } from '../../services/api';

const StudentAvailableCourses = () => {
  const [courses, setCourses] = useState([]);
  const [packages, setPackages] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [schedulesPreview, setSchedulesPreview] = useState({});
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesData, packagesData, cyclesData, packageOfferingsData] = await Promise.all([
        coursesAPI.getAll(),
        packagesAPI.getAll(),
        cyclesAPI.getActive(),
        packagesAPI.getOfferings().catch(() => []), // Si falla, usar array vacío
      ]);
      setCourses(coursesData);
      setCycles(cyclesData);
      
      // Guardar las ofertas de paquetes para usarlas después
      const packagesWithOfferings = packagesData.map(pkg => {
        const offerings = packageOfferingsData.filter(po => po.package_id === pkg.id);
        return { ...pkg, offerings };
      });
      setPackages(packagesWithOfferings);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar cursos disponibles');
    } finally {
      setLoading(false);
    }
  };

  // Obtener ofertas de cursos (sin filtrar por ciclos activos)
  const getCourseOfferings = (course) => {
    if (!course.offerings || course.offerings.length === 0) return [];
    return course.offerings;
  };

  const toggleSelection = (type, offeringId, name, price, cycleName, cycleStartDate, cycleEndDate) => {
    const key = `${type}-${offeringId}`;
    const exists = selectedItems.find(item => item.key === key);
    if (exists) {
      setSelectedItems(selectedItems.filter(item => item.key !== key));
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          key,
          type,
          id: offeringId,
          name,
          price,
          cycle_name: cycleName,
          cycle_start_date: cycleStartDate,
          cycle_end_date: cycleEndDate,
        },
      ]);
    }
  };

  const handleEnroll = async () => {
    if (selectedItems.length === 0) {
      setError('Selecciona al menos un curso o paquete');
      return;
    }

    try {
      setError('');
      const items = selectedItems.map(item => ({
        type: item.type,
        id: item.id,
      }));
      const result = await enrollmentsAPI.create(items);
      setSuccess('Matrícula creada correctamente. Ahora puedes subir el voucher de pago.');
      setSelectedItems([]);
      setOpenDialog(false);
      // Recargar datos
      loadData();
    } catch (err) {
      const msg = (err && err.message) ? err.message : '';
      let friendly = 'Error al crear matrícula';
      if (msg.includes('Ya existe una matrícula de paquete que cubre este curso')) {
        friendly = 'No puedes matricular este curso porque ya está incluido en el paquete elegido.';
      } else if (msg.includes('El estudiante ya está matriculado en cursos que pertenecen a este paquete')) {
        friendly = 'No puedes matricular el paquete porque ya tienes cursos individuales de ese paquete. Retira esos cursos o elige otro paquete.';
      } else if (msg.includes('El estudiante ya está matriculado en este curso')) {
        friendly = 'Ya estás matriculado en este curso.';
      } else if (msg.includes('El estudiante ya está matriculado en este paquete')) {
        friendly = 'Ya estás matriculado en este paquete.';
      }
      setError(friendly);
    }
  };

  const total = selectedItems.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);

  useEffect(() => {
    const loadSchedulesPreview = async () => {
      if (!openDialog || selectedItems.length === 0) {
        setSchedulesPreview({});
        return;
      }
      try {
        setLoadingSchedules(true);
        const results = {};
        for (const item of selectedItems) {
          try {
            if (item.type === 'course') {
              const data = await schedulesAPI.getByCourseOffering(item.id);
              results[item.key] = data || [];
            } else if (item.type === 'package') {
              const data = await schedulesAPI.getByPackageOffering(item.id);
              results[item.key] = data || [];
            }
          } catch (e) {
            results[item.key] = [];
          }
        }
        setSchedulesPreview(results);
      } finally {
        setLoadingSchedules(false);
      }
    };
    loadSchedulesPreview();
  }, [openDialog, JSON.stringify(selectedItems)]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Cursos y Paquetes Disponibles
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Cursos */}
      <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
        Cursos
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {courses.map((course) => {
          const offerings = getCourseOfferings(course);
          if (offerings.length === 0) {
            return (
              <Grid item xs={12} md={6} lg={4} key={`course-empty-${course.id}`}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{course.name}</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      {course.description || 'Sin descripción'}
                    </Typography>
                    <Chip label="Sin ofertas disponibles" size="small" sx={{ mr: 1, mb: 1 }} />
                    <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                      S/. {parseFloat(course.base_price || 0).toFixed(2)}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" variant="outlined" disabled>
                      No disponible
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          }

          return offerings.map((offering) => {
            const price = offering.price_override || course.base_price || 0;
            const isSelected = selectedItems.some(item => item.key === `course-${offering.id}`);
            
            return (
              <Grid item xs={12} md={6} lg={4} key={offering.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{course.name}</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      {course.description || 'Sin descripción'}
                    </Typography>
                    <Chip
                      label={offering.group_label || 'Grupo'}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                    <Chip
                      label={offering.cycle_name || 'Ciclo'}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    {offering.first_name && offering.last_name && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Docente: {offering.first_name} {offering.last_name}
                      </Typography>
                    )}
                    <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                      S/. {parseFloat(price).toFixed(2)}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      variant={isSelected ? 'outlined' : 'contained'}
                      onClick={() =>
                        toggleSelection(
                          'course',
                          offering.id,
                          course.name,
                          price,
                          offering.cycle_name,
                          offering.cycle_start_date,
                          offering.cycle_end_date,
                        )
                      }
                    >
                      {isSelected ? 'Quitar' : 'Seleccionar'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          });
        })}
      </Grid>

      {/* Paquetes */}
      <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
        Paquetes
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {packages.map((pkg) => {
          const offerings = pkg.offerings || [];
          if (offerings.length === 0) {
            return (
              <Grid item xs={12} md={6} lg={4} key={`package-empty-${pkg.id}`}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{pkg.name}</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      {pkg.description || 'Sin descripción'}
                    </Typography>
                    <Chip label="Sin ofertas disponibles" size="small" sx={{ mr: 1, mb: 1 }} />
                    <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                      S/. {parseFloat(pkg.base_price || 0).toFixed(2)}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" variant="outlined" disabled>
                      No disponible
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          }

          return offerings.map((offering) => {
            const price = offering.price_override || pkg.base_price || 0;
            const isSelected = selectedItems.some(item => item.key === `package-${offering.id}`);
            
            return (
              <Grid item xs={12} md={6} lg={4} key={offering.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{pkg.name}</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      {pkg.description || 'Sin descripción'}
                    </Typography>
                    <Chip
                      label={offering.cycle_name || 'Ciclo'}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                      S/. {parseFloat(price).toFixed(2)}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      variant={isSelected ? 'outlined' : 'contained'}
                      onClick={() =>
                        toggleSelection(
                          'package',
                          offering.id,
                          pkg.name,
                          price,
                          offering.cycle_name,
                          offering.cycle_start_date,
                          offering.cycle_end_date,
                        )
                      }
                    >
                      {isSelected ? 'Quitar' : 'Seleccionar'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          });
        })}
      </Grid>

      {/* Resumen y botón de matrícula */}
      {selectedItems.length > 0 && (
        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            bgcolor: 'background.paper',
            p: 2,
            boxShadow: 3,
            mt: 4,
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Total: S/. {total.toFixed(2)} ({selectedItems.length} item(s) seleccionado(s))
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => setOpenDialog(true)}
            >
              Matricularme
            </Button>
          </Box>
        </Box>
      )}

      {/* Dialog de confirmación */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar Matrícula</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            ¿Estás seguro de matricularte en los siguientes items?
          </Typography>
          <Box sx={{ mt: 2 }}>
            {selectedItems.map((item) => (
              <Typography key={item.key} variant="body2">
                - {item.name} ({item.type}): S/. {parseFloat(item.price).toFixed(2)}
              </Typography>
            ))}
          </Box>
          <Typography variant="h6" sx={{ mt: 2 }}>
            Total: S/. {total.toFixed(2)}
          </Typography>

          <Typography variant="subtitle1" sx={{ mt: 3 }}>
            Horarios
          </Typography>
          {loadingSchedules && (
            <Box sx={{ py: 1 }}>
              <CircularProgress size={20} /> Cargando horarios...
            </Box>
          )}
          {!loadingSchedules && selectedItems.map((item) => {
            const list = schedulesPreview[item.key] || [];
            return (
              <Box key={`sched-${item.key}`} sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {item.name}
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block">
                  {item.cycle_name || 'Ciclo no especificado'}
                  {(item.cycle_start_date || item.cycle_end_date) && (
                    <>
                      {' '}
                      ·{' '}
                      {item.cycle_start_date
                        ? new Date(item.cycle_start_date).toLocaleDateString()
                        : '-'}
                      {' '}
                      -{' '}
                      {item.cycle_end_date
                        ? new Date(item.cycle_end_date).toLocaleDateString()
                        : '-'}
                    </>
                  )}
                </Typography>
                {list.length === 0 ? (
                  <Typography variant="caption" color="textSecondary">Sin horarios registrados</Typography>
                ) : (
                  item.type === 'package' ? (
                    // Agrupar por course_offering para mostrar asignatura y docente
                    Object.values(
                      (list || []).reduce((acc, s) => {
                        if (!s) return acc;
                        const key = s.course_offering_id || 'unknown';
                        if (!acc[key]) acc[key] = { header: s, items: [] };
                        acc[key].items.push(s);
                        return acc;
                      }, {})
                    ).map((group, gidx) => (
                      <Box key={`g-${gidx}`} sx={{ mb: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600 }} display="block">
                          {group.header.course_name || 'Asignatura'}{group.header.teacher_first_name ? ` · Docente: ${group.header.teacher_first_name} ${group.header.teacher_last_name || ''}` : ''}
                        </Typography>
                        {group.items.filter(s => s.day_of_week).map((s, idx) => (
                          <Typography key={idx} variant="caption" display="block">
                            {s.day_of_week}: {s.start_time} - {s.end_time} {s.classroom ? `· Aula ${s.classroom}` : ''}
                          </Typography>
                        ))}
                      </Box>
                    ))
                  ) : (
                    // Curso individual: mostrar docente si existe
                    list.filter(s => s && s.day_of_week).map((s, idx) => (
                      <Typography key={idx} variant="caption" display="block">
                        {s.teacher_first_name ? `Docente: ${s.teacher_first_name} ${s.teacher_last_name || ''} · ` : ''}{s.day_of_week}: {s.start_time} - {s.end_time} {s.classroom ? `· Aula ${s.classroom}` : ''}
                      </Typography>
                    ))
                  )
                )}
              </Box>
            );
          })}

          <Typography variant="subtitle1" sx={{ mt: 3 }}>
            Método de pago
          </Typography>
          <Typography variant="body2">
            Deposita el monto total a la siguiente cuenta:
          </Typography>
          <Box sx={{ mt: 1, p: 1, border: '1px dashed', borderColor: 'divider' }}>
            <Typography variant="body2">Banco: BCP</Typography>
            <Typography variant="body2">Cuenta: 123-45678901-0-12</Typography>
            <Typography variant="body2">Titular: Academia UNI</Typography>
          </Box>
          <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
            Luego de depositar, ve a la sección "Mis Matrículas" para subir una foto clara de tu voucher.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={handleEnroll} variant="contained">
            Confirmar Matrícula
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentAvailableCourses;

