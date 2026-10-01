import { Link } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import RegisterForm from '../../components/forms/RegisterForm';

export default function Register() {
  return (
    <AuthLayout
      eyebrow="Join the crew"
      title="Create your account"
      subtitle="Two minutes to set up. A lifetime of stronger days."
      docTitle="Join FitVerse"
      footer={
        <p>
          Already a member? <Link to="/login">Log in</Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
