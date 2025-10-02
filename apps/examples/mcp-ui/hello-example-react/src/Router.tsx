import Hello from './Hello';
import Goodbye from './Goodbye';

function getPath(): string {
  try {
    return typeof window !== 'undefined' ? window.location.pathname : '/hello';
  } catch {
    return '/hello';
  }
}

export default function Router() {
  const path = getPath();

  if (path === '/goodbye') {
    return <Goodbye />;
  }
  console.log('path', path);
  return <Hello />;
}


