import { Link } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import LoginForm from '../../components/forms/LoginForm';

export default function Login() {
  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Log in to FitVerse"
      subtitle="Pick up right where you left off — your classes, plans and progress are waiting."
      docTitle="Log in"
      footer={
        <p>
          New here? <Link to="/register">Create a free account</Link>
        </p>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}
