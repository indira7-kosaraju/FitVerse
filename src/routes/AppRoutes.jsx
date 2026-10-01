import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute, { GuestRoute } from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import AppLayout from '../components/layout/AppLayout';
import Spinner from '../components/common/Spinner';
import useAuth from '../hooks/useAuth';
import { ROLE_HOME } from '../utils/constants';

/* ---------- Public ---------- */
const Landing = lazy(() => import('../pages/public/Landing'));
const Login = lazy(() => import('../pages/public/Login'));
const Register = lazy(() => import('../pages/public/Register'));
const ForgotPassword = lazy(() => import('../pages/public/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/public/ResetPassword'));
const NotFound = lazy(() => import('../pages/public/NotFound'));
const Forbidden = lazy(() => import('../pages/public/Forbidden'));

/* ---------- Member ---------- */
const Dashboard = lazy(() => import('../pages/member/Dashboard'));
const Classes = lazy(() => import('../pages/member/Classes'));
const MyBookings = lazy(() => import('../pages/member/MyBookings'));
const Workouts = lazy(() => import('../pages/member/Workouts'));
const WorkoutPlan = lazy(() => import('../pages/member/WorkoutPlan'));
const Progress = lazy(() => import('../pages/member/Progress'));
const Trainers = lazy(() => import('../pages/member/Trainers'));
const TrainerDetail = lazy(() => import('../pages/member/TrainerDetail'));
const Membership = lazy(() => import('../pages/member/Membership'));
const Profile = lazy(() => import('../pages/member/Profile'));

/* ---------- Trainer ---------- */
const TrainerDashboard = lazy(() => import('../pages/trainer/TrainerDashboard'));
const Clients = lazy(() => import('../pages/trainer/Clients'));
const ClientDetail = lazy(() => import('../pages/trainer/ClientDetail'));
const MyClasses = lazy(() => import('../pages/trainer/MyClasses'));

/* ---------- Admin ---------- */
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const Members = lazy(() => import('../pages/admin/Members'));
const AdminTrainers = lazy(() => import('../pages/admin/Trainers'));
const ManageClasses = lazy(() => import('../pages/admin/ManageClasses'));
const Plans = lazy(() => import('../pages/admin/Plans'));
const Payments = lazy(() => import('../pages/admin/Payments'));
const Reports = lazy(() => import('../pages/admin/Reports'));
const Settings = lazy(() => import('../pages/admin/Settings'));

function RoleHomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={ROLE_HOME[user?.role] || '/'} replace />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<Spinner fullPage size="lg" label="Loading…" />}>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Route>

        <Route path="/403" element={<Forbidden />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<RoleHomeRedirect />} />

          <Route element={<RoleRoute roles={['member']} />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="classes" element={<Classes />} />
              <Route path="bookings" element={<MyBookings />} />
              <Route path="workouts" element={<Workouts />} />
              <Route path="plan" element={<WorkoutPlan />} />
              <Route path="progress" element={<Progress />} />
              <Route path="trainers" element={<Trainers />} />
              <Route path="trainers/:id" element={<TrainerDetail />} />
              <Route path="membership" element={<Membership />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>

          <Route element={<RoleRoute roles={['trainer']} />}>
            <Route path="/trainer" element={<AppLayout />}>
              <Route index element={<TrainerDashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/:id" element={<ClientDetail />} />
              <Route path="classes" element={<MyClasses />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>

          <Route element={<RoleRoute roles={['admin']} />}>
            <Route path="/admin" element={<AppLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="members" element={<Members />} />
              <Route path="trainers" element={<AdminTrainers />} />
              <Route path="classes" element={<ManageClasses />} />
              <Route path="plans" element={<Plans />} />
              <Route path="payments" element={<Payments />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
