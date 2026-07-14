import ErrorBoundary from '../../components/ErrorBoundary';
import SmartMapScreen from './components/SmartMapScreen';

export default function SmartMapPage() {
  return (
    <ErrorBoundary>
      <SmartMapScreen />
    </ErrorBoundary>
  );
}
