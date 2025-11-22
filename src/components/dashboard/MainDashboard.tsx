import React, { useState, useEffect, useCallback } from 'react';
import { 
  Grid, Card, CardContent, Typography, Box, Chip, 
  Button, IconButton, Tooltip, Alert, CircularProgress,
  Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, FormControl, InputLabel, Select
} from '@mui/material';
import {
  Add as AddIcon,
  LocationOn as LocationIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  CarCrash as CarCrashIcon,
  LocalPolice as PoliceIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { AlertVehicle, CrimeReport, Profile } from '@/types';
import { isVehicleAlert, isCrimeReport } from '@/lib/supabase';
import ReportActionsModal from '../reports/ReportActionsModal';
import UserManagementModal from '../admin/UserManagementModal';

// Use the types from @/types instead of defining local ones
type AnyReport = AlertVehicle | CrimeReport;

interface DashboardStats {
  todayReports: number;
  activeReports: number;
  resolvedVehicles: number;
  resolvedCrimes: number;
  vehiclesWithLocation: number;
  crimesWithLocation: number;
}

const MainDashboard: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [reports, setReports] = useState<AnyReport[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    todayReports: 0,
    activeReports: 0,
    resolvedVehicles: 0,
    resolvedCrimes: 0,
    vehiclesWithLocation: 0,
    crimesWithLocation: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  
  // Modal states
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AnyReport | null>(null);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // This would typically call your API
      // For now, we'll set empty data
      setReports([]);
      setUsers([]);
      setStats({
        todayReports: 0,
        activeReports: 0,
        resolvedVehicles: 0,
        resolvedCrimes: 0,
        vehiclesWithLocation: 0,
        crimesWithLocation: 0
      });
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Report handlers
  const handleOpenActions = (report: AnyReport) => {
    setSelectedReport(report);
    setIsActionsModalOpen(true);
  };

  const handleCloseActions = () => {
    setIsActionsModalOpen(false);
    setSelectedReport(null);
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      // Implement delete logic here
      console.log('Deleting report:', reportId);
      setReports(prev => prev.filter(report => report.id !== reportId));
      handleCloseActions();
    } catch (err) {
      console.error('Error deleting report:', err);
      throw err;
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      // Implement resolve logic here
      console.log('Resolving report:', reportId);
      handleCloseActions();
    } catch (err) {
      console.error('Error resolving report:', err);
      throw err;
    }
  };

  const handleRejectReport = async (reportId: string) => {
    try {
      // Implement reject logic here
      console.log('Rejecting report:', reportId);
      handleCloseActions();
    } catch (err) {
      console.error('Error rejecting report:', err);
      throw err;
    }
  };

  // User management handlers
  const handleUpdateUser = async (userId: string, updates: Partial<Profile>) => {
    try {
      // Implement user update logic here
      console.log('Updating user:', userId, updates);
    } catch (err) {
      console.error('Error updating user:', err);
      throw err;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Implement user delete logic here
      console.log('Deleting user:', userId);
    } catch (err) {
      console.error('Error deleting user:', err);
      throw err;
    }
  };

  // Helper functions
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Helper to get display values for vehicle alerts
  const getVehicleDisplayInfo = (report: AlertVehicle) => {
    return {
      licensePlate: report.license_plate || report.number_plate || 'Unknown',
      make: report.vehicle_make || report.make || 'Unknown',
      model: report.vehicle_model || report.model || 'Unknown',
      color: report.vehicle_color || report.color || 'Unknown',
      location: report.last_seen_location || 'Unknown location'
    };
  };

  // Helper to get display values for crime reports
  const getCrimeDisplayInfo = (report: CrimeReport) => {
    return {
      title: report.title || 'Untitled Report',
      crimeType: report.crime_type || report.report_type || 'Unknown',
      description: report.description || 'No description',
      location: report.location || 'Unknown location'
    };
  };

  // Safe description formatter
  const formatDescription = (description: string | undefined) => {
    if (!description) return 'No description provided';
    return description.length > 150 
      ? `${description.substring(0, 150)}...`
      : description;
  };

  // Filter reports based on active tab
  const filteredReports = reports.filter(report => {
    if (activeTab === 0) return true; // All
    if (activeTab === 1) return isVehicleAlert(report); // Vehicle alerts
    if (activeTab === 2) return isCrimeReport(report); // Crime reports
    return true;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          OB Sentinel Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor and manage vehicle alerts and crime reports
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Today's Reports
                  </Typography>
                  <Typography variant="h4">{stats.todayReports}</Typography>
                </Box>
                <WarningIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Active Reports
                  </Typography>
                  <Typography variant="h4">{stats.activeReports}</Typography>
                </Box>
                <PoliceIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Resolved Vehicles
                  </Typography>
                  <Typography variant="h4">{stats.resolvedVehicles}</Typography>
                </Box>
                <CarCrashIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Resolved Crimes
                  </Typography>
                  <Typography variant="h4">{stats.resolvedCrimes}</Typography>
                </Box>
                <PersonIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {/* Add new report logic */}}
        >
          New Report
        </Button>
        <Button
          variant="outlined"
          startIcon={<PersonIcon />}
          onClick={() => setIsUserManagementOpen(true)}
        >
          Manage Users
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchDashboardData}
        >
          Refresh
        </Button>
      </Box>

      {/* Reports Section */}
      <Card>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
              <Tab label="All Reports" />
              <Tab label="Vehicle Alerts" />
              <Tab label="Crime Reports" />
            </Tabs>
          </Box>

          {filteredReports.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary">
                No reports found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {activeTab === 0 ? "There are no reports in the system." :
                 activeTab === 1 ? "No vehicle alerts found." : "No crime reports found."}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {filteredReports.map((report) => {
                const isVehicle = isVehicleAlert(report);
                const vehicleInfo = isVehicle ? getVehicleDisplayInfo(report) : null;
                const crimeInfo = !isVehicle ? getCrimeDisplayInfo(report as CrimeReport) : null;

                return (
                  <Grid item xs={12} md={6} key={report.id}>
                    <Card variant="outlined">
                      <CardContent>
                        {/* Report Header */}
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                          <Box>
                            {isVehicle ? (
                              <Typography variant="h6" gutterBottom>
                                Vehicle Alert: {vehicleInfo?.licensePlate}
                              </Typography>
                            ) : (
                              <Typography variant="h6" gutterBottom>
                                Crime Report: {crimeInfo?.title}
                              </Typography>
                            )}
                            
                            <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                              <Chip
                                label={report.status}
                                color={getStatusColor(report.status) as any}
                                size="small"
                              />
                              <Chip
                                label={report.severity}
                                color={getSeverityColor(report.severity) as any}
                                size="small"
                              />
                            </Box>
                          </Box>
                          
                          <IconButton
                            size="small"
                            onClick={() => handleOpenActions(report)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Box>

                        {/* Report Details */}
                        {isVehicle ? (
                          <>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {vehicleInfo?.make} {vehicleInfo?.model} • {vehicleInfo?.color}
                            </Typography>
                            <Typography variant="body2" paragraph>
                              {report.reason}
                            </Typography>
                            {vehicleInfo?.location && vehicleInfo.location !== 'Unknown location' && (
                              <Typography variant="body2" color="text.secondary">
                                <LocationIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                                Last seen: {vehicleInfo.location}
                              </Typography>
                            )}
                          </>
                        ) : (
                          <>
                            <Typography variant="body2" paragraph>
                              {formatDescription(crimeInfo?.description)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <LocationIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                              {crimeInfo?.location || 'Unknown location'}
                            </Typography>
                          </>
                        )}

                        {/* Report Footer */}
                        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                          <Typography variant="caption" color="text.secondary">
                            Created: {formatDateTime(report.created_at)}
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => handleOpenActions(report)}
                          >
                            View Details
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <ReportActionsModal
        open={isActionsModalOpen}
        onClose={handleCloseActions}
        report={selectedReport}
        onResolve={handleResolveReport}
        onReject={handleRejectReport}
        onDelete={handleDeleteReport}
        loading={loading}
      />

      <UserManagementModal
        open={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        users={users}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
        loading={loading}
      />
    </Box>
  );
};

export default MainDashboard;