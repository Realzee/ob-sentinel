import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as ResolveIcon,
  Cancel as RejectIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { isVehicleAlert, isCrimeReport, isAlertVehicle } from '@/lib/supabase';
import { AlertVehicle, CrimeReport } from '@/types';

interface ReportActionsModalProps {
  open: boolean;
  onClose: () => void;
  report: AlertVehicle | CrimeReport | null;
  onResolve?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  loading?: boolean;
}

const ReportActionsModal: React.FC<ReportActionsModalProps> = ({
  open,
  onClose,
  report,
  onResolve,
  onReject,
  onDelete,
  loading = false,
}) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!report) return null;

  const handleAction = async (action: 'resolve' | 'reject' | 'delete') => {
    if (!report) return;

    setActionLoading(action);
    setError(null);

    try {
      switch (action) {
        case 'resolve':
          if (onResolve) await onResolve(report.id);
          break;
        case 'reject':
          if (onReject) await onReject(report.id);
          break;
        case 'delete':
          if (onDelete) await onDelete(report.id);
          break;
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform action');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = () => handleAction('resolve');
  const handleReject = () => handleAction('reject');
  const handleDelete = () => handleAction('delete');

  const isVehicle = isVehicleAlert(report);
  const isCrime = isCrimeReport(report);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'pending':
        return 'warning';
      case 'RECOVERED':
      case 'resolved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {isVehicle ? 'Vehicle Alert' : 'Crime Report'} Actions
          </Typography>
          <Chip
            label={report.status}
            color={getStatusColor(report.status) as any}
            size="small"
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box mb={2}>
          <Typography variant="subtitle2" color="text.secondary">
            Report ID:
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {report.id}
          </Typography>
        </Box>

        {isVehicle && isAlertVehicle(report) && (
          <>
            <Box mb={2}>
              <Typography variant="subtitle2" color="text.secondary">
                License Plate:
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {report.number_plate}
              </Typography>
            </Box>
            <Box mb={2}>
              <Typography variant="subtitle2" color="text.secondary">
                Vehicle:
              </Typography>
              <Typography variant="body1">
                {report.color} {report.make} {report.model}
              </Typography>
            </Box>
            <Box mb={2}>
              <Typography variant="subtitle2" color="text.secondary">
                Reason:
              </Typography>
              <Typography variant="body1">{report.reason}</Typography>
            </Box>
          </>
        )}

        {isCrime && (
          <>
            <Box mb={2}>
              <Typography variant="subtitle2" color="text.secondary">
                Crime Type:
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {report.crime_type}
              </Typography>
            </Box>
            <Box mb={2}>
              <Typography variant="subtitle2" color="text.secondary">
                Description:
              </Typography>
              <Typography variant="body1">{report.description}</Typography>
            </Box>
            <Box mb={2}>
              <Typography variant="subtitle2" color="text.secondary">
                Location:
              </Typography>
              <Typography variant="body1">{report.location}</Typography>
            </Box>
          </>
        )}

        <Box mb={2}>
          <Typography variant="subtitle2" color="text.secondary">
            Created:
          </Typography>
          <Typography variant="body2">
            {new Date(report.created_at).toLocaleString()}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={onClose}
          startIcon={<CloseIcon />}
          disabled={loading || actionLoading !== null}
        >
          Cancel
        </Button>

        {onDelete && (
          <Button
            onClick={handleDelete}
            startIcon={
              actionLoading === 'delete' ? (
                <CircularProgress size={16} />
              ) : (
                <DeleteIcon />
              )
            }
            color="error"
            disabled={loading || actionLoading !== null}
          >
            {actionLoading === 'delete' ? 'Deleting...' : 'Delete'}
          </Button>
        )}

        {onReject && report.status !== 'rejected' && (
          <Button
            onClick={handleReject}
            startIcon={
              actionLoading === 'reject' ? (
                <CircularProgress size={16} />
              ) : (
                <RejectIcon />
              )
            }
            color="warning"
            disabled={loading || actionLoading !== null}
          >
            {actionLoading === 'reject' ? 'Rejecting...' : 'Reject'}
          </Button>
        )}

        {onResolve && report.status !== 'resolved' && (
          <Button
            onClick={handleResolve}
            startIcon={
              actionLoading === 'resolve' ? (
                <CircularProgress size={16} />
              ) : (
                <ResolveIcon />
              )
            }
            color="success"
            disabled={loading || actionLoading !== null}
          >
            {actionLoading === 'resolve' ? 'Resolving...' : 'Resolve'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ReportActionsModal;