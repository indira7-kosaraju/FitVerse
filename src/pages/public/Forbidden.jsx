import StatusScreen from '../../components/landing/StatusScreen';

export default function Forbidden() {
  return (
    <StatusScreen
      code="403"
      tone="accent"
      docTitle="Access denied"
      title="Members-only zone."
      message="Your pass doesn't open this door. If you think you should have access, ask a FitVerse admin to check your role."
    />
  );
}
