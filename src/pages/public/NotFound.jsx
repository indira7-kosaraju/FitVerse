import StatusScreen from '../../components/landing/StatusScreen';

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      docTitle="Page not found"
      title="This page skipped leg day."
      message="We searched every rack, bench and locker room — the page you're after isn't here. It may have moved, or the link might be off by a rep."
    />
  );
}
