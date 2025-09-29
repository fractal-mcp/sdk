import { useFractal } from '@fractal-mcp/server-ui-react';
import './index.css';

export default function Goodbye() {
  const { data, link } = useFractal();
  const name = (data && (data.name as string)) || 'Friend';

  const onGoodbyeClick = async () => {
    await link('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1');
    console.log('link clicked');
  };

  return (
    <div className="bg-white rounded-lg p-6 w-64 shadow-lg border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Goodbye</h2>
      <p className="text-gray-600">
        Goodbye, <span className="font-semibold text-pink-600">{name}</span>!
      </p>
      <button
        onClick={onGoodbyeClick}
        className="bg-pink-500 hover:bg-pink-600 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
      >
        give up?
      </button>
    </div>
  );
}


