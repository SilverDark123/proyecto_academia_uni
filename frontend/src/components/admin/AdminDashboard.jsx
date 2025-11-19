// src/components/admin/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import {
  People as PeopleIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { adminAPI } from '../../services/api';

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCycleId, setSelectedCycleId] = useState('all');
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedCourse, setSelectedCourse] = useState('all');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getDashboard();
      setDashboard(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Error al cargar el dashboard');
      console.error('Error:', err);
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

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  // Derivar lista de ciclos y aplicar filtro por ciclo
  const cycleOptions = Array.from(
    new Map(
      dashboard.map((row) => [row.cycle_id, { id: row.cycle_id, name: row.cycle_name }])
    ).values()
  ).filter(c => c.id != null);

  const filteredDashboard =
    selectedCycleId === 'all'
      ? dashboard
      : dashboard.filter((row) => row.cycle_id === selectedCycleId);

  // Opciones de curso+grupo para pestaña de asistencia (solo cursos)
  const courseOptions = Array.from(
    new Map(
      filteredDashboard
        .filter((row) => row.enrollment_type === 'course')
        .map((row) => {
          const label = row.grupo
            ? `${row.enrolled_item} - Grupo ${row.grupo}`
            : row.enrolled_item;
          return [label, { name: label }];
        })
    ).values()
  );

  // Calcular estadísticas
  // Reglas para montos:
  // - Si un alumno tiene un paquete en un ciclo (enrollment_type === 'package'),
  //   solo se cuenta el monto del paquete para ese alumno+ciclo.
  // - Si no tiene paquete en ese ciclo, se suman todos los cursos individuales.

  const packageByStudentCycle = new Set(
    filteredDashboard
      .filter(row => row.enrollment_type === 'package')
      .map(row => `${row.student_id}-${row.cycle_id}`)
  );

  const totalsFromEnrollments = filteredDashboard.reduce(
    (acc, row) => {
      const key = `${row.student_id}-${row.cycle_id}`;
      const paid = parseFloat(row.total_paid || 0) || 0;
      const pending = parseFloat(row.total_pending || 0) || 0;

      if (row.enrollment_type === 'package') {
        // Contar siempre los paquetes (una fila por matrícula de paquete)
        acc.totalPaid += paid;
        acc.totalPending += pending;
        return acc;
      }

      // Matrícula de curso
      if (packageByStudentCycle.has(key)) {
        // Si ya hay paquete en ese alumno+ciclo, los cursos asociados
        // se consideran incluidos en el paquete y no se suman aparte.
        return acc;
      }

      // Cursos individuales (sin paquete en ese ciclo)
      acc.totalPaid += paid;
      acc.totalPending += pending;
      return acc;
    },
    { totalPaid: 0, totalPending: 0 }
  );

  const today = new Date();

  const stats = {
    totalStudents: new Set(filteredDashboard.map(d => d.student_id)).size,
    totalEnrollments: filteredDashboard.length,
    pendingEnrollments: filteredDashboard.filter(d => d.enrollment_status === 'pendiente').length,
    acceptedEnrollments: filteredDashboard.filter(d => d.enrollment_status === 'aceptado').length,
    totalPending: totalsFromEnrollments.totalPending,
    totalPaid: totalsFromEnrollments.totalPaid,
    // Solo contar baja asistencia en ciclos ya iniciados
    lowAttendance: filteredDashboard.filter(d => {
      if (!d.start_date) return false;
      const start = new Date(d.start_date);
      if (start > today) return false;
      return parseFloat(d.attendance_pct || 0) < 75;
    }).length,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'aceptado':
        return 'success';
      case 'pendiente':
        return 'warning';
      case 'rechazado':
        return 'error';
      default:
        return 'default';
    }
  };

  const getAlertColor = (alert) => {
    if (alert?.includes('Deuda')) return 'error';
    if (alert?.includes('Faltas')) return 'warning';
    if (alert?.includes('Baja asistencia')) return 'warning';
    return 'success';
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard Administrativo
      </Typography>

      {/* Filtro por ciclo */}
      <Box mb={3}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="cycle-filter-label">Ciclo</InputLabel>
          <Select
            labelId="cycle-filter-label"
            value={selectedCycleId}
            label="Ciclo"
            onChange={(e) => setSelectedCycleId(e.target.value)}
          >
            <MenuItem value="all">Todos los ciclos</MenuItem>
            {cycleOptions.map((cycle) => (
              <MenuItem key={cycle.id} value={cycle.id}>
                {cycle.name || `Ciclo ${cycle.id}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Estadísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PeopleIcon color="primary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Estudiantes
                  </Typography>
                  <Typography variant="h4">{stats.totalStudents}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AssignmentIcon color="warning" sx={{ mr: 2, fontSize: 40 }} />
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
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PaymentIcon color="success" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Pagado
                  </Typography>
                  <Typography variant="h4">S/. {stats.totalPaid.toFixed(2)}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PaymentIcon color="error" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Pendiente
                  </Typography>
                  <Typography variant="h4">S/. {stats.totalPending.toFixed(2)}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pestañas para separar vistas */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Resumen" value="summary" />
          <Tab label="Pagos" value="payments" />
          <Tab label="Asistencia" value="attendance" />
        </Tabs>
      </Box>

      {/* Contenido de pestañas */}
      {activeTab === 'summary' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Estudiante</TableCell>
                <TableCell>DNI</TableCell>
                <TableCell>Ciclo</TableCell>
                <TableCell>Curso/Paquete</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Asistencia</TableCell>
                <TableCell>Pagado</TableCell>
                <TableCell>Pendiente</TableCell>
                <TableCell>Alerta</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDashboard
                .filter((row) => {
                  const key = `${row.student_id}-${row.cycle_id}`;

                  if (row.enrollment_type === 'package') {
                    // Siempre mostrar la matrícula de paquete
                    return true;
                  }

                  // Si existe paquete para ese alumno+ciclo, ocultar los cursos asociados
                  if (packageByStudentCycle.has(key)) {
                    return false;
                  }

                  // Cursos individuales sin paquete
                  return true;
                })
                .map((row) => (
                  <TableRow key={`${row.student_id}-${row.enrollment_id}`}>
                    <TableCell>{row.student_name}</TableCell>
                    <TableCell>{row.dni}</TableCell>
                    <TableCell>{row.cycle_name}</TableCell>
                    <TableCell>{row.enrolled_item}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.enrollment_status}
                        color={getStatusColor(row.enrollment_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {(() => {
                        if (!row.start_date) return '-';
                        const start = new Date(row.start_date);
                        if (start > today) return '-';
                        return `${parseFloat(row.attendance_pct || 0).toFixed(1)}%`;
                      })()}
                    </TableCell>
                    <TableCell>
                      S/. {parseFloat(row.total_paid || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      S/. {parseFloat(row.total_pending || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const label = row.alert_status || 'En regla';

                        if (!row.start_date) {
                          return (
                            <Chip
                              label={label}
                              color={getAlertColor(label)}
                              size="small"
                            />
                          );
                        }

                        const start = new Date(row.start_date);

                        if (start > today) {
                          // Ciclo futuro: mantener alertas de pago/deuda, ocultar las de asistencia
                          const isPaymentAlert =
                            label?.toLowerCase().includes('deuda') ||
                            label?.toLowerCase().includes('pago');

                          if (!isPaymentAlert) return '-';

                          return (
                            <Chip
                              label={label}
                              color={getAlertColor(label)}
                              size="small"
                            />
                          );
                        }

                        // Ciclo ya iniciado: mostrar cualquier alerta normalmente
                        return (
                          <Chip
                            label={label}
                            color={getAlertColor(label)}
                            size="small"
                          />
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          {filteredDashboard.length === 0 && (
            <Box p={3} textAlign="center">
              <Typography color="textSecondary">No hay datos para mostrar</Typography>
            </Box>
          )}
        </TableContainer>
      )}

      {activeTab === 'payments' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Estudiante</TableCell>
                <TableCell>Ciclo</TableCell>
                <TableCell>Curso/Paquete</TableCell>
                <TableCell>Pagado</TableCell>
                <TableCell>Pendiente</TableCell>
                <TableCell>Cuotas pagadas</TableCell>
                <TableCell>Cuotas pendientes</TableCell>
                <TableCell>Fecha de Vencimiento</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDashboard
                .filter((row) => {
                  const key = `${row.student_id}-${row.cycle_id}`;

                  if (row.enrollment_type === 'package') return true;
                  if (packageByStudentCycle.has(key)) return false;
                  return true;
                })
                .map((row) => (
                  <TableRow key={`${row.student_id}-${row.enrollment_id}`}>
                    <TableCell>{row.student_name}</TableCell>
                    <TableCell>{row.cycle_name}</TableCell>
                    <TableCell>{row.enrolled_item}</TableCell>
                    <TableCell>S/. {parseFloat(row.total_paid || 0).toFixed(2)}</TableCell>
                    <TableCell>S/. {parseFloat(row.total_pending || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {(() => {
                        const pending = parseFloat(row.total_pending || 0) || 0;
                        // Mientras no exista pago en partes, considerar solo 0 o 1 cuota pagada
                        return pending > 0 ? 0 : 1;
                      })()}
                    </TableCell>
                    <TableCell>{row.pending_installments}</TableCell>
                    <TableCell>
                      {row.next_due_date
                        ? new Date(row.next_due_date).toLocaleDateString()
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          {filteredDashboard.length === 0 && (
            <Box p={3} textAlign="center">
              <Typography color="textSecondary">No hay datos para mostrar</Typography>
            </Box>
          )}
        </TableContainer>
      )}

      {activeTab === 'attendance' && (
        <>
          {/* Filtro por curso solo en pestaña de asistencia */}
          <Box mb={2}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="course-filter-label">Curso</InputLabel>
              <Select
                labelId="course-filter-label"
                value={selectedCourse}
                label="Curso"
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <MenuItem value="all">Todos los cursos</MenuItem>
                {courseOptions.map((course) => (
                  <MenuItem key={course.name} value={course.name}>
                    {course.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Estudiante</TableCell>
                  <TableCell>Ciclo</TableCell>
                  <TableCell>Curso</TableCell>
                  <TableCell>Asistencia</TableCell>
                  <TableCell>Alerta</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDashboard
                  .filter((row) => row.enrollment_type === 'course')
                  .filter((row) => {
                    if (selectedCourse === 'all') return true;
                    const label = row.grupo
                      ? `${row.enrolled_item} - Grupo ${row.grupo}`
                      : row.enrolled_item;
                    return label === selectedCourse;
                  })
                  .map((row) => (
                    <TableRow key={`${row.student_id}-${row.enrollment_id}`}>
                      <TableCell>{row.student_name}</TableCell>
                      <TableCell>{row.cycle_name}</TableCell>
                      <TableCell>
                        {row.grupo
                          ? `${row.enrolled_item} - Grupo ${row.grupo}`
                          : row.enrolled_item}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          if (!row.start_date) return '-';
                          const start = new Date(row.start_date);
                          if (start > today) return '-';
                          return `${parseFloat(row.attendance_pct || 0).toFixed(1)}%`;
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const label = row.alert_status || 'En regla';

                          if (!row.start_date) {
                            return (
                              <Chip
                                label={label}
                                color={getAlertColor(label)}
                                size="small"
                              />
                            );
                          }

                          const start = new Date(row.start_date);

                          if (start > today) {
                            // Ciclo futuro: mantener alertas de pago/deuda, ocultar las de asistencia
                            const isPaymentAlert =
                              label?.toLowerCase().includes('deuda') ||
                              label?.toLowerCase().includes('pago');

                            if (!isPaymentAlert) return '-';

                            return (
                              <Chip
                                label={label}
                                color={getAlertColor(label)}
                                size="small"
                              />
                            );
                          }

                          // Ciclo ya iniciado: mostrar cualquier alerta normalmente
                          return (
                            <Chip
                              label={label}
                              color={getAlertColor(label)}
                              size="small"
                            />
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            {filteredDashboard.length === 0 && (
              <Box p={3} textAlign="center">
                <Typography color="textSecondary">No hay datos para mostrar</Typography>
              </Box>
            )}
          </TableContainer>
        </>
      )}
    </Box>
  );
}
export default AdminDashboard;
