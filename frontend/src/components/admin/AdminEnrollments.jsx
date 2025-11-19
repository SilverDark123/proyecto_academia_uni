// src/components/admin/AdminEnrollments.jsx
import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button } from '@mui/material';

const AdminEnrollments = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [error, setError] = useState('');

  const fetchEnrollments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/enrollments/admin', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setEnrollments(data);
      else setError(data.message || 'Error cargando matrículas');
    } catch (err) {
      console.error(err);
      setError('Error cargando matrículas');
    }
  };

  useEffect(() => { fetchEnrollments(); }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Matrículas</Typography>
      {error && <Typography color="error">{error}</Typography>}
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Estudiante</TableCell>
              <TableCell>DNI</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Estado Matrícula</TableCell>
              <TableCell>Pago</TableCell>
              <TableCell>Voucher</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {enrollments.filter(e => e.status !== 'cancelado').map(e => (
              <TableRow key={e.id}>
                <TableCell>{e.id}</TableCell>
                <TableCell>{e.first_name} {e.last_name}</TableCell>
                <TableCell>{e.dni}</TableCell>
                <TableCell>{e.item_name}</TableCell>
                <TableCell>{e.type}</TableCell>
                <TableCell>{e.status}</TableCell>
                <TableCell>{e.payment_status || 'sin pago'}</TableCell>
                <TableCell>{e.voucher_url ? <a href={`http://localhost:4000${e.voucher_url}`} target="_blank" rel="noreferrer">Ver</a> : '—'}</TableCell>
                <TableCell>
                  {e.payment_status === 'pendiente' && (
                    <Button variant="contained" size="small" onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        const res = await fetch('http://localhost:4000/api/payments/approve', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ enrollment_id: e.id })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.message || 'Error al aprobar');
                        alert('Pago aprobado');
                        fetchEnrollments();
                      } catch (err) {
                        console.error(err);
                        setError(err.message || 'Error al aprobar pago');
                      }
                    }}>Aprobar</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default AdminEnrollments;
